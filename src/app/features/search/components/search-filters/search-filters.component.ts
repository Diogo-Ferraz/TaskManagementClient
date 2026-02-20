import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Message } from 'primeng/api';
import { Subject, forkJoin, of, takeUntil } from 'rxjs';
import { ProjectsApiClient } from '../../../../core/api/clients/projects-api.client';
import { TaskItemsApiClient } from '../../../../core/api/clients/task-items-api.client';
import { ProjectDto, ProjectMemberDto } from '../../../../core/api/models/project.model';
import { TaskItemDto } from '../../../../core/api/models/task-item.model';
import { TaskStatus } from '../../../../core/api/models/task-status.enum';
import { AuthService } from '../../../../core/auth/services/auth.service';
import { APP_ENVIRONMENT } from '../../../../core/config/app-environment.token';
import { SharedModule } from '../../../../shared/shared.module';

type TaskStateFilter = 'all' | 'pending' | 'completed';
type TaskOwnershipFilter = 'all' | 'selectedUser' | 'unassigned';
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
  private readonly authService = inject(AuthService);
  private readonly appEnvironment = inject(APP_ENVIRONMENT);
  private readonly destroy$ = new Subject<void>();

  isLoading = true;
  errors: Message[] = [];

  projects: ProjectDto[] = [];
  projectMembers: ProjectMemberDto[] = [];
  selectedProjectId: string | null = null;
  selectedUserId: string | null = null;

  userProjects: ProjectDto[] = [];
  userTasks: TaskItemDto[] = [];

  taskSearch = '';
  taskStateFilter: TaskStateFilter = 'all';
  taskOwnershipFilter: TaskOwnershipFilter = 'all';
  pageSize = 10;
  page = 1;

  readonly taskOwnershipOptions = [
    { label: 'All in Project', value: 'all' as const },
    { label: 'Selected User', value: 'selectedUser' as const },
    { label: 'Unassigned in Project', value: 'unassigned' as const }
  ];

  readonly taskStateOptions = [
    { label: 'All', value: 'all' as const },
    { label: 'Pending', value: 'pending' as const },
    { label: 'Completed', value: 'completed' as const }
  ];

  readonly pageSizeOptions = [10, 20, 50];

  ngOnInit(): void {
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

    if (this.taskStateFilter === 'completed') {
      tasks = tasks.filter((task) => task.status === TaskStatus.Done);
    } else if (this.taskStateFilter === 'pending') {
      tasks = tasks.filter((task) => task.status !== TaskStatus.Done);
    }

    if (this.taskSearch.trim().length > 0) {
      const term = this.taskSearch.trim().toLowerCase();
      tasks = tasks.filter((task) =>
        task.title.toLowerCase().includes(term) ||
        (task.description ?? '').toLowerCase().includes(term)
      );
    }

    return tasks;
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredTasks.length / this.pageSize));
  }

  get selectedProjectName(): string {
    return this.projects.find((project) => project.id === this.selectedProjectId)?.name ?? 'Selected project';
  }

  get usersInProjectCount(): number {
    return this.projectMembers.length;
  }

  get projectsForUserCount(): number {
    return this.userProjects.length;
  }

  get unassignedTasksCount(): number {
    return this.userTasks.filter((task) => !task.assignedUserId).length;
  }

  get completedTasksCount(): number {
    return this.userTasks.filter((task) => task.status === TaskStatus.Done).length;
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
    return this.projectMembers.find((member) => member.userId === this.selectedUserId)?.displayName ?? 'Selected user';
  }

  onProjectChange(projectId: string | null): void {
    this.selectedProjectId = projectId;
    this.selectedUserId = null;
    this.page = 1;

    if (!projectId) {
      this.projectMembers = [];
      this.userProjects = [];
      this.userTasks = [];
      return;
    }

    this.loadMembersAndSeedUser(projectId);
  }

  onUserChange(userId: string | null): void {
    this.selectedUserId = userId;
    this.page = 1;
    this.reloadResults();
  }

  onTaskFiltersChanged(): void {
    this.page = 1;
    this.reloadTasksOnly();
  }

  nextPage(): void {
    this.page = Math.min(this.totalPages, this.page + 1);
  }

  previousPage(): void {
    this.page = Math.max(1, this.page - 1);
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

          if (projects.length > 0) {
            this.onProjectChange(projects[0].id);
          }
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

    this.projectsApiClient
      .getMembers(projectId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (members) => {
          this.projectMembers = members;
          this.selectedUserId = members.find((member) => !member.isOwner)?.userId ?? members[0]?.userId ?? null;
          this.isLoading = false;
          this.reloadResults();
        },
        error: () => {
          this.errors = [{ severity: 'error', summary: 'Error', detail: 'Could not load project members.' }];
          this.isLoading = false;
        }
      });
  }

  private reloadResults(): void {
    this.loadProjectsForUser();
    this.reloadTasksOnly();
  }

  private loadProjectsForUser(): void {
    if (!this.selectedUserId) {
      this.userProjects = [];
      return;
    }

    const memberRequests = this.projects.map((project) =>
      this.projectsApiClient.getMembers(project.id)
    );

    forkJoin(memberRequests)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (membersByProject) => {
          this.userProjects = this.projects.filter((project, index) =>
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
    if (!this.selectedProjectId) {
      this.userTasks = [];
      return;
    }

    let query$;

    if (this.taskOwnershipFilter === 'unassigned') {
      query$ = this.taskItemsApiClient.getTasks({
        projectId: this.selectedProjectId,
        unassignedOnly: true,
        page: 1,
        pageSize: 500
      });
    } else if (this.taskOwnershipFilter === 'all') {
      query$ = this.taskItemsApiClient.getTasks({
        projectId: this.selectedProjectId,
        page: 1,
        pageSize: 500
      });
    } else if (this.selectedUserId) {
      query$ = this.taskItemsApiClient.getTasks({
        projectId: this.selectedProjectId,
        assignedUserId: this.selectedUserId,
        page: 1,
        pageSize: 500
      });
    } else {
      query$ = of([] as TaskItemDto[]);
    }

    query$
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (tasks) => {
          this.userTasks = [...tasks].sort((a, b) => {
            return new Date(b.lastModifiedAt).getTime() - new Date(a.lastModifiedAt).getTime();
          });
          this.page = 1;
        },
        error: () => {
          this.errors = [{ severity: 'error', summary: 'Error', detail: 'Could not load tasks for filters.' }];
          this.userTasks = [];
        }
      });
  }

  private shouldUsePreviewMode(): boolean {
    return this.authService.authSession()?.isDebugSession === true && this.authService.canStartDebugSession();
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
    this.selectedProjectId = projectOne.id;

    this.projectMembers = [
      { userId: 'user-1', displayName: 'Ava Mitchell', isOwner: true },
      { userId: 'user-3', displayName: 'Liam Carter', isOwner: false },
      { userId: 'user-4', displayName: 'Mia Foster', isOwner: false }
    ];

    this.selectedUserId = 'user-3';
    this.userProjects = [projectOne];
    this.userTasks = [
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
    ];

    this.taskSearch = '';
    this.taskStateFilter = 'all';
    this.taskOwnershipFilter = 'selectedUser';
    this.page = 1;
    this.errors = [];
    this.isLoading = false;
  }
}
