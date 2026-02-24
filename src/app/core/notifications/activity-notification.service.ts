import { Injectable, computed, inject, signal } from '@angular/core';
import { ActivityApiClient } from '../api/clients/activity-api.client';
import { ActivityLogDto } from '../api/models/activity.model';
import { ActivityType } from '../api/models/activity-type.enum';
import { ActivityHubRealtimeService } from '../realtime/activity-hub-realtime.service';
import { AuthService } from '../auth/services/auth.service';
import { TaskStatus } from '../api/models/task-status.enum';
import { Subscription } from 'rxjs';

const LAST_READ_STORAGE_KEY_PREFIX = 'task_management.notifications.last_read_at';
const NOTIFICATION_LIMIT = 50;

export interface ActivityNotificationItem {
  id: string;
  activityId: string;
  projectId: string | null;
  taskItemId: string | null;
  title: string;
  message: string;
  occurredAt: string;
  unread: boolean;
}

@Injectable({ providedIn: 'root' })
export class ActivityNotificationService {
  private readonly activityApiClient = inject(ActivityApiClient);
  private readonly activityHubRealtimeService = inject(ActivityHubRealtimeService);
  private readonly authService = inject(AuthService);

  private readonly itemsSignal = signal<ActivityNotificationItem[]>([]);
  private initialized = false;
  private realtimeSubscription: Subscription | null = null;

  readonly items = this.itemsSignal.asReadonly();
  readonly unreadCount = computed(() => this.itemsSignal().filter((item) => item.unread).length);

  initialize(): void {
    if (this.initialized || !this.authService.isAuthenticated()) {
      return;
    }

    this.initialized = true;
    const lastReadAtMs = this.readLastReadAtMs();

    this.activityApiClient
      .getFeed({ page: 1, pageSize: 20 })
      .subscribe({
        next: (events) => {
          const items = events.map((event) => this.mapEventToNotification(event, lastReadAtMs));
          this.itemsSignal.set(items);
        },
        error: () => {
          this.itemsSignal.set([]);
        }
      });

    this.realtimeSubscription = this.activityHubRealtimeService.activityCreated$().subscribe((event) => {
      const nextItem = this.mapEventToNotification(event, Number.MAX_SAFE_INTEGER, true);
      const deduplicated = this.itemsSignal().filter((item) => item.activityId !== event.id);
      this.itemsSignal.set([nextItem, ...deduplicated].slice(0, NOTIFICATION_LIMIT));
    });

    void this.activityHubRealtimeService.connect();
  }

  teardown(): void {
    this.initialized = false;
    this.realtimeSubscription?.unsubscribe();
    this.realtimeSubscription = null;
    this.itemsSignal.set([]);
    void this.activityHubRealtimeService.disconnect();
  }

  markAllAsRead(): void {
    this.writeLastReadAt(new Date().toISOString());
    this.itemsSignal.update((items) => items.map((item) => ({ ...item, unread: false })));
  }

  markAsRead(activityId: string): void {
    this.itemsSignal.update((items) =>
      items.map((item) => (item.activityId === activityId ? { ...item, unread: false } : item))
    );
    this.writeLastReadAt(new Date().toISOString());
  }

  relativeTime(value: string): string {
    const now = Date.now();
    const date = new Date(value);
    const diffSeconds = Math.max(1, Math.floor((now - date.getTime()) / 1000));

    if (diffSeconds < 60) {
      return `${diffSeconds}s ago`;
    }

    const diffMinutes = Math.floor(diffSeconds / 60);
    if (diffMinutes < 60) {
      return `${diffMinutes}m ago`;
    }

    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) {
      return `${diffHours}h ago`;
    }

    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  }

  private mapEventToNotification(
    event: ActivityLogDto,
    lastReadAtMs: number,
    forceUnread = false
  ): ActivityNotificationItem {
    const occurredAtMs = new Date(event.occurredAt).getTime();
    const unread = forceUnread || occurredAtMs > lastReadAtMs;

    return {
      id: `notification-${event.id}`,
      activityId: event.id,
      projectId: event.projectId ?? null,
      taskItemId: event.taskItemId ?? null,
      title: this.mapEventTitle(event.type),
      message: this.mapEventMessage(event),
      occurredAt: event.occurredAt,
      unread
    };
  }

  private mapEventTitle(type: ActivityType): string {
    switch (type) {
      case ActivityType.ProjectCreated:
      case ActivityType.ProjectDeleted:
      case ActivityType.ProjectRenamed:
        return 'Project update';
      case ActivityType.TaskCreated:
      case ActivityType.TaskDeleted:
      case ActivityType.TaskRenamed:
      case ActivityType.TaskStatusChanged:
      case ActivityType.TaskAssigneeChanged:
      case ActivityType.TaskDueDateChanged:
        return 'Task update';
      default:
        return 'Activity update';
    }
  }

  private mapEventMessage(event: ActivityLogDto): string {
    const actor = event.actorDisplayName || 'Someone';

    switch (event.type) {
      case ActivityType.ProjectCreated:
        return `${actor} created project "${event.projectName ?? ''}".`;
      case ActivityType.ProjectRenamed:
        return `${actor} renamed project to "${event.newValue ?? event.projectName ?? ''}".`;
      case ActivityType.ProjectDeleted:
        return `${actor} deleted project "${event.projectName ?? ''}".`;
      case ActivityType.TaskCreated:
        return `${actor} created task "${event.taskTitle ?? ''}".`;
      case ActivityType.TaskRenamed:
        return `${actor} renamed task to "${event.newValue ?? event.taskTitle ?? ''}".`;
      case ActivityType.TaskDeleted:
        return `${actor} deleted task "${event.taskTitle ?? ''}".`;
      case ActivityType.TaskAssigneeChanged:
        return `${actor} reassigned task to ${event.newValue ?? 'Unassigned'}.`;
      case ActivityType.TaskDueDateChanged:
        return `${actor} updated due date to ${event.newValue ?? 'None'}.`;
      case ActivityType.TaskStatusChanged:
        return `${actor} changed status to ${this.taskStatusLabel(event.newStatus)}.`;
      default:
        return `${actor} performed an update.`;
    }
  }

  private taskStatusLabel(status: TaskStatus | null | undefined): string {
    switch (status) {
      case TaskStatus.Todo:
        return 'To Do';
      case TaskStatus.InProgress:
        return 'In Progress';
      case TaskStatus.Done:
        return 'Done';
      default:
        return 'Unknown';
    }
  }

  private readLastReadAtMs(): number {
    const value = localStorage.getItem(this.getLastReadStorageKey());
    if (!value) {
      return 0;
    }

    const parsed = new Date(value).getTime();
    return Number.isNaN(parsed) ? 0 : parsed;
  }

  private writeLastReadAt(value: string): void {
    localStorage.setItem(this.getLastReadStorageKey(), value);
  }

  private getLastReadStorageKey(): string {
    const userId = this.authService.currentUserId();
    if (!userId || userId.trim().length === 0) {
      return `${LAST_READ_STORAGE_KEY_PREFIX}.anonymous`;
    }

    return `${LAST_READ_STORAGE_KEY_PREFIX}.${userId}`;
  }
}
