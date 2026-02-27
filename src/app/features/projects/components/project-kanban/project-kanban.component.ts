import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ConfirmationService, Message, MessageService } from 'primeng/api';
import { DialogModule } from 'primeng/dialog';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { Subject, forkJoin, of, takeUntil } from 'rxjs';
import { SharedModule } from '../../../../shared/shared.module';
import { AdminUsersApiClient } from '../../../../core/api/clients/admin-users-api.client';
import { ProjectsApiClient } from '../../../../core/api/clients/projects-api.client';
import { TaskItemsApiClient } from '../../../../core/api/clients/task-items-api.client';
import { ProjectDto } from '../../../../core/api/models/project.model';
import { CreateTaskItemRequest, PatchTaskItemRequest, TaskItemDto } from '../../../../core/api/models/task-item.model';
import { TaskStatus } from '../../../../core/api/models/task-status.enum';
import { UserSummaryDto } from '../../../../core/api/models/user.model';
import { AppRole, MANAGEMENT_ROLES } from '../../../../core/auth/models/app-role.model';
import { AuthService } from '../../../../core/auth/services/auth.service';
import { APP_ENVIRONMENT } from '../../../../core/config/app-environment.token';
import { AppPreferencesService } from '../../../../core/preferences/app-preferences.service';

interface KanbanColumn {
  status: TaskStatus;
  label: string;
}

interface AssigneeOption {
  label: string;
  value: string | null;
}

interface TaskLocation {
  status: TaskStatus;
  index: number;
}

interface StatusOption {
  label: string;
  value: TaskStatus;
}

interface TaskFormModel {
  title: string;
  description: string;
  status: TaskStatus;
  assignedUserId: string | null;
  dueDate: Date | null;
}

@Component({
  selector: 'app-project-kanban',
  standalone: true,
  imports: [CommonModule, SharedModule, DialogModule, InputTextareaModule],
  templateUrl: './project-kanban.component.html',
  styleUrl: './project-kanban.component.scss'
})
export class ProjectKanbanComponent implements OnInit, OnDestroy {
  private static readonly PROJECT_SELECTION_CONTEXT = 'kanban';
  private static readonly ASSIGNEE_PAGE_SIZE = 500;
  private readonly projectsApiClient = inject(ProjectsApiClient);
  private readonly adminUsersApiClient = inject(AdminUsersApiClient);
  private readonly taskItemsApiClient = inject(TaskItemsApiClient);
  private readonly activatedRoute = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly messageService = inject(MessageService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly authService = inject(AuthService);
  private readonly appEnvironment = inject(APP_ENVIRONMENT);
  private readonly preferencesService = inject(AppPreferencesService);
  private readonly destroy$ = new Subject<void>();

  readonly columns: KanbanColumn[] = [
    { status: TaskStatus.Todo, label: 'To Do' },
    { status: TaskStatus.InProgress, label: 'In Progress' },
    { status: TaskStatus.Done, label: 'Done' }
  ];

  readonly statusOptions: StatusOption[] = [
    { label: 'To Do', value: TaskStatus.Todo },
    { label: 'In Progress', value: TaskStatus.InProgress },
    { label: 'Done', value: TaskStatus.Done }
  ];

  projects: ProjectDto[] = [];
  selectedProjectId: string | null = null;
  assigneeOptions: AssigneeOption[] = [{ label: 'Unassigned', value: null }];

  isLoadingProjects = true;
  isLoadingTasks = false;
  isPreviewMode = false;
  previewDetail: string | null = null;
  errors: Message[] = [];

  isEditDialogVisible = false;
  isCreateDialogVisible = false;
  isSavingTask = false;
  editTaskId: string | null = null;

  taskForm: TaskFormModel = {
    title: '',
    description: '',
    status: TaskStatus.Todo,
    assignedUserId: null,
    dueDate: null
  };

  private allTasks: TaskItemDto[] = [];
  private dueDateModels = new Map<string, Date | null>();
  private pendingTaskIds = new Set<string>();
  private draggedTaskId: string | null = null;
  private draggedTaskSnapshot: TaskItemDto | null = null;
  private dragImageElement: HTMLElement | null = null;
  private draggedFromStatus: TaskStatus | null = null;
  private draggedFromIndex: number | null = null;
  private dropTargetStatus: TaskStatus | null = null;
  private dropTargetIndex: number | null = null;

  readonly columnTasks: Record<TaskStatus, TaskItemDto[]> = {
    [TaskStatus.Todo]: [],
    [TaskStatus.InProgress]: [],
    [TaskStatus.Done]: []
  };

  get selectedProject(): ProjectDto | null {
    return this.projects.find((project) => project.id === this.selectedProjectId) ?? null;
  }

  get selectedProjectTaskCount(): number {
    return this.allTasks.length;
  }

  get selectedProjectIndex(): number {
    if (!this.selectedProjectId) {
      return -1;
    }

    return this.projects.findIndex((project) => project.id === this.selectedProjectId);
  }

  get canSelectPreviousProject(): boolean {
    return this.selectedProjectIndex > 0;
  }

  get canSelectNextProject(): boolean {
    return this.selectedProjectIndex >= 0 && this.selectedProjectIndex < this.projects.length - 1;
  }

  get currentUserId(): string | null {
    return this.authService.currentUserId();
  }

  get canManageAllTasks(): boolean {
    return this.authService.hasAnyRole([...MANAGEMENT_ROLES]);
  }

  get editTaskAudit(): TaskItemDto | null {
    if (!this.editTaskId) {
      return null;
    }

    return this.findTaskById(this.editTaskId) ?? null;
  }

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

  selectPreviousProject(): void {
    if (!this.canSelectPreviousProject) {
      return;
    }

    const previousProject = this.projects[this.selectedProjectIndex - 1];
    this.onProjectSelected(previousProject.id);
  }

  selectNextProject(): void {
    if (!this.canSelectNextProject) {
      return;
    }

    const nextProject = this.projects[this.selectedProjectIndex + 1];
    this.onProjectSelected(nextProject.id);
  }

  openCreateTask(status: TaskStatus): void {
    if (!this.selectedProjectId) {
      return;
    }

    this.taskForm = {
      title: '',
      description: '',
      status,
      assignedUserId: null,
      dueDate: null
    };

    this.editTaskId = null;
    this.isCreateDialogVisible = true;
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
      assignedUserId: task.assignedUserId ?? null,
      dueDate: this.getDueDateModel(task.id)
    };

    this.isEditDialogVisible = true;
  }

  closeTaskDialogs(): void {
    this.isEditDialogVisible = false;
    this.isCreateDialogVisible = false;
    this.isSavingTask = false;
    this.editTaskId = null;
  }

  saveCreateTask(): void {
    const title = this.taskForm.title.trim();
    if (!title || !this.selectedProjectId || this.isSavingTask) {
      return;
    }

    const request: CreateTaskItemRequest = {
      projectId: this.selectedProjectId,
      title,
      description: this.taskForm.description.trim() || null,
      status: this.taskForm.status,
      dueDate: this.taskForm.dueDate ? this.taskForm.dueDate.toISOString() : null,
      assignedUserId: this.taskForm.assignedUserId
    };

    if (this.isPreviewMode) {
      const now = new Date().toISOString();
      const localTask: TaskItemDto = {
        id: `preview-${Math.random().toString(36).slice(2, 10)}`,
        title: request.title,
        description: request.description,
        status: request.status ?? TaskStatus.Todo,
        dueDate: request.dueDate,
        projectId: this.selectedProjectId,
        projectName: this.selectedProject?.name ?? 'Preview Project',
        assignedUserId: request.assignedUserId,
        assignedUserName: this.resolveAssigneeName(request.assignedUserId ?? null),
        createdAt: now,
        createdByUserId: 'debug-user',
        createdByUserName: 'Debug User',
        lastModifiedAt: now,
        lastModifiedByUserId: 'debug-user',
        lastModifiedByUserName: 'Debug User'
      };

      this.setAllTasks([...this.allTasks, localTask]);
      this.closeTaskDialogs();
      this.messageService.add({ severity: 'success', summary: 'Created', detail: 'Task created in preview mode.' });
      return;
    }

    this.isSavingTask = true;
    this.taskItemsApiClient
      .create(request)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (createdTask) => {
          this.setAllTasks([...this.allTasks, createdTask]);
          this.closeTaskDialogs();
          this.messageService.add({ severity: 'success', summary: 'Created', detail: 'Task created successfully.' });
        },
        error: () => {
          this.isSavingTask = false;
        }
      });
  }

  saveEditTask(): void {
    const taskId = this.editTaskId;
    const title = this.taskForm.title.trim();

    if (!taskId || !title || this.isSavingTask) {
      return;
    }

    const task = this.findTaskById(taskId);
    if (!task) {
      return;
    }

    const dueDate = this.taskForm.dueDate ? this.taskForm.dueDate.toISOString() : null;
    const description = this.taskForm.description.trim() || null;
    const assignedUserId = this.taskForm.assignedUserId;
    const status = this.taskForm.status;

    if (this.isPreviewMode) {
      this.applyTaskUpdateLocal(taskId, {
        title,
        description,
        status,
        assignedUserId,
        dueDate
      });
      this.closeTaskDialogs();
      this.messageService.add({ severity: 'success', summary: 'Updated', detail: 'Task updated in preview mode.' });
      return;
    }

    this.isSavingTask = true;
    const payload: PatchTaskItemRequest = {
      title,
      description,
      status,
      assignedUserId,
      dueDate
    };

    this.taskItemsApiClient
      .patch(taskId, payload)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updatedTask) => {
          this.replaceTask(updatedTask);
          this.closeTaskDialogs();
          this.messageService.add({ severity: 'success', summary: 'Updated', detail: 'Task updated successfully.' });
        },
        error: () => {
          this.isSavingTask = false;
        }
      });
  }

  isAssignedToMe(task: TaskItemDto): boolean {
    return !!this.currentUserId && task.assignedUserId === this.currentUserId;
  }

  canEditTask(task: TaskItemDto): boolean {
    return this.canManageAllTasks || this.isAssignedToMe(task);
  }

  canDeleteTask(task: TaskItemDto): boolean {
    return this.canManageAllTasks || this.isAssignedToMe(task);
  }

  deleteTask(task: TaskItemDto): void {
    if (!this.canDeleteTask(task) || this.isTaskPending(task.id)) {
      return;
    }

    this.confirmationService.confirm({
      header: 'Delete Task',
      message: `Delete task "${task.title}"? This action cannot be undone.`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Delete',
      rejectLabel: 'Cancel',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        const previousTasksSnapshot = this.allTasks.map((entry) => ({ ...entry }));
        this.pendingTaskIds.add(task.id);
        this.setAllTasks(this.allTasks.filter((entry) => entry.id !== task.id));

        if (this.isPreviewMode) {
          this.pendingTaskIds.delete(task.id);
          this.messageService.add({ severity: 'success', summary: 'Deleted', detail: 'Task deleted in preview mode.' });
          return;
        }

        this.taskItemsApiClient
          .delete(task.id)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              this.pendingTaskIds.delete(task.id);
              this.messageService.add({ severity: 'success', summary: 'Deleted', detail: 'Task deleted successfully.' });
            },
            error: () => {
              this.pendingTaskIds.delete(task.id);
              this.setAllTasks(previousTasksSnapshot);
              this.messageService.add({ severity: 'error', summary: 'Delete failed', detail: 'Could not delete task.' });
            }
          });
      }
    });
  }

  getTasksByStatus(status: TaskStatus): TaskItemDto[] {
    return this.columnTasks[status];
  }

  getColumnTaskCount(status: TaskStatus): number {
    return this.columnTasks[status].length;
  }

  getColumnIcon(status: TaskStatus): string {
    switch (status) {
      case TaskStatus.Todo:
        return 'pi pi-list';
      case TaskStatus.InProgress:
        return 'pi pi-bolt';
      case TaskStatus.Done:
        return 'pi pi-check-circle';
      default:
        return 'pi pi-circle';
    }
  }

  getColumnToneClass(status: TaskStatus): string {
    switch (status) {
      case TaskStatus.Todo:
        return 'column-header--todo';
      case TaskStatus.InProgress:
        return 'column-header--progress';
      case TaskStatus.Done:
        return 'column-header--done';
      default:
        return '';
    }
  }

  getColumnSubtitle(status: TaskStatus): string {
    const count = this.getColumnTaskCount(status);
    const noun = count === 1 ? 'task' : 'tasks';

    if (this.selectedProjectTaskCount === 0) {
      return `No ${noun} yet`;
    }

    const ratio = Math.round((count / this.selectedProjectTaskCount) * 100);
    return `${count} ${noun} · ${ratio}%`;
  }

  trackByTaskId(_: number, task: TaskItemDto): string {
    return task.id;
  }

  isTaskPending(taskId: string): boolean {
    return this.pendingTaskIds.has(taskId);
  }

  isDraggingTask(taskId: string): boolean {
    return this.draggedTaskId === taskId;
  }

  isDropSlotActive(status: TaskStatus, index: number): boolean {
    return this.dropTargetStatus === status && this.dropTargetIndex === index;
  }

  get draggedTaskPreview(): TaskItemDto | null {
    return this.draggedTaskSnapshot;
  }

  onDragStart(task: TaskItemDto, status?: TaskStatus, index?: number, event?: DragEvent): void {
    if (this.isTaskPending(task.id)) {
      return;
    }

    const location = status !== undefined && index !== undefined ? { status, index } : this.findTaskLocation(task.id);
    if (!location) {
      return;
    }

    this.draggedTaskId = task.id;
    this.draggedTaskSnapshot = { ...task };
    this.draggedFromStatus = location.status;
    this.draggedFromIndex = location.index;

    if (event?.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', task.id);

      const dragSource = event.currentTarget;
      if (dragSource instanceof HTMLElement) {
        this.attachCustomDragImage(event, dragSource);
      }
    }
  }

  onDragEnd(): void {
    this.resetDragState();
  }

  onDrop(newStatus: TaskStatus): void {
    const endIndex = this.getTasksByStatus(newStatus).length;
    this.onDropAt(newStatus, endIndex);
  }

  onDropSlotDragOver(status: TaskStatus, index: number, event: DragEvent): void {
    if (!this.draggedTaskId) {
      return;
    }

    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }

    this.dropTargetStatus = status;
    this.dropTargetIndex = index;
  }

  onTaskDragOver(status: TaskStatus, taskIndex: number, event: DragEvent): void {
    if (!this.draggedTaskId) {
      return;
    }

    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }

    const target = event.currentTarget as HTMLElement | null;
    if (!target) {
      return;
    }

    const rect = target.getBoundingClientRect();
    const midpointY = rect.top + rect.height / 2;
    const pointerY = event.clientY;
    const insertionIndex = pointerY < midpointY ? taskIndex : taskIndex + 1;

    this.dropTargetStatus = status;
    this.dropTargetIndex = insertionIndex;
  }

  onDropAt(status: TaskStatus, index: number, event?: DragEvent): void {
    if (event) {
      event.preventDefault();
    }

    if (!this.draggedTaskId || this.isTaskPending(this.draggedTaskId)) {
      this.resetDragState();
      return;
    }

    const taskId = this.draggedTaskId;
    const previousTasksSnapshot = this.allTasks.map((task) => ({ ...task }));

    const moveResult = this.moveTaskLocally(taskId, status, index);
    this.resetDragState();

    if (!moveResult.moved || this.isPreviewMode || !moveResult.statusChanged) {
      return;
    }

    this.pendingTaskIds.add(taskId);
    this.taskItemsApiClient
      .patch(taskId, { status })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updatedTask) => {
          this.replaceTask(updatedTask);
          this.pendingTaskIds.delete(taskId);
          this.messageService.add({ severity: 'success', summary: 'Updated', detail: 'Task status updated.' });
        },
        error: () => {
          this.setAllTasks(previousTasksSnapshot);
          this.pendingTaskIds.delete(taskId);
          this.messageService.add({ severity: 'error', summary: 'Update failed', detail: 'Could not update task status.' });
        }
      });
  }

  onAssigneeChanged(task: TaskItemDto, assignedUserId: string | null): void {
    if (this.isPreviewMode) {
      this.applyTaskUpdateLocal(task.id, {
        title: task.title,
        description: task.description ?? null,
        status: task.status,
        assignedUserId,
        dueDate: task.dueDate ?? null
      });
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
    const dueDate = value ? value.toISOString() : null;

    if (this.isPreviewMode) {
      this.applyTaskUpdateLocal(task.id, {
        title: task.title,
        description: task.description ?? null,
        status: task.status,
        assignedUserId: task.assignedUserId ?? null,
        dueDate
      });
      return;
    }

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

  getDueDateModel(taskId: string): Date | null {
    return this.dueDateModels.get(taskId) ?? null;
  }

  private loadProjects(): void {
    this.isLoadingProjects = true;
    this.isPreviewMode = false;
    this.previewDetail = null;
    this.errors = [];

    if (this.shouldUsePreviewMode()) {
      this.loadPreviewBoard('Development preview mode active. Backend calls are disabled for Kanban.');
      return;
    }

    this.projectsApiClient
      .getProjects({ page: 1, pageSize: 200 })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (projects) => {
          if (projects.length === 0) {
            this.projects = [];
            this.selectedProjectId = null;
            this.clearTasks();
            this.isLoadingProjects = false;
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
      const rememberedProjectId = this.preferencesService.getLastSelectedProject(ProjectKanbanComponent.PROJECT_SELECTION_CONTEXT);
      const hasRememberedProject = !!rememberedProjectId && this.projects.some((project) => project.id === rememberedProjectId);
      const resolvedProjectId = hasQueryProject
        ? queryProjectId
        : hasRememberedProject
          ? rememberedProjectId
          : this.projects[0].id;

      if (!hasQueryProject && queryProjectId !== resolvedProjectId) {
        this.updateProjectQueryParam(resolvedProjectId);
        return;
      }

      if (resolvedProjectId !== this.selectedProjectId) {
        this.selectedProjectId = resolvedProjectId;
        this.preferencesService.setLastSelectedProject(ProjectKanbanComponent.PROJECT_SELECTION_CONTEXT, resolvedProjectId);
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
    this.previewDetail = null;
    this.errors = [];
    this.clearTasks();

    forkJoin({
      tasks: this.taskItemsApiClient.getTasks({ projectId, page: 1, pageSize: 500 }),
      members: this.projectsApiClient.getMembers(projectId),
      assignableUsers: this.authService.hasAnyRole([AppRole.Administrator, AppRole.ProjectManager])
        ? this.adminUsersApiClient.getUsers({ role: AppRole.User, page: 1, pageSize: ProjectKanbanComponent.ASSIGNEE_PAGE_SIZE })
        : of(null)
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: ({ tasks, members, assignableUsers }) => {
          this.assigneeOptions = this.buildAssigneeOptions(members, assignableUsers?.items ?? []);
          this.setAllTasks(this.normalizeTasksOrder(tasks));
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

  private buildAssigneeOptions(
    members: Array<{ userId: string; displayName: string }>,
    assignableUsers: UserSummaryDto[]
  ): AssigneeOption[] {
    const options = new Map<string, AssigneeOption>();
    const canManageAssignments = this.canManageAllTasks;
    const assignableUserIds = new Set(assignableUsers.map((user) => user.id));

    for (const member of members) {
      if (canManageAssignments && !assignableUserIds.has(member.userId)) {
        continue;
      }

      if (!options.has(member.userId)) {
        options.set(member.userId, { label: member.displayName, value: member.userId });
      }
    }

    for (const user of assignableUsers) {
      if (!this.isAssignableUserRole(user)) {
        continue;
      }

      const label = this.resolveUserDisplayLabel(user);
      if (!options.has(user.id)) {
        options.set(user.id, { label, value: user.id });
      }
    }

    const sortedOptions = Array.from(options.values()).sort((a, b) => a.label.localeCompare(b.label));
    if (this.canManageAllTasks) {
      return [{ label: 'Unassigned', value: null }, ...sortedOptions];
    }

    const currentUserOption = this.buildCurrentUserAssigneeOption(sortedOptions);
    return currentUserOption
      ? [{ label: 'Unassigned', value: null }, currentUserOption]
      : [{ label: 'Unassigned', value: null }];
  }

  private isAssignableUserRole(user: UserSummaryDto): boolean {
    const roles = user.roles ?? [];
    const isProjectManager = roles.includes(AppRole.ProjectManager);
    return !isProjectManager;
  }

  private resolveUserDisplayLabel(user: UserSummaryDto): string {
    const displayName = user.displayName?.trim();
    if (displayName) {
      return displayName;
    }

    const email = user.email?.trim();
    if (email) {
      return email;
    }

    const userName = user.userName?.trim();
    if (userName) {
      return userName;
    }

    return user.id;
  }

  private buildCurrentUserAssigneeOption(options: AssigneeOption[]): AssigneeOption | null {
    const currentUserId = this.currentUserId;
    if (!currentUserId) {
      return null;
    }

    const existingOption = options.find((option) => option.value === currentUserId);
    if (existingOption) {
      return existingOption;
    }

    const claims = this.authService.userClaims();
    const name = claims['name'];
    const preferredUserName = claims['preferred_username'];
    const email = claims['email'];
    const label = typeof name === 'string' && name.trim().length > 0
      ? name
      : typeof preferredUserName === 'string' && preferredUserName.trim().length > 0
        ? preferredUserName
        : typeof email === 'string' && email.trim().length > 0
          ? email
          : 'Current User';

    return { label, value: currentUserId };
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
    this.setAllTasks(this.allTasks.map((task) => (task.id === updatedTask.id ? this.normalizeAssigneeDisplay(updatedTask) : task)));
  }

  private moveTaskLocally(taskId: string, targetStatus: TaskStatus, targetIndex: number): { moved: boolean; statusChanged: boolean } {
    const columns = this.createColumnsMapFromTasks(this.allTasks);
    const sourceLocation = this.findTaskLocation(taskId);

    if (!sourceLocation) {
      return { moved: false, statusChanged: false };
    }

    const sourceColumnTasks = columns[sourceLocation.status];
    const targetColumnTasks = columns[targetStatus];
    const [movedTask] = sourceColumnTasks.splice(sourceLocation.index, 1);

    if (!movedTask) {
      return { moved: false, statusChanged: false };
    }

    let insertionIndex = Math.max(0, Math.min(targetIndex, targetColumnTasks.length));
    if (sourceLocation.status === targetStatus && sourceLocation.index < insertionIndex) {
      insertionIndex -= 1;
    }

    const statusChanged = sourceLocation.status !== targetStatus;
    movedTask.status = targetStatus;
    targetColumnTasks.splice(insertionIndex, 0, movedTask);

    const moved = statusChanged || sourceLocation.index !== insertionIndex;
    this.setAllTasks(this.flattenColumns(columns));

    return { moved, statusChanged };
  }

  private findTaskLocation(taskId: string): TaskLocation | null {
    const columns = this.createColumnsMapFromTasks(this.allTasks);

    for (const status of [TaskStatus.Todo, TaskStatus.InProgress, TaskStatus.Done]) {
      const taskIndex = columns[status].findIndex((task) => task.id === taskId);
      if (taskIndex >= 0) {
        return { status, index: taskIndex };
      }
    }

    return null;
  }

  private findTaskById(taskId: string): TaskItemDto | undefined {
    return this.allTasks.find((task) => task.id === taskId);
  }

  private clearTasks(): void {
    this.setAllTasks([]);
    this.pendingTaskIds.clear();
    this.assigneeOptions = [{ label: 'Unassigned', value: null }];
    this.resetDragState();
  }

  private resetDragState(): void {
    this.draggedTaskId = null;
    this.draggedTaskSnapshot = null;
    this.detachCustomDragImage();
    this.draggedFromStatus = null;
    this.draggedFromIndex = null;
    this.dropTargetStatus = null;
    this.dropTargetIndex = null;
  }

  private applyTaskUpdateLocal(
    taskId: string,
    update: {
      title: string;
      description: string | null;
      status: TaskStatus;
      assignedUserId: string | null;
      dueDate: string | null;
    }
  ): void {
    const existingTask = this.findTaskById(taskId);
    if (!existingTask) {
      return;
    }

    const updatedTask: TaskItemDto = {
      ...existingTask,
      title: update.title,
      description: update.description,
      status: update.status,
      assignedUserId: update.assignedUserId,
      assignedUserName: this.resolveAssigneeName(update.assignedUserId),
      dueDate: update.dueDate,
      lastModifiedAt: new Date().toISOString(),
      lastModifiedByUserName: this.isPreviewMode ? 'Debug User' : existingTask.lastModifiedByUserName
    };

    if (existingTask.status === update.status) {
      this.replaceTask(updatedTask);
      return;
    }

    const filtered = this.allTasks.filter((task) => task.id !== taskId);
    const columns = this.createColumnsMapFromTasks(filtered);
    columns[update.status].push(updatedTask);
    this.setAllTasks(this.flattenColumns(columns));
  }

  private resolveAssigneeName(assignedUserId: string | null): string {
    if (!assignedUserId) {
      return 'Unassigned';
    }

    return this.assigneeOptions.find((option) => option.value === assignedUserId)?.label ?? 'Unknown User';
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
    this.previewDetail = detail;
    this.errors = [];
    this.assigneeOptions = [
      { label: 'Unassigned', value: null },
      { label: 'Debug User', value: 'debug-user' },
      { label: 'Alex Contributor', value: 'user-2' }
    ];
    this.setAllTasks(this.createPreviewTasks(projectId));
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
        assignedUserId: 'user-2',
        assignedUserName: 'Alex Contributor',
        createdAt: now,
        createdByUserId: 'debug-user',
        createdByUserName: 'Debug User',
        lastModifiedAt: now,
        lastModifiedByUserId: 'debug-user',
        lastModifiedByUserName: 'Debug User'
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
    return this.authService.authSession()?.isDebugSession === true && this.authService.canStartDebugSession();
  }

  private normalizeTasksOrder(tasks: TaskItemDto[]): TaskItemDto[] {
    return this.flattenColumns(this.createColumnsMapFromTasks(tasks));
  }

  private createColumnsMapFromTasks(tasks: TaskItemDto[]): Record<TaskStatus, TaskItemDto[]> {
    const columns: Record<TaskStatus, TaskItemDto[]> = {
      [TaskStatus.Todo]: [],
      [TaskStatus.InProgress]: [],
      [TaskStatus.Done]: []
    };

    for (const task of tasks) {
      if (task.status === TaskStatus.Todo || task.status === TaskStatus.InProgress || task.status === TaskStatus.Done) {
        columns[task.status].push(task);
      }
    }

    if (this.preferencesService.preferences().kanbanSwimlanePreference === 'assignee') {
      columns[TaskStatus.Todo] = this.sortKanbanTasksByAssignee(columns[TaskStatus.Todo]);
      columns[TaskStatus.InProgress] = this.sortKanbanTasksByAssignee(columns[TaskStatus.InProgress]);
      columns[TaskStatus.Done] = this.sortKanbanTasksByAssignee(columns[TaskStatus.Done]);
    }

    return columns;
  }

  private flattenColumns(columns: Record<TaskStatus, TaskItemDto[]>): TaskItemDto[] {
    return [...columns[TaskStatus.Todo], ...columns[TaskStatus.InProgress], ...columns[TaskStatus.Done]];
  }

  private setAllTasks(tasks: TaskItemDto[]): void {
    const normalizedTasks = tasks.map((task) => this.normalizeAssigneeDisplay(task));
    this.allTasks = normalizedTasks;
    this.columnTasks[TaskStatus.Todo] = normalizedTasks.filter((task) => task.status === TaskStatus.Todo);
    this.columnTasks[TaskStatus.InProgress] = normalizedTasks.filter((task) => task.status === TaskStatus.InProgress);
    this.columnTasks[TaskStatus.Done] = normalizedTasks.filter((task) => task.status === TaskStatus.Done);

    const dueDates = new Map<string, Date | null>();
    for (const task of normalizedTasks) {
      dueDates.set(task.id, task.dueDate ? new Date(task.dueDate) : null);
    }
    this.dueDateModels = dueDates;
  }

  private normalizeAssigneeDisplay(task: TaskItemDto): TaskItemDto {
    if (!task.assignedUserId) {
      return { ...task, assignedUserName: 'Unassigned' };
    }

    if (task.assignedUserName && task.assignedUserName.trim().length > 0) {
      return task;
    }

    return { ...task, assignedUserName: this.resolveAssigneeName(task.assignedUserId) };
  }

  private attachCustomDragImage(event: DragEvent, dragSource: HTMLElement): void {
    this.detachCustomDragImage();

    const clone = dragSource.cloneNode(true) as HTMLElement;
    clone.style.position = 'fixed';
    clone.style.top = '-9999px';
    clone.style.left = '-9999px';
    clone.style.width = `${dragSource.offsetWidth}px`;
    clone.style.maxWidth = `${dragSource.offsetWidth}px`;
    clone.style.borderRadius = '10px';
    clone.style.overflow = 'hidden';
    clone.style.opacity = '0.92';
    clone.style.pointerEvents = 'none';
    clone.style.boxShadow = '0 10px 24px -12px rgba(0, 0, 0, 0.45)';
    clone.style.background = getComputedStyle(dragSource).backgroundColor;
    document.body.appendChild(clone);

    event.dataTransfer?.setDragImage(clone, 20, 20);
    this.dragImageElement = clone;
  }

  private sortKanbanTasksByAssignee(tasks: TaskItemDto[]): TaskItemDto[] {
    return [...tasks].sort((a, b) => {
      const aName = (a.assignedUserName ?? '').trim();
      const bName = (b.assignedUserName ?? '').trim();
      const aUnassigned = aName.length === 0 || aName.toLowerCase() === 'unassigned';
      const bUnassigned = bName.length === 0 || bName.toLowerCase() === 'unassigned';

      if (aUnassigned !== bUnassigned) {
        return aUnassigned ? 1 : -1;
      }

      const nameDiff = aName.localeCompare(bName);
      if (nameDiff !== 0) {
        return nameDiff;
      }

      return new Date(b.lastModifiedAt).getTime() - new Date(a.lastModifiedAt).getTime();
    });
  }

  private detachCustomDragImage(): void {
    if (!this.dragImageElement) {
      return;
    }

    this.dragImageElement.remove();
    this.dragImageElement = null;
  }
}
