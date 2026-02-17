import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Message, MessageService } from 'primeng/api';
import { Table } from 'primeng/table';
import { Subject, takeUntil } from 'rxjs';
import { ProjectsApiClient } from '../../../../core/api/clients/projects-api.client';
import { TaskItemsApiClient } from '../../../../core/api/clients/task-items-api.client';
import { ProjectDto } from '../../../../core/api/models/project.model';
import { TaskItemDto } from '../../../../core/api/models/task-item.model';
import { TaskStatus } from '../../../../core/api/models/task-status.enum';
import { AuthService } from '../../../../core/auth/services/auth.service';
import { APP_ENVIRONMENT } from '../../../../core/config/app-environment.token';
import { SharedModule } from '../../../../shared/shared.module';

type TagSeverity = 'success' | 'secondary' | 'info' | 'warning' | 'danger' | 'contrast';

interface StatusOption {
  label: string;
  value: TaskStatus;
}

@Component({
  selector: 'app-task-item-list',
  standalone: true,
  imports: [SharedModule],
  templateUrl: './task-item-list.component.html',
  styleUrl: './task-item-list.component.scss'
})
export class TaskItemListComponent implements OnInit, OnDestroy {
  private readonly projectsApiClient = inject(ProjectsApiClient);
  private readonly taskItemsApiClient = inject(TaskItemsApiClient);
  private readonly authService = inject(AuthService);
  private readonly appEnvironment = inject(APP_ENVIRONMENT);
  private readonly router = inject(Router);
  private readonly messageService = inject(MessageService);
  private readonly destroy$ = new Subject<void>();

  readonly statusOptions: StatusOption[] = [
    { label: 'To Do', value: TaskStatus.Todo },
    { label: 'In Progress', value: TaskStatus.InProgress },
    { label: 'Done', value: TaskStatus.Done }
  ];

  readonly TaskStatus = TaskStatus;

  projects: ProjectDto[] = [];
  selectedProjectId: string | null = null;
  tasks: TaskItemDto[] = [];

  isLoadingProjects = true;
  isLoadingTasks = false;
  isPreviewMode = false;
  previewDetail: string | null = null;
  errors: Message[] = [];

  searchValue = '';
  pendingTaskIds = new Set<string>();

  ngOnInit(): void {
    this.loadProjects();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get selectedProject(): ProjectDto | null {
    return this.projects.find((project) => project.id === this.selectedProjectId) ?? null;
  }

  get totalTasks(): number {
    return this.tasks.length;
  }

  get todoTasks(): number {
    return this.tasks.filter((task) => task.status === TaskStatus.Todo).length;
  }

  get inProgressTasks(): number {
    return this.tasks.filter((task) => task.status === TaskStatus.InProgress).length;
  }

  get doneTasks(): number {
    return this.tasks.filter((task) => task.status === TaskStatus.Done).length;
  }

  get unassignedTasks(): number {
    return this.tasks.filter((task) => this.isUnassigned(task)).length;
  }

  get dueSoonTasks(): number {
    const now = Date.now();
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

    return this.tasks.filter((task) => {
      if (!task.dueDate) {
        return false;
      }

      const dueDateMs = new Date(task.dueDate).getTime();
      return dueDateMs >= now && dueDateMs - now <= sevenDaysMs;
    }).length;
  }

  get selectedProjectCreatedBy(): string {
    return this.selectedProject?.createdByUserName || 'Unknown';
  }

  get selectedProjectCreatedAt(): string | null {
    return this.selectedProject?.createdAt ?? null;
  }

  get currentUserId(): string | null {
    return this.authService.currentUserId();
  }

  get canManageAllTasks(): boolean {
    return this.authService.hasAnyRole(['Administrator', 'ProjectManager']);
  }

  onProjectChange(): void {
    if (!this.selectedProjectId) {
      this.tasks = [];
      return;
    }

    this.loadTasks(this.selectedProjectId);
  }

  refresh(): void {
    if (this.selectedProjectId) {
      this.loadTasks(this.selectedProjectId);
      return;
    }

    this.loadProjects();
  }

  clear(table: Table): void {
    table.clear();
    this.searchValue = '';
  }

  onGlobalFilter(table: Table, event: Event): void {
    table.filterGlobal((event.target as HTMLInputElement).value, 'contains');
  }

  exportCSV(table: Table): void {
    table.exportCSV();
  }

  trackByTaskId(_: number, task: TaskItemDto): string {
    return task.id;
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

  isUnassigned(task: TaskItemDto): boolean {
    return !task.assignedUserId || task.assignedUserId.trim().length === 0;
  }

  isAssignedToMe(task: TaskItemDto): boolean {
    return !!this.currentUserId && task.assignedUserId === this.currentUserId;
  }

  canEditStatus(task: TaskItemDto): boolean {
    return this.canManageAllTasks || this.isAssignedToMe(task);
  }

  isTaskPending(taskId: string): boolean {
    return this.pendingTaskIds.has(taskId);
  }

  isOverdue(task: TaskItemDto): boolean {
    if (!task.dueDate) {
      return false;
    }

    return new Date(task.dueDate).getTime() < Date.now() && task.status !== TaskStatus.Done;
  }

  openKanban(): void {
    if (!this.selectedProjectId) {
      return;
    }

    void this.router.navigate(['/projects/kanban'], {
      queryParams: { projectId: this.selectedProjectId }
    });
  }

  assignToMe(task: TaskItemDto): void {
    const userId = this.currentUserId;
    if (!userId || this.isTaskPending(task.id) || !this.isUnassigned(task)) {
      return;
    }

    this.patchTaskWithOptimisticUpdate(
      task,
      { assignedUserId: userId },
      () => {
        task.assignedUserId = userId;
        task.assignedUserName = this.resolveCurrentUserName();
      },
      'Task assigned to you.',
      'Could not assign task.'
    );
  }

  unassignTask(task: TaskItemDto): void {
    if (this.isTaskPending(task.id) || this.isUnassigned(task)) {
      return;
    }

    this.patchTaskWithOptimisticUpdate(
      task,
      { assignedUserId: null },
      () => {
        task.assignedUserId = null;
        task.assignedUserName = 'Unassigned';
      },
      'Task unassigned.',
      'Could not unassign task.'
    );
  }

  updateStatus(task: TaskItemDto, status: TaskStatus): void {
    if (!this.canEditStatus(task) || this.isTaskPending(task.id) || task.status === status) {
      return;
    }

    this.patchTaskWithOptimisticUpdate(
      task,
      { status },
      () => {
        task.status = status;
      },
      'Task status updated.',
      'Could not update task status.'
    );
  }

  private loadProjects(): void {
    this.isLoadingProjects = true;
    this.projects = [];
    this.tasks = [];
    this.selectedProjectId = null;
    this.errors = [];
    this.isPreviewMode = false;
    this.previewDetail = null;

    if (this.shouldUsePreviewMode()) {
      this.loadPreviewProjects('Preview mode active. Showing local project/task data.');
      return;
    }

    this.projectsApiClient
      .getProjects({ page: 1, pageSize: 200 })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (projects) => {
          this.projects = projects;
          this.selectedProjectId = projects[0]?.id ?? null;
          this.isLoadingProjects = false;

          if (this.selectedProjectId) {
            this.loadTasks(this.selectedProjectId);
          }
        },
        error: () => {
          if (this.shouldUsePreviewMode()) {
            this.loadPreviewProjects('Backend unavailable. Showing preview project tasks.');
            return;
          }

          this.errors = [{ severity: 'error', summary: 'Error', detail: 'Could not load projects.' }];
          this.isLoadingProjects = false;
        }
      });
  }

  private loadTasks(projectId: string): void {
    this.isLoadingTasks = true;
    this.errors = [];

    if (this.isPreviewMode) {
      this.tasks = this.buildPreviewTasks(projectId);
      this.isLoadingTasks = false;
      return;
    }

    this.taskItemsApiClient
      .getTasks({ projectId, page: 1, pageSize: 500 })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (tasks) => {
          this.tasks = [...tasks].sort((a, b) => {
            return new Date(b.lastModifiedAt).getTime() - new Date(a.lastModifiedAt).getTime();
          });
          this.isLoadingTasks = false;
        },
        error: () => {
          if (this.shouldUsePreviewMode()) {
            this.isPreviewMode = true;
            this.previewDetail = 'Task endpoint unavailable. Showing preview tasks.';
            this.tasks = this.buildPreviewTasks(projectId);
            this.isLoadingTasks = false;
            return;
          }

          this.errors = [{ severity: 'error', summary: 'Error', detail: 'Could not load tasks for selected project.' }];
          this.isLoadingTasks = false;
        }
      });
  }

  private patchTaskWithOptimisticUpdate(
    task: TaskItemDto,
    payload: { status?: TaskStatus; assignedUserId?: string | null },
    applyLocalUpdate: () => void,
    successMessage: string,
    errorMessage: string
  ): void {
    const previousState = { ...task };
    applyLocalUpdate();
    this.tasks = [...this.tasks];

    if (this.isPreviewMode) {
      this.messageService.add({ severity: 'success', summary: 'Preview', detail: successMessage });
      return;
    }

    this.pendingTaskIds.add(task.id);
    this.taskItemsApiClient
      .patch(task.id, payload)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updatedTask) => {
          this.replaceTask(updatedTask);
          this.pendingTaskIds.delete(task.id);
          this.messageService.add({ severity: 'success', summary: 'Updated', detail: successMessage });
        },
        error: () => {
          this.replaceTask(previousState);
          this.pendingTaskIds.delete(task.id);
          this.messageService.add({ severity: 'error', summary: 'Update Failed', detail: errorMessage });
        }
      });
  }

  private replaceTask(updatedTask: TaskItemDto): void {
    const index = this.tasks.findIndex((task) => task.id === updatedTask.id);
    if (index === -1) {
      return;
    }

    const nextTasks = [...this.tasks];
    nextTasks[index] = updatedTask;
    this.tasks = nextTasks;
  }

  private shouldUsePreviewMode(): boolean {
    if (!this.appEnvironment.production) {
      return true;
    }

    return this.authService.authSession()?.isDebugSession === true;
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

  private loadPreviewProjects(detail: string): void {
    this.isPreviewMode = true;
    this.previewDetail = detail;
    this.projects = [
      {
        id: 'preview-platform-refresh',
        name: 'Platform Refresh',
        description: 'Modernization initiative across API and SPA.',
        ownerUserId: 'user-1',
        createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
        createdByUserId: 'user-1',
        createdByUserName: 'Ava Mitchell',
        lastModifiedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        lastModifiedByUserId: 'user-2',
        lastModifiedByUserName: 'Liam Carter'
      },
      {
        id: 'preview-mobile-portal',
        name: 'Mobile Portal',
        description: 'Self-service mobile workspace for project collaborators.',
        ownerUserId: 'user-3',
        createdAt: new Date(Date.now() - 36 * 24 * 60 * 60 * 1000).toISOString(),
        createdByUserId: 'user-3',
        createdByUserName: 'Noah Sanders',
        lastModifiedAt: new Date(Date.now() - 7 * 60 * 60 * 1000).toISOString(),
        lastModifiedByUserId: 'user-3',
        lastModifiedByUserName: 'Noah Sanders'
      }
    ];

    this.selectedProjectId = this.projects[0]?.id ?? null;
    this.isLoadingProjects = false;

    if (this.selectedProjectId) {
      this.loadTasks(this.selectedProjectId);
    }
  }

  private buildPreviewTasks(projectId: string): TaskItemDto[] {
    const now = new Date();
    const currentUserId = this.currentUserId ?? 'debug-user';
    const currentUserName = this.resolveCurrentUserName();

    return [
      {
        id: `${projectId}-task-1`,
        title: 'Finalize dashboard widgets',
        description: 'Align KPI visuals and loading placeholders with design system.',
        status: TaskStatus.InProgress,
        dueDate: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString(),
        projectId,
        projectName: this.selectedProject?.name ?? 'Preview Project',
        assignedUserId: currentUserId,
        assignedUserName: currentUserName,
        createdAt: new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000).toISOString(),
        createdByUserId: 'user-1',
        createdByUserName: 'Ava Mitchell',
        lastModifiedAt: new Date(now.getTime() - 4 * 60 * 60 * 1000).toISOString(),
        lastModifiedByUserId: currentUserId,
        lastModifiedByUserName: currentUserName
      },
      {
        id: `${projectId}-task-2`,
        title: 'Review auth callback edge cases',
        description: 'Verify state mismatch handling and user-friendly error surfaces.',
        status: TaskStatus.Todo,
        dueDate: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString(),
        projectId,
        projectName: this.selectedProject?.name ?? 'Preview Project',
        assignedUserId: null,
        assignedUserName: 'Unassigned',
        createdAt: new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000).toISOString(),
        createdByUserId: 'user-2',
        createdByUserName: 'Liam Carter',
        lastModifiedAt: new Date(now.getTime() - 7 * 60 * 60 * 1000).toISOString(),
        lastModifiedByUserId: 'user-2',
        lastModifiedByUserName: 'Liam Carter'
      },
      {
        id: `${projectId}-task-3`,
        title: 'Polish Kanban task interactions',
        description: 'Improve drag/drop affordance and maintain smooth mobile behavior.',
        status: TaskStatus.Done,
        dueDate: new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString(),
        projectId,
        projectName: this.selectedProject?.name ?? 'Preview Project',
        assignedUserId: 'user-4',
        assignedUserName: 'Mia Foster',
        createdAt: new Date(now.getTime() - 12 * 24 * 60 * 60 * 1000).toISOString(),
        createdByUserId: 'user-4',
        createdByUserName: 'Mia Foster',
        lastModifiedAt: new Date(now.getTime() - 26 * 60 * 60 * 1000).toISOString(),
        lastModifiedByUserId: 'user-4',
        lastModifiedByUserName: 'Mia Foster'
      }
    ];
  }
}
