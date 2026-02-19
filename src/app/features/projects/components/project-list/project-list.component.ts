import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Message } from 'primeng/api';
import { SharedModule } from '../../../../shared/shared.module';
import { Table } from 'primeng/table';
import { Subject, takeUntil } from 'rxjs';
import { ProjectsApiClient } from '../../../../core/api/clients/projects-api.client';
import { ProjectDto } from '../../../../core/api/models/project.model';
import { AuthService } from '../../../../core/auth/services/auth.service';
import { APP_ENVIRONMENT } from '../../../../core/config/app-environment.token';

@Component({
  selector: 'app-project-list',
  standalone: true,
  imports: [CommonModule, SharedModule],
  templateUrl: './project-list.component.html',
  styleUrl: './project-list.component.scss'
})
export class ProjectListComponent implements OnInit, OnDestroy {
  private readonly projectsApiClient = inject(ProjectsApiClient);
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly appEnvironment = inject(APP_ENVIRONMENT);
  private readonly destroy$ = new Subject<void>();

  projects: ProjectDto[] = [];
  selectedProjects: ProjectDto[] = [];
  loading = true;
  searchValue: string | undefined;
  isPreviewMode = false;
  previewDetail: string | null = null;
  errors: Message[] = [];
  private readonly previewTaskCounts: Record<string, number> = {};

  ngOnInit(): void {
    this.loadProjects();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get totalProjects(): number {
    return this.projects.length;
  }

  get totalTasks(): number {
    return this.projects.reduce((sum, project) => sum + (project.taskItems?.length ?? 0), 0);
  }

  get recentProjects(): number {
    const lastThirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
    const nowMs = Date.now();
    return this.projects.filter((project) => nowMs - new Date(project.createdAt).getTime() <= lastThirtyDaysMs).length;
  }

  trackByProjectId(_: number, project: ProjectDto): string {
    return project.id;
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

  refreshProjects(): void {
    this.loadProjects();
  }

  createProject(): void {
    void this.router.navigate(['/projects/create']);
  }

  openKanban(projectId: string): void {
    void this.router.navigate(['/projects/kanban'], { queryParams: { projectId } });
  }

  loadProjects(): void {
    this.loading = true;
    this.errors = [];
    this.projects = [];
    this.isPreviewMode = false;
    this.previewDetail = null;

    if (this.shouldUsePreviewMode()) {
      this.loadPreviewProjects('Preview mode active. Showing local project data.');
      return;
    }

    this.projectsApiClient
      .getProjects({ page: 1, pageSize: 200 })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (projects) => {
          this.projects = projects;
          this.selectedProjects = [];
          this.loading = false;
        },
        error: () => {
          if (this.shouldUsePreviewMode()) {
            this.loadPreviewProjects('Backend unavailable. Showing preview projects.');
            return;
          }

          this.errors = [{ severity: 'error', summary: 'Error', detail: 'Could not load projects.' }];
          this.loading = false;
        }
      });
  }

  getProjectTaskCount(project: ProjectDto): number {
    if (project.taskItems?.length) {
      return project.taskItems.length;
    }

    return this.previewTaskCounts[project.id] ?? 0;
  }

  private shouldUsePreviewMode(): boolean {
    return this.authService.authSession()?.isDebugSession === true && this.authService.canStartDebugSession();
  }

  private loadPreviewProjects(detail: string): void {
    this.isPreviewMode = true;
    this.previewDetail = detail;
    this.projects = this.buildPreviewProjects();
    this.previewTaskCounts['preview-platform-refresh'] = 3;
    this.previewTaskCounts['preview-mobile-portal'] = 1;
    this.previewTaskCounts['preview-security-hardening'] = 2;
    this.selectedProjects = [];
    this.errors = [];
    this.loading = false;
  }

  private buildPreviewProjects(): ProjectDto[] {
    const now = Date.now();
    return [
      {
        id: 'preview-platform-refresh',
        name: 'Platform Refresh',
        description: 'Modernization initiative across API, SPA, and DevOps automation.',
        ownerUserId: 'user-1',
        createdAt: new Date(now - 12 * 24 * 60 * 60 * 1000).toISOString(),
        createdByUserId: 'user-1',
        createdByUserName: 'Ava Mitchell',
        lastModifiedAt: new Date(now - 2 * 60 * 60 * 1000).toISOString(),
        lastModifiedByUserId: 'user-2',
        lastModifiedByUserName: 'Liam Carter'
      },
      {
        id: 'preview-mobile-portal',
        name: 'Mobile Portal',
        description: 'Self-service mobile workspace for project collaboration and approvals.',
        ownerUserId: 'user-3',
        createdAt: new Date(now - 43 * 24 * 60 * 60 * 1000).toISOString(),
        createdByUserId: 'user-3',
        createdByUserName: 'Noah Sanders',
        lastModifiedAt: new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString(),
        lastModifiedByUserId: 'user-3',
        lastModifiedByUserName: 'Noah Sanders'
      },
      {
        id: 'preview-security-hardening',
        name: 'Security Hardening',
        description: 'RBAC coverage, OIDC hardening, and audit event visibility improvements.',
        ownerUserId: 'user-4',
        createdAt: new Date(now - 5 * 24 * 60 * 60 * 1000).toISOString(),
        createdByUserId: 'user-4',
        createdByUserName: 'Mia Foster',
        lastModifiedAt: new Date(now - 4 * 60 * 60 * 1000).toISOString(),
        lastModifiedByUserId: 'user-4',
        lastModifiedByUserName: 'Mia Foster'
      }
    ];
  }
}
