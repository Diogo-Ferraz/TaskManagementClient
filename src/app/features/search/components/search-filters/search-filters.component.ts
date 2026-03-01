import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Message } from 'primeng/api';
import { Subject, forkJoin, of, takeUntil } from 'rxjs';
import { ProjectsApiClient } from '../../../../core/api/clients/projects-api.client';
import { TaskItemsApiClient } from '../../../../core/api/clients/task-items-api.client';
import { ProjectDto, ProjectMemberDto } from '../../../../core/api/models/project.model';
import { TaskItemDto } from '../../../../core/api/models/task-item.model';
import { TaskStatus } from '../../../../core/api/models/task-status.enum';
import { AuthService } from '../../../../core/auth/services/auth.service';
import { AppPreferencesService } from '../../../../core/preferences/app-preferences.service';
import { SharedModule } from '../../../../shared/shared.module';

type TaskStateFilter = 'all' | 'todo' | 'inProgress' | 'completed';
type TaskOwnershipFilter = 'all' | 'assigned' | 'unassigned';
type UserScopeFilter = 'all' | 'withoutTasks';
type TagSeverity = 'success' | 'secondary' | 'info' | 'warning' | 'danger' | 'contrast';

@Component({
  selector: 'app-search-filters',
  standalone: true,
  imports: [CommonModule, FormsModule, SharedModule],
  templateUrl: './search-filters.component.html',
  styleUrl: './search-filters.component.scss'
})
export class SearchFiltersComponent implements OnInit, OnDestroy {
  private readonly projectsApiClient = inject(ProjectsApiClient);
  private readonly taskItemsApiClient = inject(TaskItemsApiClient);
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly preferencesService = inject(AppPreferencesService);
  private readonly destroy$ = new Subject<void>();

  isLoading = true;
  errors: Message[] = [];

  projects: ProjectDto[] = [];
  projectMembers: ProjectMemberDto[] = [];
  allProjectMembers: ProjectMemberDto[] = [];
  allProjectTasksSnapshot: TaskItemDto[] = [];
  projectTasksSnapshot: TaskItemDto[] = [];
  queriedTasksSnapshot: TaskItemDto[] = [];
  selectedProjectId: string | null = null;
  selectedUserId: string | null = null;
  userScopeFilter: UserScopeFilter = 'all';

  userProjects: ProjectDto[] = [];
  userTasks: TaskItemDto[] = [];

  taskSearchTitle = '';
  projectSearchTitle = '';
  taskStateFilter: TaskStateFilter = 'all';
  taskOwnershipFilter: TaskOwnershipFilter = 'all';
  taskAssigneeUserId: string | null = null;
  taskCreatedByUserId: string | null = null;
  taskUpdatedByUserId: string | null = null;
  projectCreatedByUserId: string | null = null;
  projectUpdatedByUserId: string | null = null;
  pageSize = 10;
  page = 1;

  readonly taskOwnershipOptions = [
    { label: 'All in Project', value: 'all' as const },
    { label: 'Assigned', value: 'assigned' as const },
    { label: 'Unassigned', value: 'unassigned' as const }
  ];

  readonly taskStateOptions = [
    { label: 'All', value: 'all' as const },
    { label: 'To Do', value: 'todo' as const },
    { label: 'In Progress', value: 'inProgress' as const },
    { label: 'Complete', value: 'completed' as const }
  ];

  readonly pageSizeOptions = [10, 25, 50];
  readonly pageSizeSelectOptions = [
    { label: '10', value: 10 },
    { label: '25', value: 25 },
    { label: '50', value: 50 }
  ];
  readonly userScopeOptions = [
    { label: 'All Users', value: 'all' as const },
    { label: 'Users Without Tasks', value: 'withoutTasks' as const }
  ];

  readonly allProjectsOption = { id: null as string | null, name: 'All Projects' };

  ngOnInit(): void {
    this.applyPreferenceDefaults();
    this.loadInitialData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get pagedTasks(): TaskItemDto[] {
    const startIndex = (this.page - 1) * this.pageSize;
    return this.filteredTasks.slice(startIndex, startIndex + this.pageSize);
  }

  get filteredTasks(): TaskItemDto[] {
    let tasks = [...this.userTasks];

    if (this.taskStateFilter === 'todo') {
      tasks = tasks.filter((task) => task.status === TaskStatus.Todo);
    } else if (this.taskStateFilter === 'inProgress') {
      tasks = tasks.filter((task) => task.status === TaskStatus.InProgress);
    } else if (this.taskStateFilter === 'completed') {
      tasks = tasks.filter((task) => task.status === TaskStatus.Done);
    }

    if (this.taskCreatedByUserId) {
      tasks = tasks.filter((task) => task.createdByUserId === this.taskCreatedByUserId);
    }

    if (this.taskSearchTitle.trim().length > 0) {
      const term = this.taskSearchTitle.trim().toLowerCase();
      tasks = tasks.filter((task) => task.title.toLowerCase().includes(term));
    }

    return tasks;
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredTasks.length / this.pageSize));
  }

  get selectedProjectName(): string {
    if (!this.selectedProjectId) {
      return 'All Projects';
    }

    return this.projects.find((project) => project.id === this.selectedProjectId)?.name ?? 'Selected project';
  }

  get usersInProjectCount(): number {
    return this.filteredProjectMembers.length;
  }

  get usersResultTitle(): string {
    return this.selectedProjectId ? 'Users In Project' : 'Users In Scope';
  }

  get usersResultSubtitle(): string {
    if (this.selectedProjectId) {
      return 'Members available in the selected project.';
    }

    return this.userScopeFilter === 'withoutTasks'
      ? 'Users without assigned tasks across all projects.'
      : 'Users across all projects.';
  }

  get projectsForUserCount(): number {
    return this.filteredProjectResults.length;
  }

  get unassignedTasksCount(): number {
    return this.userTasks.filter((task) => !task.assignedUserId).length;
  }

  get completedTasksCount(): number {
    return this.userTasks.filter((task) => task.status === TaskStatus.Done).length;
  }

  get isTaskAssigneeSelectionEnabled(): boolean {
    return this.taskOwnershipFilter === 'assigned';
  }

  get projectFilterDisableReason(): string | null {
    if (this.isLoading) {
      return 'Projects are still loading.';
    }

    if (this.projects.length === 0) {
      return 'No projects are available.';
    }

    return null;
  }

  get memberContextDisableReason(): string | null {
    if (this.isLoading) {
      return 'Users are still loading.';
    }

    if (this.userScopeFilter !== 'all') {
      return 'Set User Scope to All Users to pick a specific member.';
    }

    if (this.memberContextOptions.length === 0) {
      return 'No users available for the selected scope.';
    }

    return null;
  }

  get taskAssigneeDisableReason(): string | null {
    if (this.taskOwnershipFilter !== 'assigned') {
      return 'Set Task Ownership to Assigned to choose a user.';
    }

    if (this.assigneeOptions.length === 0) {
      return 'No assigned users available for the current filters.';
    }

    return null;
  }

  get projectOptions(): Array<{ id: string | null; name: string }> {
    return [this.allProjectsOption, ...this.projects.map((project) => ({ id: project.id, name: project.name }))];
  }

  get actorOptions(): Array<{ label: string; value: string }> {
    const actors = new Map<string, string>();

    for (const task of this.queriedTasksSnapshot) {
      actors.set(task.createdByUserId, task.createdByUserName);
      actors.set(task.lastModifiedByUserId, task.lastModifiedByUserName);
      if (task.assignedUserId) {
        actors.set(task.assignedUserId, task.assignedUserName || 'Unknown User');
      }
    }

    for (const project of this.projects) {
      actors.set(project.createdByUserId, project.createdByUserName || 'Unknown User');
      actors.set(project.lastModifiedByUserId, project.lastModifiedByUserName || 'Unknown User');
    }

    for (const member of this.projectMembers) {
      actors.set(member.userId, member.displayName || 'Unknown User');
    }

    return [...actors.entries()]
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }

  get assigneeOptions(): Array<{ label: string; value: string }> {
    const assignees = new Map<string, string>();

    for (const task of this.queriedTasksSnapshot) {
      if (task.assignedUserId) {
        assignees.set(task.assignedUserId, task.assignedUserName || 'Unknown User');
      }
    }

    for (const member of this.projectMembers) {
      assignees.set(member.userId, member.displayName || 'Unknown User');
    }

    return [...assignees.entries()]
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }

  getTaskStatusLabel(status: TaskStatus): string {
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

  getTaskStatusSeverity(status: TaskStatus): TagSeverity {
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

  get selectedUserName(): string {
    return this.projectMembers.find((member) => member.userId === this.selectedUserId)?.displayName
      ?? this.allProjectMembers.find((member) => member.userId === this.selectedUserId)?.displayName
      ?? 'Selected user';
  }

  get isUserSelectionEnabled(): boolean {
    return this.userScopeFilter === 'all' && this.memberContextOptions.length > 0;
  }

  get memberContextOptions(): ProjectMemberDto[] {
    if (this.selectedProjectId) {
      return this.filteredProjectMembers;
    }

    return this.allProjectMembers;
  }

  get filteredProjectResults(): ProjectDto[] {
    let projects = [...this.userProjects];

    if (this.projectCreatedByUserId) {
      projects = projects.filter((project) => project.createdByUserId === this.projectCreatedByUserId);
    }

    if (this.projectUpdatedByUserId) {
      projects = projects.filter((project) => project.lastModifiedByUserId === this.projectUpdatedByUserId);
    }

    if (this.projectSearchTitle.trim().length > 0) {
      const term = this.projectSearchTitle.trim().toLowerCase();
      projects = projects.filter((project) => project.name.toLowerCase().includes(term));
    }

    return projects;
  }

  get filteredProjectMembers(): ProjectMemberDto[] {
    const memberPool = this.selectedProjectId ? this.projectMembers : this.allProjectMembers;
    if (this.userScopeFilter === 'all') {
      return memberPool;
    }

    const membersWithTasks = new Set(
      (this.selectedProjectId ? this.projectTasksSnapshot : this.allProjectTasksSnapshot)
        .map((task) => task.assignedUserId?.trim())
        .filter((userId): userId is string => !!userId)
    );

    return memberPool.filter((member) => !membersWithTasks.has(member.userId));
  }

  onProjectChange(projectId: string | null): void {
    this.selectedProjectId = projectId;
    this.page = 1;

    if (!projectId) {
      this.projectMembers = [];
      this.projectTasksSnapshot = [];
      if (this.selectedUserId && !this.allProjectMembers.some((member) => member.userId === this.selectedUserId)) {
        this.selectedUserId = null;
      }
      this.reloadResults();
    } else {
      this.selectedUserId = null;
      this.loadMembersAndSeedUser(projectId);
    }
  }

  onUserChange(userId: string | null): void {
    this.selectedUserId = userId;
    this.page = 1;
    this.reloadResults();
  }

  onUserScopeFilterChange(scope: UserScopeFilter): void {
    this.userScopeFilter = scope;
    if (scope === 'withoutTasks') {
      this.selectedUserId = null;
    }
    this.page = 1;
    this.reloadResults();
  }

  onTaskOwnershipFilterChange(ownership: TaskOwnershipFilter): void {
    this.taskOwnershipFilter = ownership;
    if (ownership !== 'assigned') {
      this.taskAssigneeUserId = null;
    }
    this.page = 1;
    this.reloadResults();
  }

  onTaskFiltersChanged(): void {
    this.page = 1;
    this.reloadTasksOnly();
  }

  onProjectFiltersChanged(): void {
    this.page = 1;
    this.loadProjectsForUser();
  }

  resetAllFilters(): void {
    this.selectedProjectId = null;
    this.selectedUserId = null;
    this.userScopeFilter = 'all';

    this.taskSearchTitle = '';
    this.projectSearchTitle = '';
    this.taskStateFilter = 'all';
    this.taskAssigneeUserId = null;
    this.taskCreatedByUserId = null;
    this.taskUpdatedByUserId = null;
    this.projectCreatedByUserId = null;
    this.projectUpdatedByUserId = null;

    this.taskOwnershipFilter = this.getDefaultTaskOwnershipFilter();
    if (this.taskOwnershipFilter === 'assigned') {
      this.taskAssigneeUserId = this.authService.currentUserId();
    }

    this.projectMembers = [];
    this.projectTasksSnapshot = [];
    if (!this.shouldUsePreviewMode()) {
      this.loadGlobalMemberContext();
      this.loadGlobalTaskContext();
    }
    this.pageSize = this.resolveSupportedPageSize(this.pageSize);
    this.page = 1;
    this.reloadResults();
  }

  nextPage(): void {
    this.page = Math.min(this.totalPages, this.page + 1);
  }

  previousPage(): void {
    this.page = Math.max(1, this.page - 1);
  }

  openProjectKanban(projectId: string): void {
    void this.router.navigate(['/projects/kanban'], {
      queryParams: { projectId }
    });
  }

  openTaskKanban(task: TaskItemDto): void {
    void this.router.navigate(['/projects/kanban'], {
      queryParams: { projectId: task.projectId }
    });
  }

  private loadInitialData(): void {
    this.isLoading = true;
    this.errors = [];

    if (this.shouldUsePreviewMode()) {
      this.loadPreviewData('Preview mode active. Showing local search dataset.');
      return;
    }

    this.projectsApiClient
      .getProjects({ page: 1, pageSize: 200 })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (projects) => {
          this.projects = projects;
          this.isLoading = false;
          this.selectedProjectId = null;
          this.loadGlobalMemberContext();
          this.loadGlobalTaskContext();
          this.reloadResults();
        },
        error: () => {
          if (this.shouldUsePreviewMode()) {
            this.loadPreviewData('Backend unavailable. Showing preview search dataset.');
            return;
          }

          this.errors = [{ severity: 'error', summary: 'Error', detail: 'Could not load projects.' }];
          this.isLoading = false;
        }
      });
  }

  private loadMembersAndSeedUser(projectId: string): void {
    this.isLoading = true;

    forkJoin({
      members: this.projectsApiClient.getMembers(projectId),
      tasks: this.taskItemsApiClient.getTasks({
        projectId,
        page: 1,
        pageSize: 500
      })
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: ({ members, tasks }) => {
          this.projectMembers = members;
          this.projectTasksSnapshot = tasks;
          if (this.userScopeFilter === 'all') {
            const currentUserId = this.authService.currentUserId();
            const defaultUserId = currentUserId && members.some((member) => member.userId === currentUserId)
              ? currentUserId
              : members.find((member) => !member.isOwner)?.userId ?? members[0]?.userId ?? null;
            this.selectedUserId = defaultUserId;
          } else {
            this.selectedUserId = null;
          }
          this.isLoading = false;
          this.reloadResults();
        },
        error: () => {
          this.errors = [{ severity: 'error', summary: 'Error', detail: 'Could not load project members.' }];
          this.isLoading = false;
        }
      });
  }

  private loadGlobalMemberContext(): void {
    if (this.projects.length === 0) {
      this.allProjectMembers = [];
      return;
    }

    const memberRequests = this.projects.map((project) => this.projectsApiClient.getMembers(project.id));
    forkJoin(memberRequests)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (membersByProject) => {
          const seen = new Set<string>();
          const flattened = membersByProject.flat();
          this.allProjectMembers = flattened.filter((member) => {
            if (seen.has(member.userId)) {
              return false;
            }

            seen.add(member.userId);
            return true;
          });
        },
        error: () => {
          this.allProjectMembers = [];
        }
      });
  }

  private loadGlobalTaskContext(): void {
    this.taskItemsApiClient
      .getTasks({ page: 1, pageSize: 500 })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (tasks) => {
          this.allProjectTasksSnapshot = tasks;
        },
        error: () => {
          this.allProjectTasksSnapshot = [];
        }
      });
  }

  private reloadResults(): void {
    this.loadProjectsForUser();
    this.reloadTasksOnly();
  }

  private loadProjectsForUser(): void {
    if (!this.selectedUserId) {
      this.userProjects = [...this.projects];
      return;
    }

    const targetProjects = this.selectedProjectId
      ? this.projects.filter((project) => project.id === this.selectedProjectId)
      : this.projects;

    const memberRequests = targetProjects.map((project) => this.projectsApiClient.getMembers(project.id));

    (memberRequests.length > 0 ? forkJoin(memberRequests) : of([] as ProjectMemberDto[][]))
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (membersByProject) => {
          this.userProjects = targetProjects.filter((project, index) =>
            membersByProject[index].some((member) => member.userId === this.selectedUserId)
          );
        },
        error: () => {
          this.errors = [{ severity: 'warn', summary: 'Warning', detail: 'Could not fully resolve projects for selected user.' }];
          this.userProjects = [];
        }
      });
  }

  private reloadTasksOnly(): void {
    let query$;
    const baseQuery: {
      projectId?: string;
      assignedUserId?: string;
      updatedByUserId?: string;
      status?: TaskStatus;
      unassignedOnly?: boolean;
      page: number;
      pageSize: number;
    } = {
      page: 1,
      pageSize: 500
    };

    if (this.selectedProjectId) {
      baseQuery.projectId = this.selectedProjectId;
    }

    if (this.taskStateFilter === 'todo') {
      baseQuery.status = TaskStatus.Todo;
    } else if (this.taskStateFilter === 'inProgress') {
      baseQuery.status = TaskStatus.InProgress;
    } else if (this.taskStateFilter === 'completed') {
      baseQuery.status = TaskStatus.Done;
    }

    if (this.taskUpdatedByUserId) {
      baseQuery.updatedByUserId = this.taskUpdatedByUserId;
    }

    if (this.taskOwnershipFilter === 'unassigned') {
      query$ = this.taskItemsApiClient.getTasks({ ...baseQuery, unassignedOnly: true });
    } else if (this.taskOwnershipFilter === 'assigned' && this.taskAssigneeUserId) {
      query$ = this.taskItemsApiClient.getTasks({ ...baseQuery, assignedUserId: this.taskAssigneeUserId });
    } else {
      query$ = this.taskItemsApiClient.getTasks(baseQuery);
    }

    query$
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (tasks) => {
          this.queriedTasksSnapshot = tasks;
          const titleTerm = this.taskSearchTitle.trim().toLowerCase();
          const filteredByClientRules = tasks.filter((task) => {
            if (this.taskCreatedByUserId && task.createdByUserId !== this.taskCreatedByUserId) {
              return false;
            }

            if (titleTerm.length > 0 && !task.title.toLowerCase().includes(titleTerm)) {
              return false;
            }

            if (this.taskOwnershipFilter === 'assigned' && !this.taskAssigneeUserId) {
              return !!task.assignedUserId;
            }

            return true;
          });

          this.userTasks = this.sortTasksByPreference(filteredByClientRules);
          this.page = 1;
        },
        error: () => {
          this.errors = [{ severity: 'error', summary: 'Error', detail: 'Could not load tasks for filters.' }];
          this.queriedTasksSnapshot = [];
          this.userTasks = [];
        }
      });
  }

  private shouldUsePreviewMode(): boolean {
    return this.authService.authSession()?.isDebugSession === true && this.authService.canStartDebugSession();
  }

  private applyPreferenceDefaults(): void {
    this.taskOwnershipFilter = this.getDefaultTaskOwnershipFilter();
    if (this.taskOwnershipFilter === 'assigned') {
      this.taskAssigneeUserId = this.authService.currentUserId();
    }

    this.pageSize = this.resolveSupportedPageSize(this.preferencesService.preferences().defaultTablePageSize);
  }

  private getDefaultTaskOwnershipFilter(): TaskOwnershipFilter {
    switch (this.preferencesService.preferences().defaultTaskFilterPreset) {
      case 'assignedToMe':
        return 'assigned';
      case 'unassigned':
        return 'unassigned';
      case 'all':
      default:
        return 'all';
    }
  }

  private resolveSupportedPageSize(value: number): number {
    return this.pageSizeOptions.includes(value) ? value : this.pageSizeOptions[0];
  }

  private sortTasksByPreference(tasks: TaskItemDto[]): TaskItemDto[] {
    const preference = this.preferencesService.preferences().defaultTaskSort;
    const statusRank = (status: TaskStatus): number => {
      switch (status) {
        case TaskStatus.Todo:
          return 0;
        case TaskStatus.InProgress:
          return 1;
        case TaskStatus.Done:
          return 2;
        default:
          return 3;
      }
    };
    const dueDateValue = (task: TaskItemDto): number => task.dueDate ? new Date(task.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
    const lastUpdatedValue = (task: TaskItemDto): number => new Date(task.lastModifiedAt).getTime();

    return [...tasks].sort((a, b) => {
      if (preference === 'dueDateAsc') {
        const dueDiff = dueDateValue(a) - dueDateValue(b);
        if (dueDiff !== 0) {
          return dueDiff;
        }
        return lastUpdatedValue(b) - lastUpdatedValue(a);
      }

      if (preference === 'statusThenDueDate') {
        const statusDiff = statusRank(a.status) - statusRank(b.status);
        if (statusDiff !== 0) {
          return statusDiff;
        }

        const dueDiff = dueDateValue(a) - dueDateValue(b);
        if (dueDiff !== 0) {
          return dueDiff;
        }
      }

      return lastUpdatedValue(b) - lastUpdatedValue(a);
    });
  }

  private loadPreviewData(detail: string): void {
    const now = Date.now();
    const projectOne: ProjectDto = {
      id: 'preview-platform-refresh',
      name: 'Platform Refresh',
      description: 'Modernization initiative across API and SPA.',
      ownerUserId: 'user-1',
      createdAt: new Date(now - 15 * 24 * 60 * 60 * 1000).toISOString(),
      createdByUserId: 'user-1',
      createdByUserName: 'Ava Mitchell',
      lastModifiedAt: new Date(now - 6 * 60 * 60 * 1000).toISOString(),
      lastModifiedByUserId: 'user-1',
      lastModifiedByUserName: 'Ava Mitchell'
    };

    const projectTwo: ProjectDto = {
      id: 'preview-mobile-portal',
      name: 'Mobile Portal',
      description: 'Self-service mobile workspace.',
      ownerUserId: 'user-2',
      createdAt: new Date(now - 33 * 24 * 60 * 60 * 1000).toISOString(),
      createdByUserId: 'user-2',
      createdByUserName: 'Noah Sanders',
      lastModifiedAt: new Date(now - 11 * 60 * 60 * 1000).toISOString(),
      lastModifiedByUserId: 'user-2',
      lastModifiedByUserName: 'Noah Sanders'
    };

    this.projects = [projectOne, projectTwo];
    this.selectedProjectId = null;

    this.projectMembers = [
      { userId: 'user-1', displayName: 'Ava Mitchell', isOwner: true },
      { userId: 'user-3', displayName: 'Liam Carter', isOwner: false },
      { userId: 'user-4', displayName: 'Mia Foster', isOwner: false }
    ];
    this.allProjectMembers = [...this.projectMembers];

    this.selectedUserId = 'user-3';
    this.userProjects = [projectOne, projectTwo];
    const previewTasks = this.sortTasksByPreference([
      {
        id: 'preview-task-1',
        title: 'Finalize dashboard widgets',
        description: 'Align KPI visuals and loading placeholders.',
        status: TaskStatus.InProgress,
        dueDate: new Date(now + 2 * 24 * 60 * 60 * 1000).toISOString(),
        projectId: projectOne.id,
        projectName: projectOne.name,
        assignedUserId: 'user-3',
        assignedUserName: 'Liam Carter',
        createdAt: new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString(),
        createdByUserId: 'user-1',
        createdByUserName: 'Ava Mitchell',
        lastModifiedAt: new Date(now - 3 * 60 * 60 * 1000).toISOString(),
        lastModifiedByUserId: 'user-3',
        lastModifiedByUserName: 'Liam Carter'
      },
      {
        id: 'preview-task-2',
        title: 'Review auth callback edge cases',
        description: 'Verify state mismatch handling and user-facing fallback messaging.',
        status: TaskStatus.Todo,
        dueDate: new Date(now + 5 * 24 * 60 * 60 * 1000).toISOString(),
        projectId: projectOne.id,
        projectName: projectOne.name,
        assignedUserId: null,
        assignedUserName: 'Unassigned',
        createdAt: new Date(now - 4 * 24 * 60 * 60 * 1000).toISOString(),
        createdByUserId: 'user-4',
        createdByUserName: 'Mia Foster',
        lastModifiedAt: new Date(now - 11 * 60 * 60 * 1000).toISOString(),
        lastModifiedByUserId: 'user-4',
        lastModifiedByUserName: 'Mia Foster'
      },
      {
        id: 'preview-task-3',
        title: 'Polish activity feed cards',
        description: 'Adjust spacing and improve long-title truncation.',
        status: TaskStatus.Done,
        dueDate: new Date(now - 24 * 60 * 60 * 1000).toISOString(),
        projectId: projectOne.id,
        projectName: projectOne.name,
        assignedUserId: 'user-3',
        assignedUserName: 'Liam Carter',
        createdAt: new Date(now - 9 * 24 * 60 * 60 * 1000).toISOString(),
        createdByUserId: 'user-1',
        createdByUserName: 'Ava Mitchell',
        lastModifiedAt: new Date(now - 28 * 60 * 60 * 1000).toISOString(),
        lastModifiedByUserId: 'user-3',
        lastModifiedByUserName: 'Liam Carter'
      }
    ]);
    this.userTasks = previewTasks;
    this.queriedTasksSnapshot = [...previewTasks];
    this.allProjectTasksSnapshot = [...previewTasks];
    this.projectTasksSnapshot = previewTasks.filter((task) => task.projectId === projectOne.id);

    this.taskSearchTitle = '';
    this.projectSearchTitle = '';
    this.taskStateFilter = 'all';
    this.taskOwnershipFilter = 'all';
    this.taskAssigneeUserId = null;
    this.taskCreatedByUserId = null;
    this.taskUpdatedByUserId = null;
    this.projectCreatedByUserId = null;
    this.projectUpdatedByUserId = null;
    this.page = 1;
    this.errors = [];
    this.isLoading = false;
  }
}
