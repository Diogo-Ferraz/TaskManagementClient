import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { Subject, forkJoin } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { SharedModule } from '../../../../shared/shared.module';
import { ChartModule } from 'primeng/chart';
import { MessagesModule } from 'primeng/messages';
import { Message } from 'primeng/api';
import { DashboardApiClient } from '../../../../core/api/clients/dashboard-api.client';
import { ActivityApiClient } from '../../../../core/api/clients/activity-api.client';
import { DashboardSummaryDto } from '../../../../core/api/models/dashboard.model';
import { ActivityLogDto } from '../../../../core/api/models/activity.model';
import { ActivityType } from '../../../../core/api/models/activity-type.enum';
import { ActivityHubRealtimeService } from '../../../../core/realtime/activity-hub-realtime.service';
import { TaskStatus } from '../../../../core/api/models/task-status.enum';

interface DashboardCard {
  title: string;
  value: string | number;
  icon: string;
  iconColor: string;
  bgColor: string;
  description: string;
}

interface RecentActivity {
  icon: string;
  iconColor: string;
  bgColor: string;
  summary: string;
  time: string;
  rawEvent: ActivityLogDto;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [SharedModule, ChartModule, MessagesModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit, OnDestroy {
  private readonly dashboardApiClient = inject(DashboardApiClient);
  private readonly activityApiClient = inject(ActivityApiClient);
  private readonly activityHubRealtimeService = inject(ActivityHubRealtimeService);

  dashboardCards: DashboardCard[] = [];
  isLoading = true;
  errorMessages: Message[] = [];
  recentActivities: RecentActivity[] = [];
  activityEvents: ActivityLogDto[] = [];
  activityHistoryLimit = 25;

  taskStatusChartData: any;
  taskStatusChartOptions: any;

  private destroy$ = new Subject<void>();

  ngOnInit(): void {
    this.initializeChartOptions();
    this.loadDashboardData();
    this.subscribeToLiveActivity();
  }

  ngOnDestroy(): void {
    this.activityHubRealtimeService.disconnect();
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadDashboardData(): void {
    this.isLoading = true;
    this.errorMessages = [];
    forkJoin({
      summary: this.dashboardApiClient.getSummary(),
      activity: this.activityApiClient.getFeed({
        page: 1,
        pageSize: this.activityHistoryLimit
      })
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: ({ summary, activity }) => {
          this.dashboardCards = this.mapDashboardCards(summary);
          this.activityEvents = activity;
          this.recentActivities = activity.map((event) => this.mapRecentActivity(event));
          this.prepareChartData(activity);
          this.isLoading = false;
          void this.activityHubRealtimeService.connect();
        },
        error: () => {
          this.errorMessages = [{ severity: 'error', summary: 'Error', detail: 'Could not fetch dashboard information.' }];
          this.isLoading = false;
          this.dashboardCards = this.getDefaultCards();
        }
      });
  }

  private mapDashboardCards(summary: DashboardSummaryDto): DashboardCard[] {
    return [
      {
        title: 'Assigned Tasks',
        value: summary.assignedTasksCount,
        icon: 'pi pi-user-edit',
        iconColor: 'text-blue-500',
        bgColor: 'bg-blue-100',
        description: 'Tasks currently assigned to you'
      },
      {
        title: 'Closed This Week',
        value: summary.tasksClosedThisWeekCount,
        icon: 'pi pi-check-circle',
        iconColor: 'text-green-500',
        bgColor: 'bg-green-100',
        description: 'Tasks completed in the current week'
      },
      {
        title: 'Projects Count',
        value: summary.projectsCount,
        icon: 'pi pi-folder-open',
        iconColor: 'text-purple-500',
        bgColor: 'bg-purple-100',
        description: 'Projects visible in your scope'
      },
      {
        title: 'Overdue Assigned',
        value: summary.overdueAssignedTasksCount,
        icon: 'pi pi-exclamation-triangle',
        iconColor: 'text-orange-500',
        bgColor: 'bg-orange-100',
        description: 'Assigned tasks past due date'
      }
    ];
  }

  getDefaultCards(): DashboardCard[] {
    return [
      { title: 'Assigned Tasks', value: '-', icon: 'pi pi-user-edit', iconColor: 'text-gray-500', bgColor: 'bg-gray-100', description: '-' },
      { title: 'Closed This Week', value: '-', icon: 'pi pi-check-circle', iconColor: 'text-gray-500', bgColor: 'bg-gray-100', description: '-' },
      { title: 'Projects Count', value: '-', icon: 'pi pi-folder-open', iconColor: 'text-gray-500', bgColor: 'bg-gray-100', description: '-' },
      { title: 'Overdue Assigned', value: '-', icon: 'pi pi-exclamation-triangle', iconColor: 'text-gray-500', bgColor: 'bg-gray-100', description: '-' }
    ];
  }

  initializeChartOptions(): void {
    const documentStyle = getComputedStyle(document.documentElement);
    const textColor = documentStyle.getPropertyValue('--text-color') || '#495057';

    this.taskStatusChartOptions = {
      plugins: {
        legend: {
          labels: {
            color: textColor,
            usePointStyle: true
          },
          position: 'bottom'
        }
      },
      cutout: '60%'
    };
  }

  prepareChartData(activityEvents: ActivityLogDto[]): void {
    const countsByType = new Map<ActivityType, number>();
    for (const event of activityEvents) {
      const current = countsByType.get(event.type) ?? 0;
      countsByType.set(event.type, current + 1);
    }

    const labels: string[] = [];
    const values: number[] = [];
    for (const [type, count] of countsByType.entries()) {
      labels.push(ActivityType[type]);
      values.push(count);
    }

    this.taskStatusChartData = {
      labels,
      datasets: [
        {
          data: values,
          backgroundColor: ['#64748B', '#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#14B8A6', '#EC4899', '#0EA5E9'],
          hoverBackgroundColor: ['#475569', '#2563EB', '#7C3AED', '#059669', '#D97706', '#DC2626', '#0D9488', '#DB2777', '#0284C7'],
          borderColor: document.documentElement.style.getPropertyValue('--surface-ground') || '#ffffff',
          borderWidth: 1
        }
      ]
    };
  }

  private subscribeToLiveActivity(): void {
    this.activityHubRealtimeService
      .activityCreated$()
      .pipe(takeUntil(this.destroy$))
      .subscribe((event) => {
        const mappedEvent = this.mapRecentActivity(event);
        this.activityEvents = [event, ...this.activityEvents].slice(0, this.activityHistoryLimit);
        this.recentActivities = [mappedEvent, ...this.recentActivities].slice(0, this.activityHistoryLimit);
        this.prepareChartData(this.activityEvents);
      });
  }

  private mapRecentActivity(activity: ActivityLogDto): RecentActivity {
    const summary = this.createActivitySummary(activity);
    return {
      icon: this.getActivityIcon(activity.type),
      iconColor: this.getActivityIconColor(activity.type),
      bgColor: this.getActivityBackgroundColor(activity.type),
      summary,
      time: this.formatRelativeTime(activity.occurredAt),
      rawEvent: activity
    };
  }

  private createActivitySummary(activity: ActivityLogDto): string {
    const actor = this.escapeText(activity.actorDisplayName || 'Someone');

    switch (activity.type) {
      case ActivityType.ProjectCreated:
        return `<strong>${actor}</strong> created project <strong>${this.escapeText(activity.projectName ?? '')}</strong>`;
      case ActivityType.ProjectRenamed:
        return `<strong>${actor}</strong> renamed project from <i>${this.escapeText(activity.oldValue ?? '')}</i> to <i>${this.escapeText(activity.newValue ?? '')}</i>`;
      case ActivityType.ProjectDeleted:
        return `<strong>${actor}</strong> deleted project <strong>${this.escapeText(activity.projectName ?? '')}</strong>`;
      case ActivityType.TaskCreated:
        return `<strong>${actor}</strong> created task <i>${this.escapeText(activity.taskTitle ?? '')}</i>`;
      case ActivityType.TaskStatusChanged:
        return `<strong>${actor}</strong> changed task status from <i>${this.escapeText(this.formatTaskStatus(activity.oldStatus))}</i> to <i>${this.escapeText(this.formatTaskStatus(activity.newStatus))}</i>`;
      case ActivityType.TaskRenamed:
        return `<strong>${actor}</strong> renamed task from <i>${this.escapeText(activity.oldValue ?? '')}</i> to <i>${this.escapeText(activity.newValue ?? '')}</i>`;
      case ActivityType.TaskDeleted:
        return `<strong>${actor}</strong> deleted task <i>${this.escapeText(activity.taskTitle ?? '')}</i>`;
      case ActivityType.TaskAssigneeChanged:
        return `<strong>${actor}</strong> reassigned task from <i>${this.escapeText(activity.oldValue ?? 'Unassigned')}</i> to <i>${this.escapeText(activity.newValue ?? 'Unassigned')}</i>`;
      case ActivityType.TaskDueDateChanged:
        return `<strong>${actor}</strong> changed due date from <i>${this.escapeText(activity.oldValue ?? 'None')}</i> to <i>${this.escapeText(activity.newValue ?? 'None')}</i>`;
      default:
        return `<strong>${actor}</strong> performed an update`;
    }
  }

  private getActivityIcon(type: ActivityType): string {
    switch (type) {
      case ActivityType.ProjectCreated:
      case ActivityType.TaskCreated:
        return 'pi pi-plus';
      case ActivityType.TaskStatusChanged:
        return 'pi pi-sync';
      case ActivityType.TaskDeleted:
      case ActivityType.ProjectDeleted:
        return 'pi pi-trash';
      case ActivityType.TaskAssigneeChanged:
        return 'pi pi-user-edit';
      case ActivityType.TaskDueDateChanged:
        return 'pi pi-calendar';
      case ActivityType.ProjectRenamed:
      case ActivityType.TaskRenamed:
        return 'pi pi-pencil';
      default:
        return 'pi pi-bolt';
    }
  }

  private getActivityIconColor(type: ActivityType): string {
    switch (type) {
      case ActivityType.ProjectDeleted:
      case ActivityType.TaskDeleted:
        return 'text-red-500';
      case ActivityType.TaskStatusChanged:
        return 'text-orange-500';
      case ActivityType.TaskCreated:
      case ActivityType.ProjectCreated:
        return 'text-green-500';
      default:
        return 'text-blue-500';
    }
  }

  private getActivityBackgroundColor(type: ActivityType): string {
    switch (type) {
      case ActivityType.ProjectDeleted:
      case ActivityType.TaskDeleted:
        return 'bg-red-100';
      case ActivityType.TaskStatusChanged:
        return 'bg-orange-100';
      case ActivityType.TaskCreated:
      case ActivityType.ProjectCreated:
        return 'bg-green-100';
      default:
        return 'bg-blue-100';
    }
  }

  private formatRelativeTime(value: string): string {
    const date = new Date(value);
    const diffSeconds = Math.max(1, Math.floor((Date.now() - date.getTime()) / 1000));

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

  private formatTaskStatus(status?: TaskStatus | null): string {
    if (status === null || status === undefined) {
      return 'Unknown';
    }

    switch (status) {
      case TaskStatus.Todo:
        return 'Todo';
      case TaskStatus.InProgress:
        return 'In Progress';
      case TaskStatus.Done:
        return 'Done';
      default:
        return 'Unknown';
    }
  }

  private escapeText(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}
