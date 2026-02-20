import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { ActivityApiClient } from '../../../../core/api/clients/activity-api.client';
import { ActivityLogDto } from '../../../../core/api/models/activity.model';
import { ActivityType } from '../../../../core/api/models/activity-type.enum';
import { AuthService } from '../../../../core/auth/services/auth.service';
import { APP_ENVIRONMENT } from '../../../../core/config/app-environment.token';
import { ActivityHubRealtimeService } from '../../../../core/realtime/activity-hub-realtime.service';
import { SharedModule } from '../../../../shared/shared.module';
import {
  RecentActivityViewModel,
  mapActivityToRecentActivity
} from '../../../dashboard/presenters/dashboard-activity.presenter';

interface ActivityTypeOption {
  label: string;
  value: ActivityType | null;
}

@Component({
  selector: 'app-my-activity',
  standalone: true,
  imports: [SharedModule],
  templateUrl: './my-activity.component.html',
  styleUrl: './my-activity.component.scss'
})
export class MyActivityComponent implements OnInit, OnDestroy {
  private readonly activityApiClient = inject(ActivityApiClient);
  private readonly activityHubRealtimeService = inject(ActivityHubRealtimeService);
  private readonly authService = inject(AuthService);
  private readonly appEnvironment = inject(APP_ENVIRONMENT);
  private readonly router = inject(Router);
  private readonly destroy$ = new Subject<void>();

  readonly typeOptions: ActivityTypeOption[] = [
    { label: 'All Events', value: null },
    { label: 'Project Created', value: ActivityType.ProjectCreated },
    { label: 'Project Renamed', value: ActivityType.ProjectRenamed },
    { label: 'Project Deleted', value: ActivityType.ProjectDeleted },
    { label: 'Task Created', value: ActivityType.TaskCreated },
    { label: 'Task Status Changed', value: ActivityType.TaskStatusChanged },
    { label: 'Task Renamed', value: ActivityType.TaskRenamed },
    { label: 'Task Deleted', value: ActivityType.TaskDeleted },
    { label: 'Task Assignee Changed', value: ActivityType.TaskAssigneeChanged },
    { label: 'Task Due Date Changed', value: ActivityType.TaskDueDateChanged }
  ];

  readonly activityLimit = 250;

  allActivities: ActivityLogDto[] = [];
  recentActivities: RecentActivityViewModel[] = [];
  selectedType: ActivityType | null = null;
  search = '';

  isLoading = true;
  isPreviewMode = false;
  isLiveConnected = false;
  errorMessage: string | null = null;
  previewDetail: string | null = null;

  ngOnInit(): void {
    this.loadActivity();
    this.subscribeToLiveActivity();
  }

  ngOnDestroy(): void {
    void this.activityHubRealtimeService.disconnect();
    this.destroy$.next();
    this.destroy$.complete();
  }

  get filteredActivities(): RecentActivityViewModel[] {
    const selectedType = this.selectedType;
    const search = this.search.trim().toLowerCase();

    return this.recentActivities.filter((activity) => {
      const matchesType = selectedType === null || activity.rawEvent.type === selectedType;
      if (!matchesType) {
        return false;
      }

      if (search.length === 0) {
        return true;
      }

      const haystack = `${activity.rawEvent.projectName ?? ''} ${activity.rawEvent.taskTitle ?? ''} ${activity.rawEvent.actorDisplayName ?? ''} ${this.stripHtml(activity.summary)}`
        .toLowerCase();
      return haystack.includes(search);
    });
  }

  get totalEvents(): number {
    return this.recentActivities.length;
  }

  get todayEvents(): number {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const threshold = today.getTime();
    return this.recentActivities.filter((activity) => new Date(activity.rawEvent.occurredAt).getTime() >= threshold).length;
  }

  get taskEvents(): number {
    return this.recentActivities.filter((activity) =>
      activity.rawEvent.type === ActivityType.TaskCreated ||
      activity.rawEvent.type === ActivityType.TaskStatusChanged ||
      activity.rawEvent.type === ActivityType.TaskRenamed ||
      activity.rawEvent.type === ActivityType.TaskDeleted ||
      activity.rawEvent.type === ActivityType.TaskAssigneeChanged ||
      activity.rawEvent.type === ActivityType.TaskDueDateChanged
    ).length;
  }

  get projectEvents(): number {
    return this.recentActivities.filter((activity) =>
      activity.rawEvent.type === ActivityType.ProjectCreated ||
      activity.rawEvent.type === ActivityType.ProjectRenamed ||
      activity.rawEvent.type === ActivityType.ProjectDeleted
    ).length;
  }

  refresh(): void {
    this.loadActivity();
  }

  clearFilters(): void {
    this.selectedType = null;
    this.search = '';
  }

  openRelatedProject(activity: RecentActivityViewModel): void {
    const projectId = activity.rawEvent.projectId;
    if (!projectId) {
      return;
    }

    void this.router.navigate(['/projects/kanban'], {
      queryParams: { projectId }
    });
  }

  getTypeLabel(type: ActivityType): string {
    return this.typeOptions.find((option) => option.value === type)?.label ?? 'Activity';
  }

  private loadActivity(): void {
    this.isLoading = true;
    this.errorMessage = null;
    this.previewDetail = null;
    this.isPreviewMode = false;

    if (this.shouldUsePreviewMode()) {
      this.loadPreviewActivity('Preview mode active. Showing local personal activity.');
      return;
    }

    this.activityApiClient
      .getFeed({
        page: 1,
        pageSize: this.activityLimit,
        mineOnly: true
      })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (events) => {
          this.allActivities = events.sort(
            (a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime()
          );
          this.recentActivities = this.allActivities.map((event) => mapActivityToRecentActivity(event));
          this.isLoading = false;
        },
        error: () => {
          if (this.shouldUsePreviewMode()) {
            this.loadPreviewActivity('Backend unavailable. Showing preview personal activity.');
            return;
          }

          this.errorMessage = 'Could not load your activity feed.';
          this.allActivities = [];
          this.recentActivities = [];
          this.isLoading = false;
        }
      });
  }

  private subscribeToLiveActivity(): void {
    this.activityHubRealtimeService
      .activityCreated$()
      .pipe(takeUntil(this.destroy$))
      .subscribe((event) => {
        if (!this.isCurrentUserEvent(event)) {
          return;
        }

        this.allActivities = [event, ...this.allActivities].slice(0, this.activityLimit);
        this.recentActivities = this.allActivities.map((activity) => mapActivityToRecentActivity(activity));
      });

    void this.activityHubRealtimeService
      .connect()
      .then(() => {
        this.isLiveConnected = true;
      })
      .catch(() => {
        this.isLiveConnected = false;
      });
  }

  private isCurrentUserEvent(event: ActivityLogDto): boolean {
    const currentUserId = this.authService.currentUserId();
    if (currentUserId && event.actorUserId === currentUserId) {
      return true;
    }

    const claims = this.authService.userClaims();
    const nameValue = claims['name'];
    if (typeof nameValue === 'string' && nameValue.trim().length > 0) {
      return event.actorDisplayName === nameValue.trim();
    }

    return false;
  }

  private shouldUsePreviewMode(): boolean {
    return this.authService.authSession()?.isDebugSession === true && this.authService.canStartDebugSession();
  }

  private loadPreviewActivity(detail: string): void {
    const userId = this.authService.currentUserId() ?? 'preview-user';
    const userName = this.resolveCurrentUserName();
    const now = Date.now();

    this.isPreviewMode = true;
    this.previewDetail = detail;
    this.allActivities = [
      {
        id: 'preview-activity-1',
        type: ActivityType.TaskStatusChanged,
        projectId: 'preview-platform-refresh',
        taskItemId: 'task-1',
        projectName: 'Platform Refresh',
        taskTitle: 'Finalize board interaction polish',
        oldStatus: 0,
        newStatus: 1,
        actorUserId: userId,
        actorDisplayName: userName,
        occurredAt: new Date(now - 35 * 60 * 1000).toISOString()
      },
      {
        id: 'preview-activity-2',
        type: ActivityType.TaskDueDateChanged,
        projectId: 'preview-platform-refresh',
        taskItemId: 'task-2',
        projectName: 'Platform Refresh',
        taskTitle: 'Validate activity feed message grammar',
        oldValue: '2026-02-20',
        newValue: '2026-02-23',
        actorUserId: userId,
        actorDisplayName: userName,
        occurredAt: new Date(now - 3 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 'preview-activity-3',
        type: ActivityType.ProjectRenamed,
        projectId: 'preview-mobile-portal',
        projectName: 'Mobile Portal',
        oldValue: 'Portal Revamp',
        newValue: 'Mobile Portal',
        actorUserId: userId,
        actorDisplayName: userName,
        occurredAt: new Date(now - 22 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 'preview-activity-4',
        type: ActivityType.TaskCreated,
        projectId: 'preview-mobile-portal',
        taskItemId: 'task-4',
        projectName: 'Mobile Portal',
        taskTitle: 'Write integration test coverage',
        actorUserId: userId,
        actorDisplayName: userName,
        occurredAt: new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString()
      }
    ];
    this.recentActivities = this.allActivities.map((event) => mapActivityToRecentActivity(event));
    this.isLoading = false;
  }

  private resolveCurrentUserName(): string {
    const claims = this.authService.userClaims();
    const nameValue = claims['name'];
    const userNameValue = claims['preferred_username'];

    if (typeof nameValue === 'string' && nameValue.trim().length > 0) {
      return nameValue;
    }

    if (typeof userNameValue === 'string' && userNameValue.trim().length > 0) {
      return userNameValue;
    }

    return 'Current User';
  }

  private stripHtml(value: string): string {
    return value.replace(/<[^>]*>/g, ' ');
  }
}
