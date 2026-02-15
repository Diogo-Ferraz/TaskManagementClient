import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Message, MessageService } from 'primeng/api';
import { Subject, forkJoin, takeUntil } from 'rxjs';
import { SharedModule } from '../../../../shared/shared.module';
import { ProjectsApiClient } from '../../../../core/api/clients/projects-api.client';
import { TaskItemsApiClient } from '../../../../core/api/clients/task-items-api.client';
import { ProjectDto } from '../../../../core/api/models/project.model';
import { PatchTaskItemRequest, TaskItemDto } from '../../../../core/api/models/task-item.model';
import { TaskStatus } from '../../../../core/api/models/task-status.enum';
import { AuthService } from '../../../../core/auth/services/auth.service';
import { APP_ENVIRONMENT } from '../../../../core/config/app-environment.token';

interface KanbanColumn {
  status: TaskStatus;
  label: string;
}

interface AssigneeOption {
  label: string;
  value: string | null;
}

@Component({
  selector: 'app-project-kanban',
  standalone: true,
  imports: [CommonModule, SharedModule],
  templateUrl: './project-kanban.component.html',
  styleUrl: './project-kanban.component.scss'
})
export class ProjectKanbanComponent implements OnInit, OnDestroy {
  private readonly projectsApiClient = inject(ProjectsApiClient);
  private readonly taskItemsApiClient = inject(TaskItemsApiClient);
  private readonly activatedRoute = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly messageService = inject(MessageService);
  private readonly authService = inject(AuthService);
  private readonly appEnvironment = inject(APP_ENVIRONMENT);
  private readonly destroy$ = new Subject<void>();

  readonly columns: KanbanColumn[] = [
    { status: TaskStatus.Todo, label: 'To Do' },
    { status: TaskStatus.InProgress, label: 'In Progress' },
    { status: TaskStatus.Done, label: 'Done' }
  ];

  projects: ProjectDto[] = [];
  selectedProjectId: string | null = null;
  assigneeOptions: AssigneeOption[] = [{ label: 'Unassigned', value: null }];

  isLoadingProjects = true;
  isLoadingTasks = false;
  isPreviewMode = false;
  errors: Message[] = [];

  private allTasks: TaskItemDto[] = [];
  private pendingTaskIds = new Set<string>();
  private draggedTaskId: string | null = null;

  ngOnInit(): void {
    this.loadProjects();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onProjectSelected(projectId: string | null): void {
    if (!projectId || projectId === this.selectedProjectId) {
      return;
    }

    this.updateProjectQueryParam(projectId);
  }

  getTasksByStatus(status: TaskStatus): TaskItemDto[] {
    return this.allTasks.filter((task) => task.status === status);
  }

  trackByTaskId(_: number, task: TaskItemDto): string {
    return task.id;
  }

  isTaskPending(taskId: string): boolean {
    return this.pendingTaskIds.has(taskId);
  }

  onDragStart(task: TaskItemDto): void {
    if (this.isTaskPending(task.id)) {
      return;
    }

    this.draggedTaskId = task.id;
  }

  onDragEnd(): void {
    this.draggedTaskId = null;
  }

  onDrop(newStatus: TaskStatus): void {
    if (this.isPreviewMode) {
      return;
    }

    if (!this.draggedTaskId) {
      return;
    }

    const task = this.findTaskById(this.draggedTaskId);
    if (!task) {
      this.draggedTaskId = null;
      return;
    }

    if (task.status === newStatus || this.isTaskPending(task.id)) {
      this.draggedTaskId = null;
      return;
    }

    this.draggedTaskId = null;
    this.patchTaskWithOptimisticUpdate(
      task,
      { status: newStatus },
      (draft) => {
        draft.status = newStatus;
      },
      'Task status updated.',
      'Could not update task status.'
    );
  }

  onAssigneeChanged(task: TaskItemDto, assignedUserId: string | null): void {
    if (this.isPreviewMode) {
      return;
    }

    if (this.isTaskPending(task.id) || task.assignedUserId === assignedUserId) {
      return;
    }

    const selectedOption = this.assigneeOptions.find((option) => option.value === assignedUserId);

    this.patchTaskWithOptimisticUpdate(
      task,
      { assignedUserId },
      (draft) => {
        draft.assignedUserId = assignedUserId;
        draft.assignedUserName = selectedOption?.label ?? 'Unassigned';
      },
      'Task assignee updated.',
      'Could not update task assignee.'
    );
  }

  onDueDateChanged(task: TaskItemDto, value: Date | null): void {
    if (this.isPreviewMode) {
      return;
    }

    const dueDate = value ? value.toISOString() : null;

    if (this.isTaskPending(task.id) || task.dueDate === dueDate) {
      return;
    }

    this.patchTaskWithOptimisticUpdate(
      task,
      { dueDate },
      (draft) => {
        draft.dueDate = dueDate;
      },
      'Task due date updated.',
      'Could not update task due date.'
    );
  }

  clearDueDate(task: TaskItemDto): void {
    this.onDueDateChanged(task, null);
  }

  toDate(value?: string | null): Date | null {
    return value ? new Date(value) : null;
  }

  private loadProjects(): void {
    this.isLoadingProjects = true;
    this.isPreviewMode = false;
    this.errors = [];

    if (!this.appEnvironment.production || this.authService.authSession()?.isDebugSession) {
      this.loadPreviewBoard('Development preview mode active. Backend calls are disabled for Kanban.');
      return;
    }

    this.projectsApiClient
      .getProjects({ page: 1, pageSize: 200 })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (projects) => {
          if (projects.length === 0) {
            this.loadPreviewBoard('No projects were returned. Showing preview Kanban board.');
            return;
          }

          this.projects = projects;
          this.isLoadingProjects = false;
          this.observeProjectSelection();
        },
        error: () => {
          if (this.shouldUsePreviewMode()) {
            this.loadPreviewBoard('Backend unavailable. Showing preview Kanban board.');
            return;
          }

          this.isLoadingProjects = false;
          this.errors = [{ severity: 'error', summary: 'Error', detail: 'Could not load projects for Kanban board.' }];
        }
      });
  }

  private observeProjectSelection(): void {
    this.activatedRoute.queryParamMap.pipe(takeUntil(this.destroy$)).subscribe((queryParams) => {
      if (this.projects.length === 0) {
        this.selectedProjectId = null;
        this.clearTasks();
        return;
      }

      const queryProjectId = queryParams.get('projectId');
      const hasQueryProject = !!queryProjectId && this.projects.some((project) => project.id === queryProjectId);
      const resolvedProjectId = hasQueryProject ? queryProjectId : this.projects[0].id;

      if (!hasQueryProject && queryProjectId !== resolvedProjectId) {
        this.updateProjectQueryParam(resolvedProjectId);
        return;
      }

      if (resolvedProjectId !== this.selectedProjectId) {
        this.selectedProjectId = resolvedProjectId;
        this.loadProjectBoardData(resolvedProjectId);
      }
    });
  }

  private updateProjectQueryParam(projectId: string): void {
    void this.router.navigate([], {
      relativeTo: this.activatedRoute,
      queryParams: { projectId },
      queryParamsHandling: 'merge'
    });
  }

  private loadProjectBoardData(projectId: string): void {
    this.isLoadingTasks = true;
    this.isPreviewMode = false;
    this.errors = [];
    this.clearTasks();

    forkJoin({
      tasks: this.taskItemsApiClient.getTasks({ projectId, page: 1, pageSize: 500 }),
      members: this.projectsApiClient.getMembers(projectId)
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: ({ tasks, members }) => {
          this.allTasks = tasks;
          this.assigneeOptions = [
            { label: 'Unassigned', value: null },
            ...members.map((member) => ({ label: member.displayName, value: member.userId }))
          ];
          this.isLoadingTasks = false;
        },
        error: () => {
          if (this.shouldUsePreviewMode()) {
            this.loadPreviewTasks(projectId, 'Task data unavailable. Showing preview tasks.');
            return;
          }

          this.isLoadingTasks = false;
          this.errors = [{ severity: 'error', summary: 'Error', detail: 'Could not load tasks for selected project.' }];
        }
      });
  }

  private patchTaskWithOptimisticUpdate(
    task: TaskItemDto,
    payload: PatchTaskItemRequest,
    applyOptimisticUpdate: (draft: TaskItemDto) => void,
    successMessage: string,
    errorMessage: string
  ): void {
    const snapshot: TaskItemDto = { ...task };
    const optimisticDraft: TaskItemDto = { ...task };

    applyOptimisticUpdate(optimisticDraft);
    this.replaceTask(optimisticDraft);

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
          this.replaceTask(snapshot);
          this.pendingTaskIds.delete(task.id);
          this.messageService.add({ severity: 'error', summary: 'Update failed', detail: errorMessage });
        }
      });
  }

  private replaceTask(updatedTask: TaskItemDto): void {
    this.allTasks = this.allTasks.map((task) => (task.id === updatedTask.id ? updatedTask : task));
  }

  private findTaskById(taskId: string): TaskItemDto | undefined {
    return this.allTasks.find((task) => task.id === taskId);
  }

  private clearTasks(): void {
    this.allTasks = [];
    this.pendingTaskIds.clear();
    this.assigneeOptions = [{ label: 'Unassigned', value: null }];
  }

  private loadPreviewBoard(detail: string): void {
    const previewProject: ProjectDto = {
      id: 'preview-project',
      name: 'Preview Project',
      description: 'Preview board when backend is unavailable.',
      ownerUserId: 'debug-user',
      createdAt: new Date().toISOString(),
      createdByUserId: 'debug-user',
      createdByUserName: 'Debug User',
      lastModifiedAt: new Date().toISOString(),
      lastModifiedByUserId: 'debug-user',
      lastModifiedByUserName: 'Debug User'
    };

    this.projects = [previewProject];
    this.selectedProjectId = previewProject.id;
    this.loadPreviewTasks(previewProject.id, detail);
    this.isLoadingProjects = false;
  }

  private loadPreviewTasks(projectId: string, detail: string): void {
    this.isPreviewMode = true;
    this.errors = [{ severity: 'warn', summary: 'Preview mode', detail }];
    this.assigneeOptions = [
      { label: 'Unassigned', value: null },
      { label: 'Debug User', value: 'debug-user' },
      { label: 'Project Manager', value: 'pm-user' }
    ];
    this.allTasks = this.createPreviewTasks(projectId);
    this.pendingTaskIds.clear();
    this.isLoadingTasks = false;
  }

  private createPreviewTasks(projectId: string): TaskItemDto[] {
    const now = new Date().toISOString();

    return [
      {
        id: `${projectId}-todo-1`,
        title: 'Design board swimlanes',
        description: 'Finalize how tasks are segmented by status and owner.',
        status: TaskStatus.Todo,
        dueDate: null,
        projectId,
        projectName: 'Preview Project',
        assignedUserId: 'debug-user',
        assignedUserName: 'Debug User',
        createdAt: now,
        createdByUserId: 'debug-user',
        createdByUserName: 'Debug User',
        lastModifiedAt: now,
        lastModifiedByUserId: 'debug-user',
        lastModifiedByUserName: 'Debug User'
      },
      {
        id: `${projectId}-inprogress-1`,
        title: 'Implement SignalR integration',
        description: 'Connect live events into dashboard activity feed.',
        status: TaskStatus.InProgress,
        dueDate: now,
        projectId,
        projectName: 'Preview Project',
        assignedUserId: 'pm-user',
        assignedUserName: 'Project Manager',
        createdAt: now,
        createdByUserId: 'pm-user',
        createdByUserName: 'Project Manager',
        lastModifiedAt: now,
        lastModifiedByUserId: 'pm-user',
        lastModifiedByUserName: 'Project Manager'
      },
      {
        id: `${projectId}-done-1`,
        title: 'Refactor error placeholders',
        description: 'Add resilient loading and fallback UI states.',
        status: TaskStatus.Done,
        dueDate: now,
        projectId,
        projectName: 'Preview Project',
        assignedUserId: null,
        assignedUserName: 'Unassigned',
        createdAt: now,
        createdByUserId: 'debug-user',
        createdByUserName: 'Debug User',
        lastModifiedAt: now,
        lastModifiedByUserId: 'debug-user',
        lastModifiedByUserName: 'Debug User'
      }
    ];
  }

  private shouldUsePreviewMode(): boolean {
    return this.authService.authSession()?.isDebugSession === true || !this.appEnvironment.production;
  }
}
