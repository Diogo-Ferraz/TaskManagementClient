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
import {
  ActivityHeatmapComponent,
  HeatmapDayCell
} from '../../../../shared/components/activity-heatmap/activity-heatmap.component';

interface DashboardCard {
  title: string;
  value: string | number;
  icon: string;
  tone: 'todo' | 'progress' | 'done' | 'warning' | 'neutral';
  description: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [SharedModule, ChartModule, MessagesModule, ActivityHeatmapComponent],
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
  summarySnapshot: DashboardSummaryDto | null = null;

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
          this.summarySnapshot = summary;
          this.dashboardCards = this.mapDashboardCards(summary);
          this.activityEvents = activity;
          this.recentActivities = activity.map((event) => mapActivityToRecentActivity(event));
          this.prepareChartData(activity);
          this.isLoading = false;
          void this.activityHubRealtimeService.connect();
        },
        error: () => {
          const isDebugSession = this.authService.authSession()?.isDebugSession;

          if (isDebugSession) {
            this.errorMessages = [];
            this.isPreviewMode = true;
            this.summarySnapshot = {
              assignedTasksCount: 9,
              tasksClosedThisWeekCount: 6,
              projectsCount: 4,
              overdueAssignedTasksCount: 2
            };
            this.dashboardCards = this.getPreviewCards();
            this.activityEvents = this.createPreviewActivity();
            this.recentActivities = this.activityEvents.map((event) => mapActivityToRecentActivity(event));
            this.prepareChartData(this.activityEvents);
          } else {
            this.errorMessages = [
              {
                severity: 'error',
                summary: 'Error',
                detail: 'Could not fetch dashboard information.'
              }
            ];
            this.summarySnapshot = null;
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
        tone: 'todo',
        description: 'Tasks currently assigned to you'
      },
      {
        title: 'Closed This Week',
        value: summary.tasksClosedThisWeekCount,
        icon: 'pi pi-check-circle',
        tone: 'done',
        description: 'Tasks completed in the current week'
      },
      {
        title: 'Projects Count',
        value: summary.projectsCount,
        icon: 'pi pi-folder-open',
        tone: 'progress',
        description: 'Projects visible in your scope'
      },
      {
        title: 'Overdue Assigned',
        value: summary.overdueAssignedTasksCount,
        icon: 'pi pi-exclamation-triangle',
        tone: 'warning',
        description: 'Assigned tasks past due date'
      }
    ];
  }

  getDefaultCards(): DashboardCard[] {
    return [
      { title: 'Assigned Tasks', value: '-', icon: 'pi pi-user-edit', tone: 'neutral', description: '-' },
      { title: 'Closed This Week', value: '-', icon: 'pi pi-check-circle', tone: 'neutral', description: '-' },
      { title: 'Projects Count', value: '-', icon: 'pi pi-folder-open', tone: 'neutral', description: '-' },
      { title: 'Overdue Assigned', value: '-', icon: 'pi pi-exclamation-triangle', tone: 'neutral', description: '-' }
    ];
  }

  getPreviewCards(): DashboardCard[] {
    return [
      {
        title: 'Assigned Tasks',
        value: 9,
        icon: 'pi pi-user-edit',
        tone: 'todo',
        description: 'Preview data for UI validation'
      },
      {
        title: 'Closed This Week',
        value: 6,
        icon: 'pi pi-check-circle',
        tone: 'done',
        description: 'Preview data for UI validation'
      },
      {
        title: 'Projects Count',
        value: 4,
        icon: 'pi pi-folder-open',
        tone: 'progress',
        description: 'Preview data for UI validation'
      },
      {
        title: 'Overdue Assigned',
        value: 2,
        icon: 'pi pi-exclamation-triangle',
        tone: 'warning',
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
      labels.push(this.formatActivityTypeLabel(type));
      values.push(count);
    }

    this.taskStatusChartData = {
      labels,
      datasets: [
        {
          data: values,
          backgroundColor: ['#D4E8FF', '#CFEAE4', '#FDE5C9', '#F9D9E2', '#E2D9F8', '#FFE1D6', '#D9F1F0', '#DDE7FF', '#FBE6EF'],
          hoverBackgroundColor: ['#BEDCFD', '#B8DED5', '#F9D7B1', '#F5C7D4', '#D5C8F2', '#FFD2C3', '#CAE8E6', '#CFDBFD', '#F6D8E7'],
          borderColor: document.documentElement.style.getPropertyValue('--surface-ground') || '#ffffff',
          borderWidth: 1
        }
      ]
    };
  }

  get completionRateValue(): number {
    if (!this.summarySnapshot) {
      return 0;
    }

    const denominator = this.summarySnapshot.assignedTasksCount + this.summarySnapshot.tasksClosedThisWeekCount;
    if (denominator <= 0) {
      return 0;
    }

    return Math.round((this.summarySnapshot.tasksClosedThisWeekCount / denominator) * 100);
  }

  get focusInsights(): Array<{ label: string; value: string; tone: 'todo' | 'done' | 'warning' }> {
    const assigned = this.summarySnapshot?.assignedTasksCount ?? 0;
    const closed = this.summarySnapshot?.tasksClosedThisWeekCount ?? 0;
    const overdue = this.summarySnapshot?.overdueAssignedTasksCount ?? 0;
    const onTrack = Math.max(0, assigned - overdue);

    return [
      { label: 'On Track', value: `${onTrack}`, tone: 'todo' },
      { label: 'Closed (7d)', value: `${closed}`, tone: 'done' },
      { label: 'Needs Attention', value: `${overdue}`, tone: 'warning' }
    ];
  }

  getActivityToneClass(activity: RecentActivityViewModel): string {
    switch (activity.rawEvent.type) {
      case ActivityType.TaskCreated:
      case ActivityType.ProjectCreated:
        return 'dashboard-activity-icon--todo';
      case ActivityType.TaskStatusChanged:
      case ActivityType.TaskDueDateChanged:
      case ActivityType.ProjectRenamed:
        return 'dashboard-activity-icon--progress';
      case ActivityType.TaskDeleted:
      case ActivityType.ProjectDeleted:
        return 'dashboard-activity-icon--warning';
      case ActivityType.TaskAssigneeChanged:
      case ActivityType.TaskRenamed:
      default:
        return 'dashboard-activity-icon--done';
    }
  }

  get heatmapWeeks(): HeatmapDayCell[][] {
    const today = this.startOfDay(new Date());
    const start = new Date(today);
    start.setDate(start.getDate() - 83); // 12 weeks
    const startAligned = this.startOfWeek(start);

    const countsByDay = new Map<string, number>();
    for (const event of this.activityEvents) {
      const eventDate = this.startOfDay(new Date(event.occurredAt));
      const key = this.dateKey(eventDate);
      countsByDay.set(key, (countsByDay.get(key) ?? 0) + 1);
    }

    const cells: HeatmapDayCell[] = [];
    const cursor = new Date(startAligned);
    while (cursor <= today) {
      const key = this.dateKey(cursor);
      const count = countsByDay.get(key) ?? 0;
      cells.push({
        date: new Date(cursor),
        count,
        intensityLevel: this.toHeatmapLevel(count)
      });
      cursor.setDate(cursor.getDate() + 1);
    }

    const weeks: HeatmapDayCell[][] = [];
    for (let i = 0; i < cells.length; i += 7) {
      weeks.push(cells.slice(i, i + 7));
    }

    return weeks;
  }

  get heatmapTotalActivities(): number {
    return this.activityEvents.length;
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

  private toHeatmapLevel(count: number): number {
    if (count <= 0) {
      return 0;
    }
    if (count === 1) {
      return 1;
    }
    if (count <= 3) {
      return 2;
    }
    if (count <= 5) {
      return 3;
    }
    return 4;
  }

  private formatActivityTypeLabel(type: ActivityType): string {
    const labelMap: Partial<Record<ActivityType, string>> = {
      [ActivityType.ProjectCreated]: 'Project Created',
      [ActivityType.ProjectRenamed]: 'Project Renamed',
      [ActivityType.ProjectDeleted]: 'Project Deleted',
      [ActivityType.TaskCreated]: 'Task Created',
      [ActivityType.TaskStatusChanged]: 'Status Changed',
      [ActivityType.TaskRenamed]: 'Task Renamed',
      [ActivityType.TaskDeleted]: 'Task Deleted',
      [ActivityType.TaskAssigneeChanged]: 'Assignee Changed',
      [ActivityType.TaskDueDateChanged]: 'Due Date Changed'
    };

    return labelMap[type] ?? 'Activity';
  }

  private startOfDay(value: Date): Date {
    return new Date(value.getFullYear(), value.getMonth(), value.getDate());
  }

  private startOfWeek(value: Date): Date {
    const day = value.getDay();
    const diff = day === 0 ? -6 : 1 - day; // Monday-start
    const start = new Date(value);
    start.setDate(start.getDate() + diff);
    return this.startOfDay(start);
  }

  private dateKey(value: Date): string {
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, '0');
    const d = String(value.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
}
