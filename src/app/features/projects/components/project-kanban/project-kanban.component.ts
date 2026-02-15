import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { SharedModule } from '../../../../shared/shared.module';
import { Message } from 'primeng/api';
import { ProjectsApiClient } from '../../../../core/api/clients/projects-api.client';
import { TaskItemsApiClient } from '../../../../core/api/clients/task-items-api.client';
import { TaskItemDto } from '../../../../core/api/models/task-item.model';
import { TaskStatus } from '../../../../core/api/models/task-status.enum';
import { ProjectDto } from '../../../../core/api/models/project.model';

interface KanbanColumn {
  status: TaskStatus;
  label: string;
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
  private readonly destroy$ = new Subject<void>();

  readonly columns: KanbanColumn[] = [
    { status: TaskStatus.Todo, label: 'To Do' },
    { status: TaskStatus.InProgress, label: 'In Progress' },
    { status: TaskStatus.Done, label: 'Done' }
  ];

  projects: ProjectDto[] = [];
  selectedProjectId: string | null = null;

  isLoadingProjects = true;
  isLoadingTasks = false;
  errors: Message[] = [];

  private readonly groupedTasks: Record<TaskStatus, TaskItemDto[]> = {
    [TaskStatus.Todo]: [],
    [TaskStatus.InProgress]: [],
    [TaskStatus.Done]: []
  };

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
    return this.groupedTasks[status];
  }

  trackByTaskId(_: number, task: TaskItemDto): string {
    return task.id;
  }

  private loadProjects(): void {
    this.isLoadingProjects = true;
    this.errors = [];

    this.projectsApiClient
      .getProjects({ page: 1, pageSize: 200 })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (projects) => {
          this.projects = projects;
          this.isLoadingProjects = false;
          this.observeProjectSelection();
        },
        error: () => {
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
        this.loadTasksForProject(resolvedProjectId);
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

  private loadTasksForProject(projectId: string): void {
    this.isLoadingTasks = true;
    this.errors = [];
    this.clearTasks();

    this.taskItemsApiClient
      .getTasks({ projectId, page: 1, pageSize: 500 })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (tasks) => {
          this.groupedTasks[TaskStatus.Todo] = tasks.filter((task) => task.status === TaskStatus.Todo);
          this.groupedTasks[TaskStatus.InProgress] = tasks.filter((task) => task.status === TaskStatus.InProgress);
          this.groupedTasks[TaskStatus.Done] = tasks.filter((task) => task.status === TaskStatus.Done);
          this.isLoadingTasks = false;
        },
        error: () => {
          this.isLoadingTasks = false;
          this.errors = [{ severity: 'error', summary: 'Error', detail: 'Could not load tasks for selected project.' }];
        }
      });
  }

  private clearTasks(): void {
    this.groupedTasks[TaskStatus.Todo] = [];
    this.groupedTasks[TaskStatus.InProgress] = [];
    this.groupedTasks[TaskStatus.Done] = [];
  }
}
