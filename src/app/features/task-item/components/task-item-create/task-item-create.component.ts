import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MenuItem, MessageService } from 'primeng/api';
import { Subject, takeUntil } from 'rxjs';
import { ProjectsApiClient } from '../../../../core/api/clients/projects-api.client';
import { TaskItemsApiClient } from '../../../../core/api/clients/task-items-api.client';
import { ProjectDto } from '../../../../core/api/models/project.model';
import { TaskStatus } from '../../../../core/api/models/task-status.enum';
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
  private readonly router = inject(Router);
  private readonly messageService = inject(MessageService);
  private readonly authService = inject(AuthService);
  private readonly appEnvironment = inject(APP_ENVIRONMENT);
  private readonly destroy$ = new Subject<void>();

  taskForm!: FormGroup;
  isSubmitting = false;
  isLoadingProjects = false;
  projects: ProjectDto[] = [];
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
  readonly maxTitleLength = 160;
  readonly maxDescriptionLength = 2000;

  ngOnInit(): void {
    this.isPreviewMode = this.shouldUsePreviewMode();
    this.previewDetail = this.isPreviewMode ? 'Creates tasks locally for UI/debug workflows.' : null;
    this.initializeForm();
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
        dueDate: dueDate ? dueDate.toISOString() : null
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
      description: ['', [Validators.maxLength(this.maxDescriptionLength)]]
    });
  }

  private loadProjects(): void {
    this.isLoadingProjects = true;

    if (this.isPreviewMode) {
      this.projects = this.buildPreviewProjects();
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
}
