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

  dashboardCards: DashboardCard[] = [];
  isLoading = true;
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
        const mappedEvent = mapActivityToRecentActivity(event);
        this.activityEvents = [event, ...this.activityEvents].slice(0, this.activityHistoryLimit);
        this.recentActivities = [mappedEvent, ...this.recentActivities].slice(0, this.activityHistoryLimit);
        this.prepareChartData(this.activityEvents);
      });
  }
}
