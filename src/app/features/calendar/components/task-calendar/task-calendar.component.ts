import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { TaskItemsApiClient } from '../../../../core/api/clients/task-items-api.client';
import { TaskItemDto } from '../../../../core/api/models/task-item.model';
import { AuthService } from '../../../../core/auth/services/auth.service';
import { SharedModule } from '../../../../shared/shared.module';

interface CalendarMarker {
  projectId: string;
  projectName: string;
  color: string;
}

@Component({
  selector: 'app-task-calendar',
  standalone: true,
  imports: [CommonModule, FormsModule, SharedModule],
  templateUrl: './task-calendar.component.html',
  styleUrl: './task-calendar.component.scss'
})
export class TaskCalendarComponent implements OnInit, OnDestroy {
  private readonly taskItemsApiClient = inject(TaskItemsApiClient);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly destroy$ = new Subject<void>();

  selectedDate = new Date();

  isLoading = true;
  isPreviewMode = false;
  previewDetail: string | null = null;
  loadError: string | null = null;

  tasksForSelectedDate: TaskItemDto[] = [];
  private allTasks: TaskItemDto[] = [];
  private tasksByDate = new Map<string, TaskItemDto[]>();
  private markersByDate = new Map<string, CalendarMarker[]>();
  private projectLegend = new Map<string, CalendarMarker>();

  ngOnInit(): void {
    this.loadCalendar();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  reload(): void {
    this.loadCalendar();
  }

  onDateSelected(date: Date): void {
    this.tasksForSelectedDate = this.tasksByDate.get(this.toDateKey(date)) ?? [];
  }

  getDayMarkers(day: { year: number; month: number; day: number }): CalendarMarker[] {
    const month = String(day.month + 1).padStart(2, '0');
    const dateKey = `${day.year}-${month}-${String(day.day).padStart(2, '0')}`;
    return this.markersByDate.get(dateKey) ?? [];
  }

  get legendItems(): CalendarMarker[] {
    return Array.from(this.projectLegend.values());
  }

  get selectedDateLabel(): string {
    return this.selectedDate.toLocaleDateString(undefined, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  get isAuthenticated(): boolean {
    return this.authService.isAuthenticated();
  }

  openTaskContext(task: TaskItemDto): void {
    void this.router.navigate(['/projects/kanban'], {
      queryParams: { projectId: task.projectId }
    });
  }

  private loadCalendar(): void {
    this.isLoading = true;
    this.isPreviewMode = false;
    this.previewDetail = null;
    this.loadError = null;
    this.clearData();

    const currentUserId = this.authService.currentUserId();
    if (!currentUserId) {
      this.loadPreviewData();
      return;
    }

    this.taskItemsApiClient
      .getTasks({ assignedUserId: currentUserId, page: 1, pageSize: 500 })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (tasks) => {
          this.applyTasks(tasks);
          this.isLoading = false;
        },
        error: () => {
          if (this.authService.authSession()?.isDebugSession) {
            this.loadPreviewData();
            return;
          }

          this.loadError = 'Could not load task due dates right now.';
          this.isLoading = false;
        }
      });
  }

  private loadPreviewData(): void {
    this.isPreviewMode = true;
    this.previewDetail = 'Showing preview tasks.';
    this.applyTasks(this.createPreviewTasks());
    this.isLoading = false;
  }

  private applyTasks(tasks: TaskItemDto[]): void {
    this.clearData();
    this.allTasks = tasks.filter((task) => !!task.dueDate);

    for (const task of this.allTasks) {
      const dueDate = task.dueDate;
      if (!dueDate) {
        continue;
      }

      const dateKey = dueDate.slice(0, 10);
      const existingTasks = this.tasksByDate.get(dateKey) ?? [];
      existingTasks.push(task);
      this.tasksByDate.set(dateKey, existingTasks);

      if (!this.projectLegend.has(task.projectId)) {
        this.projectLegend.set(task.projectId, {
          projectId: task.projectId,
          projectName: task.projectName,
          color: this.getProjectColor(task.projectId)
        });
      }

      const marker = this.projectLegend.get(task.projectId);
      if (!marker) {
        continue;
      }

      const dayMarkers = this.markersByDate.get(dateKey) ?? [];
      if (!dayMarkers.some((item) => item.projectId === marker.projectId)) {
        dayMarkers.push(marker);
      }

      this.markersByDate.set(dateKey, dayMarkers);
    }

    this.tasksForSelectedDate = this.tasksByDate.get(this.toDateKey(this.selectedDate)) ?? [];
  }

  private clearData(): void {
    this.allTasks = [];
    this.tasksForSelectedDate = [];
    this.tasksByDate.clear();
    this.markersByDate.clear();
    this.projectLegend.clear();
  }

  private toDateKey(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private getProjectColor(projectId: string): string {
    const palette = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EF4444', '#14B8A6', '#F97316', '#6366F1'];
    let hash = 0;

    for (let i = 0; i < projectId.length; i += 1) {
      hash = (hash << 5) - hash + projectId.charCodeAt(i);
      hash |= 0;
    }

    return palette[Math.abs(hash) % palette.length];
  }

  private createPreviewTasks(): TaskItemDto[] {
    const today = new Date();
    const createIso = (offsetDays: number) => {
      const next = new Date(today);
      next.setDate(today.getDate() + offsetDays);
      return next.toISOString();
    };

    const nowIso = today.toISOString();

    return [
      {
        id: 'preview-task-1',
        title: 'Finalize sprint planning notes',
        description: 'Review estimates and sync acceptance criteria.',
        status: 1,
        dueDate: createIso(1),
        projectId: 'project-alpha',
        projectName: 'Alpha Platform',
        assignedUserId: 'debug-user',
        assignedUserName: 'Debug User',
        createdAt: nowIso,
        createdByUserId: 'debug-user',
        createdByUserName: 'Debug User',
        lastModifiedAt: nowIso,
        lastModifiedByUserId: 'debug-user',
        lastModifiedByUserName: 'Debug User'
      },
      {
        id: 'preview-task-2',
        title: 'Prepare Kanban demo flow',
        description: 'Map drag-drop transitions and status updates.',
        status: 0,
        dueDate: createIso(2),
        projectId: 'project-beta',
        projectName: 'Beta Workspace',
        assignedUserId: 'debug-user',
        assignedUserName: 'Debug User',
        createdAt: nowIso,
        createdByUserId: 'debug-user',
        createdByUserName: 'Debug User',
        lastModifiedAt: nowIso,
        lastModifiedByUserId: 'debug-user',
        lastModifiedByUserName: 'Debug User'
      },
      {
        id: 'preview-task-3',
        title: 'Refine error placeholders',
        description: 'Improve loading and empty states for dashboard views.',
        status: 1,
        dueDate: createIso(2),
        projectId: 'project-gamma',
        projectName: 'Gamma Services',
        assignedUserId: 'debug-user',
        assignedUserName: 'Debug User',
        createdAt: nowIso,
        createdByUserId: 'debug-user',
        createdByUserName: 'Debug User',
        lastModifiedAt: nowIso,
        lastModifiedByUserId: 'debug-user',
        lastModifiedByUserName: 'Debug User'
      },
      {
        id: 'preview-task-4',
        title: 'Ship docs refresh',
        description: 'Polish visuals and architecture summary.',
        status: 2,
        dueDate: createIso(4),
        projectId: 'project-alpha',
        projectName: 'Alpha Platform',
        assignedUserId: 'debug-user',
        assignedUserName: 'Debug User',
        createdAt: nowIso,
        createdByUserId: 'debug-user',
        createdByUserName: 'Debug User',
        lastModifiedAt: nowIso,
        lastModifiedByUserId: 'debug-user',
        lastModifiedByUserName: 'Debug User'
      }
    ];
  }
}
