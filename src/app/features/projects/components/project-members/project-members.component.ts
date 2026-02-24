import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { Message } from 'primeng/api';
import { Table } from 'primeng/table';
import { Subject, takeUntil } from 'rxjs';
import { ProjectsApiClient } from '../../../../core/api/clients/projects-api.client';
import { ProjectDto, ProjectMemberDto } from '../../../../core/api/models/project.model';
import { AuthService } from '../../../../core/auth/services/auth.service';
import { APP_ENVIRONMENT } from '../../../../core/config/app-environment.token';
import { AppPreferencesService } from '../../../../core/preferences/app-preferences.service';
import { SharedModule } from '../../../../shared/shared.module';

@Component({
  selector: 'app-project-members',
  standalone: true,
  imports: [SharedModule],
  templateUrl: './project-members.component.html',
  styleUrl: './project-members.component.scss'
})
export class ProjectMembersComponent implements OnInit, OnDestroy {
  private static readonly PROJECT_SELECTION_CONTEXT = 'project-members';
  private readonly projectsApiClient = inject(ProjectsApiClient);
  private readonly authService = inject(AuthService);
  private readonly appEnvironment = inject(APP_ENVIRONMENT);
  private readonly preferencesService = inject(AppPreferencesService);
  private readonly destroy$ = new Subject<void>();

  projects: ProjectDto[] = [];
  members: ProjectMemberDto[] = [];
  selectedProjectId: string | null = null;
  visibleMemberCount = 0;

  isLoadingProjects = true;
  isLoadingMembers = false;
  isPreviewMode = false;
  previewDetail: string | null = null;
  errors: Message[] = [];

  readonly roleFilterOptions = [
    { label: 'All Roles', value: null as boolean | null },
    { label: 'Owner', value: true },
    { label: 'Member', value: false }
  ];

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

  get selectedProjectName(): string {
    return this.selectedProject?.name ?? 'No project selected';
  }

  get totalMembers(): number {
    return this.members.length;
  }

  get ownerCount(): number {
    return this.members.filter((member) => member.isOwner).length;
  }

  get collaboratorCount(): number {
    return this.members.filter((member) => !member.isOwner).length;
  }

  get visibleCount(): number {
    return this.visibleMemberCount;
  }

  onProjectChange(projectId: string | null): void {
    this.selectedProjectId = projectId;

    if (!projectId) {
      this.members = [];
      this.visibleMemberCount = 0;
      return;
    }

    this.preferencesService.setLastSelectedProject(ProjectMembersComponent.PROJECT_SELECTION_CONTEXT, projectId);
    this.loadMembers(projectId);
  }

  refresh(): void {
    if (this.selectedProjectId) {
      this.loadMembers(this.selectedProjectId);
      return;
    }

    this.loadProjects();
  }

  getInitials(name: string): string {
    return name
      .split(' ')
      .map((part) => part[0])
      .filter((_, index, parts) => index === 0 || index === parts.length - 1)
      .join('')
      .toUpperCase();
  }

  clearTableFilters(table: Table): void {
    table.clear();
    this.visibleMemberCount = this.members.length;
  }

  onTableFilter(event: { filteredValue?: ProjectMemberDto[] | null }): void {
    this.visibleMemberCount = event.filteredValue?.length ?? this.members.length;
  }

  private loadProjects(): void {
    this.isLoadingProjects = true;
    this.isLoadingMembers = false;
    this.isPreviewMode = false;
    this.previewDetail = null;
    this.errors = [];
    this.projects = [];
    this.members = [];
    this.visibleMemberCount = 0;
    this.selectedProjectId = null;

    if (this.shouldUsePreviewMode()) {
      this.loadPreviewProjects('Preview mode active. Showing local project members data.');
      return;
    }

    this.projectsApiClient
      .getProjects({ page: 1, pageSize: 200 })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (projects) => {
          this.projects = projects;
          const rememberedProjectId = this.preferencesService.getLastSelectedProject(ProjectMembersComponent.PROJECT_SELECTION_CONTEXT);
          this.selectedProjectId =
            (rememberedProjectId && projects.some((project) => project.id === rememberedProjectId) ? rememberedProjectId : null) ??
            projects[0]?.id ??
            null;
          this.isLoadingProjects = false;

          if (this.selectedProjectId) {
            this.preferencesService.setLastSelectedProject(ProjectMembersComponent.PROJECT_SELECTION_CONTEXT, this.selectedProjectId);
            this.loadMembers(this.selectedProjectId);
          }
        },
        error: () => {
          if (this.shouldUsePreviewMode()) {
            this.loadPreviewProjects('Backend unavailable. Showing preview project members data.');
            return;
          }

          this.isLoadingProjects = false;
          this.errors = [{ severity: 'error', summary: 'Error', detail: 'Could not load projects.' }];
        }
      });
  }

  private loadMembers(projectId: string): void {
    this.isLoadingMembers = true;
    this.errors = [];

    if (this.isPreviewMode) {
      this.members = this.buildPreviewMembers(projectId);
      this.visibleMemberCount = this.members.length;
      this.isLoadingMembers = false;
      return;
    }

    this.projectsApiClient
      .getMembers(projectId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (members) => {
          this.members = members;
          this.visibleMemberCount = members.length;
          this.isLoadingMembers = false;
        },
        error: () => {
          if (this.shouldUsePreviewMode()) {
            this.isPreviewMode = true;
            this.previewDetail = 'Members endpoint unavailable. Showing preview members.';
            this.members = this.buildPreviewMembers(projectId);
            this.visibleMemberCount = this.members.length;
            this.isLoadingMembers = false;
            return;
          }

          this.members = [];
          this.visibleMemberCount = 0;
          this.isLoadingMembers = false;
          this.errors = [{ severity: 'error', summary: 'Error', detail: 'Could not load project members.' }];
        }
      });
  }

  private shouldUsePreviewMode(): boolean {
    return this.authService.authSession()?.isDebugSession === true && this.authService.canStartDebugSession();
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
        createdAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(),
        createdByUserId: 'user-1',
        createdByUserName: 'Ava Mitchell',
        lastModifiedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        lastModifiedByUserId: 'user-2',
        lastModifiedByUserName: 'Liam Carter'
      },
      {
        id: 'preview-mobile-portal',
        name: 'Mobile Portal',
        description: 'Self-service workspace for project collaborators.',
        ownerUserId: 'user-3',
        createdAt: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString(),
        createdByUserId: 'user-3',
        createdByUserName: 'Noah Sanders',
        lastModifiedAt: new Date(Date.now() - 9 * 60 * 60 * 1000).toISOString(),
        lastModifiedByUserId: 'user-4',
        lastModifiedByUserName: 'Mia Foster'
      }
    ];
    this.selectedProjectId = this.projects[0]?.id ?? null;
    this.isLoadingProjects = false;

    if (this.selectedProjectId) {
      this.members = this.buildPreviewMembers(this.selectedProjectId);
      this.visibleMemberCount = this.members.length;
    }
  }

  private buildPreviewMembers(projectId: string): ProjectMemberDto[] {
    if (projectId === 'preview-mobile-portal') {
      return [
        { userId: 'user-3', displayName: 'Noah Sanders', email: 'noah.sanders@example.com', isOwner: true },
        { userId: 'user-4', displayName: 'Mia Foster', email: 'mia.foster@example.com', isOwner: false },
        { userId: 'user-5', displayName: 'Ethan Brooks', email: 'ethan.brooks@example.com', isOwner: false }
      ];
    }

    return [
      { userId: 'user-1', displayName: 'Ava Mitchell', email: 'ava.mitchell@example.com', isOwner: true },
      { userId: 'user-2', displayName: 'Liam Carter', email: 'liam.carter@example.com', isOwner: false },
      { userId: 'user-6', displayName: 'Sophia Reed', email: 'sophia.reed@example.com', isOwner: false },
      { userId: 'user-7', displayName: 'Oliver Grant', email: 'oliver.grant@example.com', isOwner: false }
    ];
  }
}
