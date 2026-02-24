import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { Message } from 'primeng/api';
import { Table } from 'primeng/table';
import { Subject, takeUntil } from 'rxjs';
import { ActivityApiClient } from '../../../../core/api/clients/activity-api.client';
import { ActivityLogDto } from '../../../../core/api/models/activity.model';
import { ActivityType } from '../../../../core/api/models/activity-type.enum';
import { AuthService } from '../../../../core/auth/services/auth.service';
import { APP_ENVIRONMENT } from '../../../../core/config/app-environment.token';
import { ActivityHubRealtimeService } from '../../../../core/realtime/activity-hub-realtime.service';
import { AppPreferencesService } from '../../../../core/preferences/app-preferences.service';
import { SharedModule } from '../../../../shared/shared.module';

interface ActivityLogRow extends ActivityLogDto {
  entityType: 'Project' | 'Task';
  typeLabel: string;
  occurredAtDate: Date;
}

interface SelectOption<TValue> {
  label: string;
  value: TValue;
}

@Component({
  selector: 'app-activity-log',
  standalone: true,
  imports: [SharedModule],
  templateUrl: './activity-log.component.html',
  styleUrl: './activity-log.component.scss'
})
export class ActivityLogComponent implements OnInit, OnDestroy {
  private readonly activityApiClient = inject(ActivityApiClient);
  private readonly activityHubRealtimeService = inject(ActivityHubRealtimeService);
  private readonly authService = inject(AuthService);
  private readonly appEnvironment = inject(APP_ENVIRONMENT);
  private readonly preferencesService = inject(AppPreferencesService);
  private readonly destroy$ = new Subject<void>();

  readonly entityTypeOptions: SelectOption<string | null>[] = [
    { label: 'All Entities', value: null },
    { label: 'Project', value: 'Project' },
    { label: 'Task', value: 'Task' }
  ];

  readonly typeOptions: SelectOption<ActivityType | null>[] = [
    { label: 'All Activity Types', value: null },
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

  readonly feedLimit = 500;

  rows: ActivityLogRow[] = [];
  filteredRows: ActivityLogRow[] = [];
  isLoading = true;
  isPreviewMode = false;
  isLiveConnected = false;
  previewDetail: string | null = null;
  errors: Message[] = [];

  dateFrom: Date | null = null;
  dateTo: Date | null = null;
  tableSearch = '';

  get totalEvents(): number {
    return this.rows.length;
  }

  get visibleEvents(): number {
    return this.filteredRows.length;
  }

  get todayEvents(): number {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const threshold = today.getTime();
    return this.rows.filter((item) => item.occurredAtDate.getTime() >= threshold).length;
  }

  get projectEvents(): number {
    return this.rows.filter((item) => item.entityType === 'Project').length;
  }

  get defaultTablePageSize(): number {
    return this.preferencesService.preferences().defaultTablePageSize;
  }

  ngOnInit(): void {
    this.loadActivityLog();
    this.subscribeToLiveActivity();
  }

  ngOnDestroy(): void {
    void this.activityHubRealtimeService.disconnect();
    this.destroy$.next();
    this.destroy$.complete();
  }

  refresh(): void {
    this.loadActivityLog();
  }

  clearFilters(table: Table): void {
    table.clear();
    this.dateFrom = null;
    this.dateTo = null;
    this.tableSearch = '';
    this.filteredRows = this.applyDateRangeFilter(this.rows);
  }

  onDateRangeChanged(table: Table): void {
    const dateFiltered = this.applyDateRangeFilter(this.rows);
    this.filteredRows = dateFiltered;
    table.value = dateFiltered;
    table.totalRecords = dateFiltered.length;
  }

  onGlobalFilter(table: Table, event: Event): void {
    table.filterGlobal((event.target as HTMLInputElement).value, 'contains');
  }

  onTableFilter(event: { filteredValue?: ActivityLogRow[] | null }): void {
    this.filteredRows = event.filteredValue ?? this.applyDateRangeFilter(this.rows);
  }

  exportCsv(table: Table): void {
    table.exportCSV();
  }

  getTypeLabel(type: ActivityType): string {
    return this.typeOptions.find((option) => option.value === type)?.label ?? 'Unknown';
  }

  private loadActivityLog(): void {
    this.isLoading = true;
    this.isPreviewMode = false;
    this.previewDetail = null;
    this.errors = [];

    if (this.shouldUsePreviewMode()) {
      this.loadPreviewData('Preview mode active. Showing local activity log.');
      return;
    }

    this.activityApiClient
      .getFeed({ page: 1, pageSize: this.feedLimit })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (events) => {
          this.rows = this.mapRows(events);
          this.filteredRows = this.applyDateRangeFilter(this.rows);
          this.isLoading = false;
        },
        error: () => {
          if (this.shouldUsePreviewMode()) {
            this.loadPreviewData('Backend unavailable. Showing preview activity log.');
            return;
          }

          this.rows = [];
          this.filteredRows = [];
          this.errors = [{ severity: 'error', summary: 'Error', detail: 'Could not load activity log.' }];
          this.isLoading = false;
        }
      });
  }

  private subscribeToLiveActivity(): void {
    this.activityHubRealtimeService
      .activityCreated$()
      .pipe(takeUntil(this.destroy$))
      .subscribe((event) => {
        const next = this.mapRows([event])[0];
        this.rows = [next, ...this.rows].slice(0, this.feedLimit);
        this.filteredRows = this.applyDateRangeFilter(this.rows);
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

  private shouldUsePreviewMode(): boolean {
    return this.authService.authSession()?.isDebugSession === true && this.authService.canStartDebugSession();
  }

  private loadPreviewData(detail: string): void {
    this.isPreviewMode = true;
    this.previewDetail = detail;
    const now = Date.now();

    const previewEvents: ActivityLogDto[] = [
      {
        id: 'preview-log-1',
        type: ActivityType.ProjectRenamed,
        projectId: 'preview-platform-refresh',
        projectName: 'Platform Refresh',
        oldValue: 'API Modernization',
        newValue: 'Platform Refresh',
        actorUserId: 'user-1',
        actorDisplayName: 'Ava Mitchell',
        occurredAt: new Date(now - 55 * 60 * 1000).toISOString()
      },
      {
        id: 'preview-log-2',
        type: ActivityType.TaskStatusChanged,
        projectId: 'preview-platform-refresh',
        taskItemId: 'task-102',
        projectName: 'Platform Refresh',
        taskTitle: 'Finalize board layout',
        actorUserId: 'user-2',
        actorDisplayName: 'Liam Carter',
        occurredAt: new Date(now - 2 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 'preview-log-3',
        type: ActivityType.TaskDueDateChanged,
        projectId: 'preview-mobile-portal',
        taskItemId: 'task-217',
        projectName: 'Mobile Portal',
        taskTitle: 'Refine responsive profile cards',
        actorUserId: 'user-4',
        actorDisplayName: 'Mia Foster',
        occurredAt: new Date(now - 9 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 'preview-log-4',
        type: ActivityType.ProjectCreated,
        projectId: 'preview-security-hardening',
        projectName: 'Security Hardening',
        actorUserId: 'user-3',
        actorDisplayName: 'Noah Sanders',
        occurredAt: new Date(now - 27 * 60 * 60 * 1000).toISOString()
      }
    ];

    this.rows = this.mapRows(previewEvents);
    this.filteredRows = this.applyDateRangeFilter(this.rows);
    this.isLoading = false;
  }

  private mapRows(events: ActivityLogDto[]): ActivityLogRow[] {
    return [...events]
      .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime())
      .map((event) => ({
        ...event,
        entityType: this.resolveEntityType(event.type),
        typeLabel: this.getTypeLabel(event.type),
        occurredAtDate: new Date(event.occurredAt)
      }));
  }

  private applyDateRangeFilter(rows: ActivityLogRow[]): ActivityLogRow[] {
    if (!this.dateFrom && !this.dateTo) {
      return [...rows];
    }

    const fromValue = this.dateFrom ? this.startOfDay(this.dateFrom).getTime() : null;
    const toValue = this.dateTo ? this.endOfDay(this.dateTo).getTime() : null;

    return rows.filter((row) => {
      const value = row.occurredAtDate.getTime();
      if (fromValue !== null && value < fromValue) {
        return false;
      }

      if (toValue !== null && value > toValue) {
        return false;
      }

      return true;
    });
  }

  private startOfDay(date: Date): Date {
    const copy = new Date(date);
    copy.setHours(0, 0, 0, 0);
    return copy;
  }

  private endOfDay(date: Date): Date {
    const copy = new Date(date);
    copy.setHours(23, 59, 59, 999);
    return copy;
  }

  private resolveEntityType(type: ActivityType): 'Project' | 'Task' {
    switch (type) {
      case ActivityType.ProjectCreated:
      case ActivityType.ProjectRenamed:
      case ActivityType.ProjectDeleted:
        return 'Project';
      default:
        return 'Task';
    }
  }
}
