import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Message, MessageService } from 'primeng/api';
import { DialogModule } from 'primeng/dialog';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { Subject, takeUntil } from 'rxjs';
import { TaskItemsApiClient } from '../../../../core/api/clients/task-items-api.client';
import { PatchTaskItemRequest, TaskItemDto } from '../../../../core/api/models/task-item.model';
import { TaskStatus } from '../../../../core/api/models/task-status.enum';
import { AuthService } from '../../../../core/auth/services/auth.service';
import { APP_ENVIRONMENT } from '../../../../core/config/app-environment.token';
import { SharedModule } from '../../../../shared/shared.module';

type TagSeverity = 'success' | 'secondary' | 'info' | 'warning' | 'danger' | 'contrast';

interface TaskEditForm {
  title: string;
  description: string;
  status: TaskStatus;
  dueDate: Date | null;
}

@Component({
  selector: 'app-user-task-items',
  standalone: true,
  imports: [SharedModule, DialogModule, InputTextareaModule],
  templateUrl: './user-task-items.component.html',
  styleUrl: './user-task-items.component.scss'
})
export class UserTaskItemsComponent implements OnInit, OnDestroy {
  private readonly taskItemsApiClient = inject(TaskItemsApiClient);
  private readonly authService = inject(AuthService);
  private readonly appEnvironment = inject(APP_ENVIRONMENT);
  private readonly messageService = inject(MessageService);
  private readonly router = inject(Router);
  private readonly destroy$ = new Subject<void>();

  readonly TaskStatus = TaskStatus;
  readonly statusOptions = [
    { label: 'To Do', value: TaskStatus.Todo },
    { label: 'In Progress', value: TaskStatus.InProgress },
    { label: 'Done', value: TaskStatus.Done }
  ];

  tasks: TaskItemDto[] = [];
  isLoading = false;
  isPreviewMode = false;
  previewDetail: string | null = null;
  errors: Message[] = [];
  private pendingTaskIds = new Set<string>();

  isEditDialogVisible = false;
  isSavingTask = false;
  editTaskId: string | null = null;
  taskForm: TaskEditForm = {
    title: '',
    description: '',
    status: TaskStatus.Todo,
    dueDate: null
  };

  ngOnInit(): void {
    this.loadTasks();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get totalTasks(): number {
    return this.tasks.length;
  }

  get todoTasks(): TaskItemDto[] {
    return this.tasks.filter((task) => task.status === TaskStatus.Todo);
  }

  get inProgressTasks(): TaskItemDto[] {
    return this.tasks.filter((task) => task.status === TaskStatus.InProgress);
  }

  get doneTasks(): TaskItemDto[] {
    return this.tasks.filter((task) => task.status === TaskStatus.Done);
  }

  get overdueTasksCount(): number {
    return [...this.todoTasks, ...this.inProgressTasks].filter((task) => this.isOverdue(task.dueDate ?? null)).length;
  }

  get dueSoonTasksCount(): number {
    const now = Date.now();
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    return [...this.todoTasks, ...this.inProgressTasks].filter((task) => {
      if (!task.dueDate) {
        return false;
      }

      const dueMs = new Date(task.dueDate).getTime();
      return dueMs >= now && dueMs - now <= sevenDaysMs;
    }).length;
  }

  get currentUserDisplayName(): string {
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

  refresh(): void {
    this.loadTasks();
  }

  taskTrackBy(_: number, task: TaskItemDto): string {
    return task.id;
  }

  isTaskPending(taskId: string): boolean {
    return this.pendingTaskIds.has(taskId);
  }

  canEditTask(task: TaskItemDto): boolean {
    if (this.authService.hasAnyRole(['Administrator', 'ProjectManager'])) {
      return true;
    }

    return !!this.authService.currentUserId() && task.assignedUserId === this.authService.currentUserId();
  }

  getTagSeverity(status: TaskStatus): TagSeverity {
    switch (status) {
      case TaskStatus.Todo:
        return 'info';
      case TaskStatus.InProgress:
        return 'warning';
      case TaskStatus.Done:
        return 'success';
      default:
        return 'secondary';
    }
  }

  getStatusName(status: TaskStatus): string {
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

  getInitials(name: string | undefined | null): string {
    if (!name) {
      return '?';
    }

    return name
      .split(' ')
      .map((part) => part[0])
      .filter((_, index, parts) => index === 0 || index === parts.length - 1)
      .join('')
      .toUpperCase();
  }

  isOverdue(dueDate: string | null): boolean {
    if (!dueDate) {
      return false;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);
    return due < today;
  }

  onTaskCheck(task: TaskItemDto): void {
    if (this.isTaskPending(task.id)) {
      return;
    }

    let nextStatus = TaskStatus.Todo;
    if (task.status === TaskStatus.Todo) {
      nextStatus = TaskStatus.InProgress;
    } else if (task.status === TaskStatus.InProgress) {
      nextStatus = TaskStatus.Done;
    } else if (task.status === TaskStatus.Done) {
      nextStatus = TaskStatus.Todo;
    }

    this.patchTaskStatus(task, nextStatus);
  }

  openEditTask(task: TaskItemDto): void {
    if (!this.canEditTask(task) || this.isTaskPending(task.id)) {
      return;
    }

    this.editTaskId = task.id;
    this.taskForm = {
      title: task.title,
      description: task.description ?? '',
      status: task.status,
      dueDate: task.dueDate ? new Date(task.dueDate) : null
    };
    this.isEditDialogVisible = true;
  }

  closeEditDialog(): void {
    this.isEditDialogVisible = false;
    this.isSavingTask = false;
    this.editTaskId = null;
  }

  saveEditTask(): void {
    const taskId = this.editTaskId;
    const title = this.taskForm.title.trim();

    if (!taskId || !title || this.isSavingTask) {
      return;
    }

    const task = this.tasks.find((entry) => entry.id === taskId);
    if (!task || !this.canEditTask(task)) {
      return;
    }

    const payload: PatchTaskItemRequest = {
      title,
      description: this.taskForm.description.trim() || null,
      status: this.taskForm.status,
      dueDate: this.taskForm.dueDate ? this.taskForm.dueDate.toISOString() : null
    };

    const previous = { ...task };
    const localUpdated: TaskItemDto = {
      ...task,
      title: payload.title ?? task.title,
      description: payload.description ?? null,
      status: payload.status ?? task.status,
      dueDate: payload.dueDate ?? null
    };

    this.replaceTask(localUpdated);

    if (this.isPreviewMode) {
      this.closeEditDialog();
      this.messageService.add({ severity: 'success', summary: 'Preview', detail: 'Task edited locally.' });
      return;
    }

    this.isSavingTask = true;
    this.pendingTaskIds.add(taskId);
    this.taskItemsApiClient
      .patch(taskId, payload)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updatedTask) => {
          this.replaceTask(updatedTask);
          this.pendingTaskIds.delete(taskId);
          this.closeEditDialog();
          this.messageService.add({ severity: 'success', summary: 'Updated', detail: 'Task saved successfully.' });
        },
        error: () => {
          this.replaceTask(previous);
          this.pendingTaskIds.delete(taskId);
          this.isSavingTask = false;
          this.messageService.add({ severity: 'error', summary: 'Update Failed', detail: 'Could not save task changes.' });
        }
      });
  }

  openTaskBoard(task: TaskItemDto): void {
    void this.router.navigate(['/projects/kanban'], {
      queryParams: { projectId: task.projectId }
    });
  }

  private patchTaskStatus(task: TaskItemDto, nextStatus: TaskStatus): void {
    const previous = task.status;
    task.status = nextStatus;
    this.tasks = this.sortTasks([...this.tasks]);

    if (this.isPreviewMode) {
      this.messageService.add({
        severity: 'success',
        summary: 'Preview',
        detail: `Task marked as ${this.getStatusName(nextStatus)}.`
      });
      return;
    }

    this.pendingTaskIds.add(task.id);
    this.taskItemsApiClient
      .patch(task.id, { status: nextStatus })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updatedTask) => {
          this.replaceTask(updatedTask);
          this.pendingTaskIds.delete(task.id);
          this.messageService.add({ severity: 'success', summary: 'Updated', detail: 'Task status updated successfully.' });
        },
        error: () => {
          task.status = previous;
          this.tasks = this.sortTasks([...this.tasks]);
          this.pendingTaskIds.delete(task.id);
          this.messageService.add({ severity: 'error', summary: 'Update Failed', detail: 'Could not update task status.' });
        }
      });
  }

  private loadTasks(): void {
    this.isLoading = true;
    this.errors = [];
    this.isPreviewMode = false;
    this.previewDetail = null;
    this.tasks = [];

    if (this.shouldUsePreviewMode()) {
      this.loadPreviewTasks('Preview mode active. Showing local task list.');
      return;
    }

    const currentUserId = this.authService.currentUserId();
    if (!currentUserId) {
      this.errors = [{ severity: 'error', summary: 'User Missing', detail: 'Could not resolve current user identity.' }];
      this.isLoading = false;
      return;
    }

    this.taskItemsApiClient
      .getTasks({ assignedUserId: currentUserId, page: 1, pageSize: 500 })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (tasks) => {
          this.tasks = this.sortTasks(tasks);
          this.isLoading = false;
        },
        error: () => {
          if (this.shouldUsePreviewMode()) {
            this.loadPreviewTasks('Backend unavailable. Showing preview task list.');
            return;
          }

          this.errors = [{ severity: 'error', summary: 'Error', detail: 'Could not load your tasks.' }];
          this.isLoading = false;
        }
      });
  }

  private shouldUsePreviewMode(): boolean {
    return this.authService.authSession()?.isDebugSession === true && this.authService.canStartDebugSession();
  }

  private loadPreviewTasks(detail: string): void {
    const now = new Date();
    this.isPreviewMode = true;
    this.previewDetail = detail;

    this.tasks = this.sortTasks([
      {
        id: 'preview-task-1',
        title: 'Refine dashboard KPI interactions',
        description: 'Improve readability and hover feedback for KPI cards.',
        status: TaskStatus.InProgress,
        dueDate: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString(),
        projectId: 'preview-platform-refresh',
        projectName: 'Platform Refresh',
        assignedUserId: 'debug-user',
        assignedUserName: this.currentUserDisplayName,
        createdAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        createdByUserId: 'user-1',
        createdByUserName: 'Ava Mitchell',
        lastModifiedAt: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(),
        lastModifiedByUserId: 'debug-user',
        lastModifiedByUserName: this.currentUserDisplayName
      },
      {
        id: 'preview-task-2',
        title: 'Write integration notes for auth flow',
        description: 'Document callback edge cases and role propagation.',
        status: TaskStatus.Todo,
        dueDate: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString(),
        projectId: 'preview-security-hardening',
        projectName: 'Security Hardening',
        assignedUserId: 'debug-user',
        assignedUserName: this.currentUserDisplayName,
        createdAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        createdByUserId: 'user-4',
        createdByUserName: 'Mia Foster',
        lastModifiedAt: new Date(now.getTime() - 9 * 60 * 60 * 1000).toISOString(),
        lastModifiedByUserId: 'user-4',
        lastModifiedByUserName: 'Mia Foster'
      },
      {
        id: 'preview-task-3',
        title: 'Stabilize Kanban drag ghost rendering',
        description: 'Ensure one ghost card at drop target and rounded drag image.',
        status: TaskStatus.Done,
        dueDate: new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString(),
        projectId: 'preview-platform-refresh',
        projectName: 'Platform Refresh',
        assignedUserId: 'debug-user',
        assignedUserName: this.currentUserDisplayName,
        createdAt: new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000).toISOString(),
        createdByUserId: 'user-2',
        createdByUserName: 'Liam Carter',
        lastModifiedAt: new Date(now.getTime() - 26 * 60 * 60 * 1000).toISOString(),
        lastModifiedByUserId: 'debug-user',
        lastModifiedByUserName: this.currentUserDisplayName
      }
    ]);

    this.isLoading = false;
  }

  private sortTasks(tasks: TaskItemDto[]): TaskItemDto[] {
    return [...tasks].sort((a, b) => {
      const statusOrder = (status: TaskStatus): number => {
        if (status === TaskStatus.Todo) {
          return 0;
        }

        if (status === TaskStatus.InProgress) {
          return 1;
        }

        return 2;
      };

      const statusDiff = statusOrder(a.status) - statusOrder(b.status);
      if (statusDiff !== 0) {
        return statusDiff;
      }

      const dueA = a.dueDate ? new Date(a.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
      const dueB = b.dueDate ? new Date(b.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
      return dueA - dueB;
    });
  }

  private replaceTask(updatedTask: TaskItemDto): void {
    const index = this.tasks.findIndex((task) => task.id === updatedTask.id);
    if (index < 0) {
      return;
    }

    const nextTasks = [...this.tasks];
    nextTasks[index] = updatedTask;
    this.tasks = this.sortTasks(nextTasks);
  }
}
