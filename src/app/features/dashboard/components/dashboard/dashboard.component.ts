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
import { AuthService } from '../../../../core/auth/services/auth.service';
import { TaskStatus } from '../../../../core/api/models/task-status.enum';
import {
  mapActivityToRecentActivity,
  RecentActivityViewModel
} from '../../presenters/dashboard-activity.presenter';

interface DashboardCard {
  title: string;
  value: string | number;
  icon: string;
  iconColor: string;
  bgColor: string;
  description: string;
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
  private readonly authService = inject(AuthService);

  dashboardCards: DashboardCard[] = [];
  isLoading = true;
  isPreviewMode = false;
  errorMessages: Message[] = [];
  recentActivities: RecentActivityViewModel[] = [];
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
    this.isPreviewMode = false;
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
          this.recentActivities = activity.map((event) => mapActivityToRecentActivity(event));
          this.prepareChartData(activity);
          this.isLoading = false;
          void this.activityHubRealtimeService.connect();
        },
        error: () => {
          const isDebugSession = this.authService.authSession()?.isDebugSession;
          this.errorMessages = [
            {
              severity: isDebugSession ? 'warn' : 'error',
              summary: isDebugSession ? 'Preview mode' : 'Error',
              detail: isDebugSession
                ? 'Backend unavailable. Showing preview dashboard content.'
                : 'Could not fetch dashboard information.'
            }
          ];

          if (isDebugSession) {
            this.isPreviewMode = true;
            this.dashboardCards = this.getPreviewCards();
            this.activityEvents = this.createPreviewActivity();
            this.recentActivities = this.activityEvents.map((event) => mapActivityToRecentActivity(event));
            this.prepareChartData(this.activityEvents);
          } else {
            this.dashboardCards = this.getDefaultCards();
            this.activityEvents = [];
            this.recentActivities = [];
            this.prepareChartData([]);
          }

          this.isLoading = false;
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

  getPreviewCards(): DashboardCard[] {
    return [
      {
        title: 'Assigned Tasks',
        value: 9,
        icon: 'pi pi-user-edit',
        iconColor: 'text-blue-500',
        bgColor: 'bg-blue-100',
        description: 'Preview data for UI validation'
      },
      {
        title: 'Closed This Week',
        value: 6,
        icon: 'pi pi-check-circle',
        iconColor: 'text-green-500',
        bgColor: 'bg-green-100',
        description: 'Preview data for UI validation'
      },
      {
        title: 'Projects Count',
        value: 4,
        icon: 'pi pi-folder-open',
        iconColor: 'text-purple-500',
        bgColor: 'bg-purple-100',
        description: 'Preview data for UI validation'
      },
      {
        title: 'Overdue Assigned',
        value: 2,
        icon: 'pi pi-exclamation-triangle',
        iconColor: 'text-orange-500',
        bgColor: 'bg-orange-100',
        description: 'Preview data for UI validation'
      }
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

  private createPreviewActivity(): ActivityLogDto[] {
    const now = new Date();
    const toIsoMinusMinutes = (minutes: number) =>
      new Date(now.getTime() - minutes * 60_000).toISOString();

    return [
      {
        id: 'preview-activity-1',
        type: ActivityType.TaskStatusChanged,
        projectId: 'project-alpha',
        taskItemId: 'task-alpha-1',
        projectName: 'Alpha Platform',
        taskTitle: 'Finalize sprint planning notes',
        oldStatus: TaskStatus.Todo,
        newStatus: TaskStatus.InProgress,
        oldValue: null,
        newValue: null,
        actorUserId: 'debug-user',
        actorDisplayName: 'Debug User',
        occurredAt: toIsoMinusMinutes(9)
      },
      {
        id: 'preview-activity-2',
        type: ActivityType.TaskCreated,
        projectId: 'project-beta',
        taskItemId: 'task-beta-3',
        projectName: 'Beta Workspace',
        taskTitle: 'Prepare Kanban demo flow',
        oldStatus: null,
        newStatus: null,
        oldValue: null,
        newValue: null,
        actorUserId: 'debug-user',
        actorDisplayName: 'Debug User',
        occurredAt: toIsoMinusMinutes(22)
      },
      {
        id: 'preview-activity-3',
        type: ActivityType.ProjectRenamed,
        projectId: 'project-gamma',
        taskItemId: null,
        projectName: 'Gamma Services',
        taskTitle: null,
        oldStatus: null,
        newStatus: null,
        oldValue: 'Gamma API',
        newValue: 'Gamma Services',
        actorUserId: 'project-manager-1',
        actorDisplayName: 'Project Manager',
        occurredAt: toIsoMinusMinutes(54)
      }
    ];
  }

  private subscribeToLiveActivity(): void {
    this.activityHubRealtimeService
      .activityCreated$()
      .pipe(takeUntil(this.destroy$))
      .subscribe((event) => {
        const mappedEvent = mapActivityToRecentActivity(event);
        this.activityEvents = [event, ...this.activityEvents].slice(0, this.activityHistoryLimit);
        this.recentActivities = [mappedEvent, ...this.recentActivities].slice(0, this.activityHistoryLimit);
        this.prepareChartData(this.activityEvents);
      });
  }
}
