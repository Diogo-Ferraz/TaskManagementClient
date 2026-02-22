import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ConfirmationService, Message, MessageService } from 'primeng/api';
import { Subject, forkJoin, of, takeUntil } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ProjectsApiClient } from '../../../../core/api/clients/projects-api.client';
import { TaskItemsApiClient } from '../../../../core/api/clients/task-items-api.client';
import { ProjectDto, ProjectMemberDto } from '../../../../core/api/models/project.model';
import { TaskItemDto } from '../../../../core/api/models/task-item.model';
import { TaskStatus } from '../../../../core/api/models/task-status.enum';
import { AppRole } from '../../../../core/auth/models/app-role.model';
import { AuthService } from '../../../../core/auth/services/auth.service';
import { APP_ENVIRONMENT } from '../../../../core/config/app-environment.token';
import { AppPreferencesService } from '../../../../core/preferences/app-preferences.service';
import { SharedModule } from '../../../../shared/shared.module';

type TagSeverity = 'success' | 'secondary' | 'info' | 'warning' | 'danger' | 'contrast';

@Component({
  selector: 'app-project-details',
  standalone: true,
  imports: [SharedModule],
  templateUrl: './project-details.component.html',
  styleUrl: './project-details.component.scss'
})
export class ProjectDetailsComponent implements OnInit, OnDestroy {
  private static readonly PROJECT_SELECTION_CONTEXT = 'project-details';
  private readonly projectsApiClient = inject(ProjectsApiClient);
  private readonly taskItemsApiClient = inject(TaskItemsApiClient);
  private readonly authService = inject(AuthService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly messageService = inject(MessageService);
  private readonly appEnvironment = inject(APP_ENVIRONMENT);
  private readonly preferencesService = inject(AppPreferencesService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly destroy$ = new Subject<void>();

  projects: ProjectDto[] = [];
  selectedProjectId: string | null = null;
  selectedProjectDetails: ProjectDto | null = null;
  projectMembers: ProjectMemberDto[] = [];
  recentTasks: TaskItemDto[] = [];

  isLoadingProjects = true;
  isLoadingDetails = false;
  isPreviewMode = false;
  previewDetail: string | null = null;
  errors: Message[] = [];
  isProjectDeletePending = false;

  ngOnInit(): void {
    this.loadProjects();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get selectedProjectName(): string {
    return this.selectedProjectDetails?.name ?? this.selectedProject?.name ?? 'No project selected';
  }

  get selectedProject(): ProjectDto | null {
    return this.projects.find((project) => project.id === this.selectedProjectId) ?? null;
  }

  get totalTasks(): number {
    return this.recentTasks.length;
  }

  get todoTasks(): number {
    return this.recentTasks.filter((task) => task.status === TaskStatus.Todo).length;
  }

  get inProgressTasks(): number {
    return this.recentTasks.filter((task) => task.status === TaskStatus.InProgress).length;
  }

  get doneTasks(): number {
    return this.recentTasks.filter((task) => task.status === TaskStatus.Done).length;
  }

  get overdueTasks(): number {
    return this.recentTasks.filter((task) => this.isOverdue(task)).length;
  }

  get unassignedTasks(): number {
    return this.recentTasks.filter((task) => !task.assignedUserId).length;
  }

  get completionRate(): number {
    if (this.totalTasks === 0) {
      return 0;
    }

    return Math.round((this.doneTasks / this.totalTasks) * 100);
  }

  onProjectChange(): void {
    if (!this.selectedProjectId) {
      this.selectedProjectDetails = null;
      this.projectMembers = [];
      this.recentTasks = [];
      return;
    }

    this.updateProjectQueryParam(this.selectedProjectId);
    this.preferencesService.setLastSelectedProject(ProjectDetailsComponent.PROJECT_SELECTION_CONTEXT, this.selectedProjectId);
    this.loadProjectDetails(this.selectedProjectId);
  }

  refresh(): void {
    if (this.selectedProjectId) {
      this.loadProjectDetails(this.selectedProjectId);
      return;
    }

    this.loadProjects();
  }

  openKanban(): void {
    if (!this.selectedProjectId) {
      return;
    }

    void this.router.navigate(['/projects/kanban'], {
      queryParams: { projectId: this.selectedProjectId }
    });
  }

  openTasks(): void {
    void this.router.navigate(['/tasks']);
  }

  canDeleteSelectedProject(): boolean {
    const project = this.selectedProjectDetails ?? this.selectedProject;
    if (!project) {
      return false;
    }

    if (this.authService.hasRole(AppRole.Administrator)) {
      return true;
    }

    return this.authService.hasRole(AppRole.ProjectManager) && project.ownerUserId === this.authService.currentUserId();
  }

  deleteSelectedProject(): void {
    const project = this.selectedProjectDetails ?? this.selectedProject;
    if (!project || this.isProjectDeletePending || !this.canDeleteSelectedProject()) {
      return;
    }

    this.confirmationService.confirm({
      header: 'Delete Project',
      message: `Delete project "${project.name}"? This will remove related project data.`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Delete',
      rejectLabel: 'Cancel',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => this.executeProjectDeletion(project)
    });
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

  getStatusSeverity(status: TaskStatus): TagSeverity {
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
    if (!name || name.trim().length === 0) {
      return '?';
    }

    return name
      .split(' ')
      .map((part) => part[0])
      .filter((_, index, parts) => index === 0 || index === parts.length - 1)
      .join('')
      .toUpperCase();
  }

  isOverdue(task: TaskItemDto): boolean {
    if (!task.dueDate) {
      return false;
    }

    return new Date(task.dueDate).getTime() < Date.now() && task.status !== TaskStatus.Done;
  }

  private loadProjects(): void {
    this.isLoadingProjects = true;
    this.isLoadingDetails = false;
    this.errors = [];
    this.projects = [];
    this.selectedProjectId = null;
    this.selectedProjectDetails = null;
    this.projectMembers = [];
    this.recentTasks = [];
    this.isPreviewMode = false;
    this.previewDetail = null;

    if (this.shouldUsePreviewMode()) {
      this.loadPreviewProjects('Preview mode active. Showing local project details data.');
      return;
    }

    this.projectsApiClient
      .getProjects({ page: 1, pageSize: 200 })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (projects) => {
          this.projects = projects;
          const queryProjectId = this.route.snapshot.queryParamMap.get('projectId');
          this.selectedProjectId = this.resolveInitialProjectId(projects, queryProjectId);
          this.isLoadingProjects = false;

          if (this.selectedProjectId) {
            this.updateProjectQueryParam(this.selectedProjectId);
            this.loadProjectDetails(this.selectedProjectId);
          }
        },
        error: () => {
          if (this.shouldUsePreviewMode()) {
            this.loadPreviewProjects('Backend unavailable. Showing preview project details.');
            return;
          }

          this.isLoadingProjects = false;
          this.errors = [{ severity: 'error', summary: 'Error', detail: 'Could not load projects.' }];
        }
      });
  }

  private loadProjectDetails(projectId: string): void {
    this.isLoadingDetails = true;
    this.errors = [];

    if (this.isPreviewMode) {
      this.loadPreviewProjectData(projectId);
      this.isLoadingDetails = false;
      return;
    }

    forkJoin({
      project: this.projectsApiClient.getById(projectId),
      members: this.projectsApiClient.getMembers(projectId).pipe(catchError(() => of([]))),
      tasks: this.taskItemsApiClient.getTasks({ projectId, page: 1, pageSize: 500 }).pipe(catchError(() => of([])))
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: ({ project, members, tasks }) => {
          this.selectedProjectDetails = project;
          this.projectMembers = members;
          this.recentTasks = [...tasks]
            .sort((a, b) => new Date(b.lastModifiedAt).getTime() - new Date(a.lastModifiedAt).getTime())
            .slice(0, 12);
          this.isLoadingDetails = false;
        },
        error: () => {
          if (this.shouldUsePreviewMode()) {
            this.isPreviewMode = true;
            this.previewDetail = 'Project details endpoint unavailable. Showing preview details.';
            this.loadPreviewProjectData(projectId);
            this.isLoadingDetails = false;
            return;
          }

          this.isLoadingDetails = false;
          this.selectedProjectDetails = null;
          this.projectMembers = [];
          this.recentTasks = [];
          this.errors = [{ severity: 'error', summary: 'Error', detail: 'Could not load project details.' }];
        }
      });
  }

  private shouldUsePreviewMode(): boolean {
    return this.authService.authSession()?.isDebugSession === true && this.authService.canStartDebugSession();
  }

  private resolveInitialProjectId(projects: ProjectDto[], queryProjectId: string | null): string | null {
    if (queryProjectId && projects.some((project) => project.id === queryProjectId)) {
      return queryProjectId;
    }

    const rememberedProjectId = this.preferencesService.getLastSelectedProject(ProjectDetailsComponent.PROJECT_SELECTION_CONTEXT);
    if (rememberedProjectId && projects.some((project) => project.id === rememberedProjectId)) {
      return rememberedProjectId;
    }

    return projects[0]?.id ?? null;
  }

  private updateProjectQueryParam(projectId: string): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { projectId },
      queryParamsHandling: 'merge',
      replaceUrl: true
    });
  }

  private executeProjectDeletion(project: ProjectDto): void {
    const previousProjects = [...this.projects];
    const previousSelectedProjectId = this.selectedProjectId;
    const previousSelectedDetails = this.selectedProjectDetails;
    const previousMembers = [...this.projectMembers];
    const previousRecentTasks = [...this.recentTasks];

    this.isProjectDeletePending = true;
    this.projects = this.projects.filter((entry) => entry.id !== project.id);
    this.selectedProjectDetails = null;
    this.projectMembers = [];
    this.recentTasks = [];

    const nextProjectId = this.projects[0]?.id ?? null;
    this.selectedProjectId = nextProjectId;
    if (nextProjectId) {
      this.updateProjectQueryParam(nextProjectId);
      this.preferencesService.setLastSelectedProject(ProjectDetailsComponent.PROJECT_SELECTION_CONTEXT, nextProjectId);
    }

    if (this.isPreviewMode) {
      this.isProjectDeletePending = false;
      if (nextProjectId) {
        this.loadPreviewProjectData(nextProjectId);
      }
      this.messageService.add({ severity: 'success', summary: 'Deleted', detail: 'Project deleted in preview mode.' });
      return;
    }

    this.projectsApiClient
      .delete(project.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.isProjectDeletePending = false;
          if (nextProjectId) {
            this.loadProjectDetails(nextProjectId);
          }
          this.messageService.add({ severity: 'success', summary: 'Deleted', detail: 'Project deleted successfully.' });
        },
        error: () => {
          this.isProjectDeletePending = false;
          this.projects = previousProjects;
          this.selectedProjectId = previousSelectedProjectId;
          this.selectedProjectDetails = previousSelectedDetails;
          this.projectMembers = previousMembers;
          this.recentTasks = previousRecentTasks;
          this.messageService.add({ severity: 'error', summary: 'Delete Failed', detail: 'Could not delete project.' });
        }
      });
  }

  private loadPreviewProjects(detail: string): void {
    this.isPreviewMode = true;
    this.previewDetail = detail;
    this.projects = this.buildPreviewProjects();
    const queryProjectId = this.route.snapshot.queryParamMap.get('projectId');
    this.selectedProjectId = this.resolveInitialProjectId(this.projects, queryProjectId);
    this.isLoadingProjects = false;

    if (this.selectedProjectId) {
      this.updateProjectQueryParam(this.selectedProjectId);
      this.preferencesService.setLastSelectedProject(ProjectDetailsComponent.PROJECT_SELECTION_CONTEXT, this.selectedProjectId);
      this.loadProjectDetails(this.selectedProjectId);
    }
  }

  private loadPreviewProjectData(projectId: string): void {
    const project = this.projects.find((item) => item.id === projectId) ?? this.projects[0] ?? null;
    this.selectedProjectDetails = project;
    this.projectMembers = this.buildPreviewMembers(projectId);
    this.recentTasks = this.buildPreviewTasks(projectId)
      .sort((a, b) => new Date(b.lastModifiedAt).getTime() - new Date(a.lastModifiedAt).getTime())
      .slice(0, 12);
  }

  private buildPreviewProjects(): ProjectDto[] {
    return [
      {
        id: 'preview-platform-refresh',
        name: 'Platform Refresh',
        description: 'Modernization initiative across API and SPA.',
        ownerUserId: 'user-1',
        createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
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
        createdAt: new Date(Date.now() - 34 * 24 * 60 * 60 * 1000).toISOString(),
        createdByUserId: 'user-3',
        createdByUserName: 'Noah Sanders',
        lastModifiedAt: new Date(Date.now() - 9 * 60 * 60 * 1000).toISOString(),
        lastModifiedByUserId: 'user-4',
        lastModifiedByUserName: 'Mia Foster'
      }
    ];
  }

  private buildPreviewMembers(projectId: string): ProjectMemberDto[] {
    if (projectId === 'preview-mobile-portal') {
      return [
        { userId: 'user-3', displayName: 'Noah Sanders', isOwner: true },
        { userId: 'user-4', displayName: 'Mia Foster', isOwner: false },
        { userId: 'user-5', displayName: 'Ethan Brooks', isOwner: false }
      ];
    }

    return [
      { userId: 'user-1', displayName: 'Ava Mitchell', isOwner: true },
      { userId: 'user-2', displayName: 'Liam Carter', isOwner: false },
      { userId: 'user-6', displayName: 'Sophia Reed', isOwner: false },
      { userId: 'user-7', displayName: 'Oliver Grant', isOwner: false }
    ];
  }

  private buildPreviewTasks(projectId: string): TaskItemDto[] {
    const now = Date.now();
    const projectName = this.projects.find((project) => project.id === projectId)?.name ?? 'Preview Project';

    return [
      {
        id: `${projectId}-task-1`,
        title: 'Finalize board interaction polish',
        description: 'Improve task card micro-interactions and drag/drop visual feedback.',
        status: TaskStatus.InProgress,
        dueDate: new Date(now + 2 * 24 * 60 * 60 * 1000).toISOString(),
        projectId,
        projectName,
        assignedUserId: 'user-2',
        assignedUserName: 'Liam Carter',
        createdAt: new Date(now - 9 * 24 * 60 * 60 * 1000).toISOString(),
        createdByUserId: 'user-1',
        createdByUserName: 'Ava Mitchell',
        lastModifiedAt: new Date(now - 90 * 60 * 1000).toISOString(),
        lastModifiedByUserId: 'user-2',
        lastModifiedByUserName: 'Liam Carter'
      },
      {
        id: `${projectId}-task-2`,
        title: 'Validate activity feed message grammar',
        description: 'Normalize user-facing verbs for task/project activity events.',
        status: TaskStatus.Todo,
        dueDate: new Date(now + 5 * 24 * 60 * 60 * 1000).toISOString(),
        projectId,
        projectName,
        assignedUserId: null,
        assignedUserName: 'Unassigned',
        createdAt: new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString(),
        createdByUserId: 'user-6',
        createdByUserName: 'Sophia Reed',
        lastModifiedAt: new Date(now - 5 * 60 * 60 * 1000).toISOString(),
        lastModifiedByUserId: 'user-6',
        lastModifiedByUserName: 'Sophia Reed'
      },
      {
        id: `${projectId}-task-3`,
        title: 'Ship docs page consistency pass',
        description: 'Align card rhythm and typography with application standards.',
        status: TaskStatus.Done,
        dueDate: new Date(now - 24 * 60 * 60 * 1000).toISOString(),
        projectId,
        projectName,
        assignedUserId: 'user-7',
        assignedUserName: 'Oliver Grant',
        createdAt: new Date(now - 12 * 24 * 60 * 60 * 1000).toISOString(),
        createdByUserId: 'user-7',
        createdByUserName: 'Oliver Grant',
        lastModifiedAt: new Date(now - 26 * 60 * 60 * 1000).toISOString(),
        lastModifiedByUserId: 'user-7',
        lastModifiedByUserName: 'Oliver Grant'
      },
      {
        id: `${projectId}-task-4`,
        title: 'Add resilient empty states',
        description: 'Ensure all key pages remain usable when backend is unavailable.',
        status: TaskStatus.InProgress,
        dueDate: new Date(now + 24 * 60 * 60 * 1000).toISOString(),
        projectId,
        projectName,
        assignedUserId: 'user-4',
        assignedUserName: 'Mia Foster',
        createdAt: new Date(now - 6 * 24 * 60 * 60 * 1000).toISOString(),
        createdByUserId: 'user-3',
        createdByUserName: 'Noah Sanders',
        lastModifiedAt: new Date(now - 3 * 60 * 60 * 1000).toISOString(),
        lastModifiedByUserId: 'user-4',
        lastModifiedByUserName: 'Mia Foster'
      }
    ];
  }
}
