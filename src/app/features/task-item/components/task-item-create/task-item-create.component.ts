import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MenuItem, MessageService } from 'primeng/api';
import { Subject, forkJoin, of, takeUntil } from 'rxjs';
import { AdminUsersApiClient } from '../../../../core/api/clients/admin-users-api.client';
import { ProjectsApiClient } from '../../../../core/api/clients/projects-api.client';
import { TaskItemsApiClient } from '../../../../core/api/clients/task-items-api.client';
import { ProjectDto, ProjectMemberDto } from '../../../../core/api/models/project.model';
import { UserSummaryDto } from '../../../../core/api/models/user.model';
import { TaskStatus } from '../../../../core/api/models/task-status.enum';
import { AppRole, MANAGEMENT_ROLES } from '../../../../core/auth/models/app-role.model';
import { AuthService } from '../../../../core/auth/services/auth.service';
import { APP_ENVIRONMENT } from '../../../../core/config/app-environment.token';
import { SharedModule } from '../../../../shared/shared.module';

@Component({
  selector: 'app-task-item-create',
  standalone: true,
  imports: [SharedModule, ReactiveFormsModule],
  templateUrl: './task-item-create.component.html',
  styleUrl: './task-item-create.component.scss'
})
export class TaskItemCreateComponent implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly taskItemsApiClient = inject(TaskItemsApiClient);
  private readonly projectsApiClient = inject(ProjectsApiClient);
  private readonly adminUsersApiClient = inject(AdminUsersApiClient);
  private readonly router = inject(Router);
  private readonly messageService = inject(MessageService);
  private readonly authService = inject(AuthService);
  private readonly appEnvironment = inject(APP_ENVIRONMENT);
  private readonly destroy$ = new Subject<void>();

  taskForm!: FormGroup;
  isSubmitting = false;
  isLoadingProjects = false;
  isLoadingMembers = false;
  projects: ProjectDto[] = [];
  assigneeOptions: Array<{ label: string; value: string | null }> = [{ label: 'Unassigned', value: null }];
  isPreviewMode = false;
  previewDetail: string | null = null;

  readonly statusOptions = [
    { label: 'To Do', value: TaskStatus.Todo },
    { label: 'In Progress', value: TaskStatus.InProgress },
    { label: 'Done', value: TaskStatus.Done }
  ];
  readonly readinessSteps: MenuItem[] = [
    { label: 'Task Details' },
    { label: 'Planning' },
    { label: 'Ready' }
  ];
  readonly maxTitleLength = 200;
  readonly maxDescriptionLength = 2000;

  ngOnInit(): void {
    this.isPreviewMode = this.shouldUsePreviewMode();
    this.previewDetail = this.isPreviewMode ? 'Creates tasks locally for UI/debug workflows.' : null;
    this.initializeForm();
    this.observeProjectSelection();
    this.loadProjects();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get descriptionLength(): number {
    return (this.taskForm.get('description')?.value as string | null)?.length ?? 0;
  }

  get titleLength(): number {
    return (this.taskForm.get('title')?.value as string | null)?.length ?? 0;
  }

  get hasTitle(): boolean {
    return this.titleLength > 0 && !this.taskForm.get('title')?.invalid;
  }

  get hasPlanningSelection(): boolean {
    const hasProject = !!this.taskForm.get('projectId')?.value;
    const hasStatus = this.taskForm.get('status')?.value !== null && this.taskForm.get('status')?.value !== undefined;
    return hasProject && hasStatus;
  }

  get readinessStepIndex(): number {
    if (!this.hasTitle) {
      return 0;
    }

    if (!this.hasPlanningSelection) {
      return 1;
    }

    return this.taskForm.valid ? 2 : 1;
  }

  get previewTitle(): string {
    const value = (this.taskForm.get('title')?.value as string | null)?.trim();
    return value && value.length > 0 ? value : 'Untitled task';
  }

  get previewDescription(): string {
    const value = (this.taskForm.get('description')?.value as string | null)?.trim();
    return value && value.length > 0 ? value : 'Add context and acceptance criteria to improve handoff quality.';
  }

  get previewProjectName(): string {
    const selectedProjectId = this.taskForm.get('projectId')?.value as string | null;
    if (!selectedProjectId) {
      return 'No project selected';
    }

    return this.projects.find((project) => project.id === selectedProjectId)?.name ?? 'Selected project';
  }

  get previewStatusLabel(): string {
    const status = this.taskForm.get('status')?.value as TaskStatus | null;
    return this.statusOptions.find((option) => option.value === status)?.label ?? 'To Do';
  }

  get previewAssigneeLabel(): string {
    const assignedUserId = this.taskForm.get('assignedUserId')?.value as string | null;
    return this.assigneeOptions.find((option) => option.value === assignedUserId)?.label ?? 'Unassigned';
  }

  get previewDueDateLabel(): string {
    const dueDate = this.taskForm.get('dueDate')?.value as Date | null;
    return dueDate ? dueDate.toLocaleDateString() : 'No due date';
  }

  isInvalid(controlName: string): boolean {
    const control = this.taskForm.get(controlName);
    return !!control && control.invalid && (control.dirty || control.touched);
  }

  onSubmit(): void {
    if (this.taskForm.invalid || this.isSubmitting) {
      this.taskForm.markAllAsTouched();
      return;
    }

    const title = (this.taskForm.get('title')?.value as string).trim();
    const descriptionRaw = (this.taskForm.get('description')?.value as string | null) ?? '';
    const description = descriptionRaw.trim();
    const projectId = this.taskForm.get('projectId')?.value as string;
    const status = this.taskForm.get('status')?.value as TaskStatus;
    const dueDate = this.taskForm.get('dueDate')?.value as Date | null;
    const assignedUserId = this.taskForm.get('assignedUserId')?.value as string | null;

    if (!title) {
      this.taskForm.get('title')?.setErrors({ required: true });
      this.taskForm.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;

    if (this.isPreviewMode) {
      this.isSubmitting = false;
      this.messageService.add({ severity: 'success', summary: 'Preview', detail: `Task "${title}" created in preview mode.` });
      void this.router.navigate(['/tasks']);
      return;
    }

    this.taskItemsApiClient
      .create({
        title,
        description: description || null,
        projectId,
        status,
        dueDate: dueDate ? dueDate.toISOString() : null,
        assignedUserId
      })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (task) => {
          this.isSubmitting = false;
          this.messageService.add({ severity: 'success', summary: 'Created', detail: `Task "${task.title}" created successfully.` });
          void this.router.navigate(['/tasks']);
        },
        error: () => {
          this.isSubmitting = false;
          this.messageService.add({ severity: 'error', summary: 'Create Failed', detail: 'Could not create task. Please try again.' });
        }
      });
  }

  cancel(): void {
    void this.router.navigate(['/tasks']);
  }

  private initializeForm(): void {
    this.taskForm = this.fb.group({
      title: ['', [Validators.required, Validators.maxLength(this.maxTitleLength)]],
      projectId: ['', Validators.required],
      status: [TaskStatus.Todo, Validators.required],
      dueDate: [null],
      assignedUserId: [null],
      description: ['', [Validators.maxLength(this.maxDescriptionLength)]]
    });
  }

  private observeProjectSelection(): void {
    this.taskForm
      .get('projectId')
      ?.valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe((projectId: string | null) => {
        this.loadProjectMembers(projectId);
      });
  }

  private loadProjects(): void {
    this.isLoadingProjects = true;

    if (this.isPreviewMode) {
      this.projects = this.buildPreviewProjects();
      this.assigneeOptions = this.buildPreviewAssigneeOptions();
      this.isLoadingProjects = false;
      if (this.projects.length > 0) {
        this.taskForm.patchValue({ projectId: this.projects[0].id });
      }
      return;
    }

    this.projectsApiClient
      .getProjects({ page: 1, pageSize: 200 })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (projects) => {
          this.projects = projects;
          this.isLoadingProjects = false;
          if (projects.length > 0) {
            this.taskForm.patchValue({ projectId: projects[0].id });
          }
        },
        error: () => {
          if (this.shouldUsePreviewMode()) {
            this.isPreviewMode = true;
            this.previewDetail = 'Backend unavailable. Using preview project options.';
            this.projects = this.buildPreviewProjects();
            if (this.projects.length > 0) {
              this.taskForm.patchValue({ projectId: this.projects[0].id });
            }
            this.assigneeOptions = this.buildPreviewAssigneeOptions();
            this.isLoadingProjects = false;
            return;
          }

          this.isLoadingProjects = false;
          this.messageService.add({ severity: 'error', summary: 'Load Failed', detail: 'Could not load projects.' });
        }
      });
  }

  private shouldUsePreviewMode(): boolean {
    return this.authService.authSession()?.isDebugSession === true && this.authService.canStartDebugSession();
  }

  private buildPreviewProjects(): ProjectDto[] {
    return [
      {
        id: 'preview-platform-refresh',
        name: 'Platform Refresh',
        description: 'Modernization initiative across API and SPA.',
        ownerUserId: 'user-1',
        createdAt: new Date().toISOString(),
        createdByUserId: 'user-1',
        createdByUserName: 'Ava Mitchell',
        lastModifiedAt: new Date().toISOString(),
        lastModifiedByUserId: 'user-1',
        lastModifiedByUserName: 'Ava Mitchell'
      },
      {
        id: 'preview-mobile-portal',
        name: 'Mobile Portal',
        description: 'Self-service mobile workspace.',
        ownerUserId: 'user-2',
        createdAt: new Date().toISOString(),
        createdByUserId: 'user-2',
        createdByUserName: 'Noah Sanders',
        lastModifiedAt: new Date().toISOString(),
        lastModifiedByUserId: 'user-2',
        lastModifiedByUserName: 'Noah Sanders'
      }
    ];
  }

  private loadProjectMembers(projectId: string | null): void {
    this.taskForm.patchValue({ assignedUserId: null }, { emitEvent: false });

    if (!projectId) {
      this.assigneeOptions = [{ label: 'Unassigned', value: null }];
      return;
    }

    if (this.isPreviewMode) {
      this.assigneeOptions = this.buildPreviewAssigneeOptions();
      return;
    }

    this.isLoadingMembers = true;
    const members$ = this.projectsApiClient.getMembers(projectId);
    const allUsers$ = this.authService.hasAnyRole([AppRole.Administrator, AppRole.ProjectManager])
      ? this.adminUsersApiClient.getUsers({ role: AppRole.User, page: 1, pageSize: 500 })
      : of(null);

    forkJoin({ members: members$, usersResponse: allUsers$ })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: ({ members, usersResponse }) => {
          this.assigneeOptions = this.mapAssigneeOptions(members, usersResponse?.items ?? []);
          this.isLoadingMembers = false;
        },
        error: () => {
          this.assigneeOptions = this.mapAssigneeOptions([], []);
          this.isLoadingMembers = false;
          this.messageService.add({
            severity: 'warn',
            summary: 'Members Unavailable',
            detail: 'Could not load project members for assignee selection.'
          });
        }
      });
  }

  private mapAssigneeOptions(
    members: ProjectMemberDto[],
    allUsers: UserSummaryDto[]
  ): Array<{ label: string; value: string | null }> {
    const optionsByUserId = new Map<string, { label: string; value: string | null }>();
    const canManageAssignments = this.authService.hasAnyRole([...MANAGEMENT_ROLES]);
    const assignableUserIds = new Set(allUsers.map((user) => user.id));
    const projectManagerUserIds = new Set(
      allUsers
        .filter((user) => (user.roles ?? []).includes(AppRole.ProjectManager))
        .map((user) => user.id)
    );

    for (const member of members) {
      if (canManageAssignments && !assignableUserIds.has(member.userId)) {
        continue;
      }

      if (projectManagerUserIds.has(member.userId)) {
        continue;
      }

      optionsByUserId.set(member.userId, {
        label: member.displayName,
        value: member.userId
      });
    }

    for (const user of allUsers) {
      if ((user.roles ?? []).includes(AppRole.ProjectManager)) {
        continue;
      }

      if (!optionsByUserId.has(user.id)) {
        optionsByUserId.set(user.id, {
          label: this.resolveUserLabel(user.displayName, user.userName, user.email, user.id),
          value: user.id
        });
      }
    }

    const currentUserId = this.authService.currentUserId();
    const currentUserIsProjectManager = this.authService.hasRole(AppRole.ProjectManager);
    if (currentUserId && !currentUserIsProjectManager && !optionsByUserId.has(currentUserId)) {
      optionsByUserId.set(currentUserId, {
        label: this.currentUserLabel(),
        value: currentUserId
      });
    }

    const sortedOptions = Array.from(optionsByUserId.values()).sort((a, b) => a.label.localeCompare(b.label));
    if (this.authService.hasAnyRole([...MANAGEMENT_ROLES])) {
      return [{ label: 'Unassigned', value: null }, ...sortedOptions];
    }

    const currentUserIdForRegularRole = this.authService.currentUserId();
    const currentUserOption = currentUserIdForRegularRole
      ? sortedOptions.find((option) => option.value === currentUserIdForRegularRole) ?? {
        label: this.currentUserLabel(),
        value: currentUserIdForRegularRole
      }
      : null;

    return currentUserOption
      ? [{ label: 'Unassigned', value: null }, currentUserOption]
      : [{ label: 'Unassigned', value: null }];
  }

  private currentUserLabel(): string {
    const claims = this.authService.userClaims();
    const name = claims['name'];
    const userName = claims['preferred_username'];
    const email = claims['email'];

    if (typeof name === 'string' && name.trim().length > 0) {
      return name;
    }

    if (typeof userName === 'string' && userName.trim().length > 0) {
      return userName;
    }

    if (typeof email === 'string' && email.trim().length > 0) {
      return email;
    }

    return 'Current User';
  }

  private resolveUserLabel(
    displayName: string | null | undefined,
    userName: string | null | undefined,
    email: string | null | undefined,
    fallback: string
  ): string {
    if (displayName && displayName.trim().length > 0) {
      return displayName;
    }

    if (userName && userName.trim().length > 0) {
      return userName;
    }

    if (email && email.trim().length > 0) {
      return email;
    }

    return fallback;
  }

  private buildPreviewAssigneeOptions(): Array<{ label: string; value: string | null }> {
    return [
      { label: 'Unassigned', value: null },
      { label: 'Ava Mitchell', value: 'user-1' },
      { label: 'Noah Sanders', value: 'user-2' }
    ];
  }
}
