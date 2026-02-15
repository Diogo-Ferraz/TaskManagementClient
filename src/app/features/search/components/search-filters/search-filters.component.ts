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
import { SharedModule } from '../../../../shared/shared.module';

type TaskStateFilter = 'all' | 'pending' | 'completed';
type TaskOwnershipFilter = 'selectedUser' | 'unassigned';

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
  taskOwnershipFilter: TaskOwnershipFilter = 'selectedUser';
  pageSize = 10;
  page = 1;

  readonly taskOwnershipOptions = [
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
          this.userTasks = tasks;
          this.page = 1;
        },
        error: () => {
          this.errors = [{ severity: 'error', summary: 'Error', detail: 'Could not load tasks for filters.' }];
          this.userTasks = [];
        }
      });
  }
}
