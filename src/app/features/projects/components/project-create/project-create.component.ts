import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { SharedModule } from '../../../../shared/shared.module';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { Router } from '@angular/router';
import { MenuItem, MessageService } from 'primeng/api';
import { ProjectsApiClient } from '../../../../core/api/clients/projects-api.client';
import { APP_ENVIRONMENT } from '../../../../core/config/app-environment.token';
import { AuthService } from '../../../../core/auth/services/auth.service';

@Component({
  selector: 'app-project-create',
  standalone: true,
  imports: [SharedModule, ReactiveFormsModule],
  templateUrl: './project-create.component.html',
  styleUrl: './project-create.component.scss'
})
export class ProjectCreateComponent implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly projectsApiClient = inject(ProjectsApiClient);
  private readonly router = inject(Router);
  private readonly messageService = inject(MessageService);
  private readonly authService = inject(AuthService);
  private readonly appEnvironment = inject(APP_ENVIRONMENT);

  projectForm!: FormGroup;
  isLoading = false;
  isPreviewMode = false;
  previewDetail: string | null = null;
  readonly maxNameLength = 120;
  readonly maxDescriptionLength = 1200;
  readonly readinessSteps: MenuItem[] = [
    { label: 'Define Name' },
    { label: 'Add Description' },
    { label: 'Ready' }
  ];
  private destroy$ = new Subject<void>();

  ngOnInit(): void {
    this.isPreviewMode = this.shouldUsePreviewMode();
    this.previewDetail = this.isPreviewMode ? 'Changes are simulated locally in preview mode.' : null;

    this.projectForm = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(this.maxNameLength)]],
      description: ['', [Validators.maxLength(this.maxDescriptionLength)]]
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  isInvalid(controlName: string): boolean {
    const control = this.projectForm.get(controlName);
    return !!control && control.invalid && (control.dirty || control.touched);
  }

  get descriptionLength(): number {
    return (this.projectForm.get('description')?.value as string | null)?.length ?? 0;
  }

  get nameLength(): number {
    return (this.projectForm.get('name')?.value as string | null)?.length ?? 0;
  }

  get isNameReady(): boolean {
    return this.nameLength > 0 && !this.projectForm.get('name')?.invalid;
  }

  get isDescriptionReady(): boolean {
    return this.descriptionLength > 0 && !this.projectForm.get('description')?.invalid;
  }

  get isFormReady(): boolean {
    return this.projectForm.valid;
  }

  get readinessStepIndex(): number {
    if (!this.isNameReady) {
      return 0;
    }

    if (!this.isDescriptionReady) {
      return 1;
    }

    return this.isFormReady ? 2 : 1;
  }

  get previewName(): string {
    const value = (this.projectForm.get('name')?.value as string | null)?.trim();
    return value && value.length > 0 ? value : 'Untitled Project';
  }

  get previewDescription(): string {
    const value = (this.projectForm.get('description')?.value as string | null)?.trim();
    return value && value.length > 0
      ? value
      : 'Project description will appear here as you type.';
  }

  onSubmit(): void {
    if (this.projectForm.invalid) {
      this.projectForm.markAllAsTouched();
      this.messageService.add({ severity: 'warn', summary: 'Validation', detail: 'Please review form fields before submitting.' });
      return;
    }

    const name = (this.projectForm.get('name')?.value as string).trim();
    const descriptionRaw = (this.projectForm.get('description')?.value as string | null) ?? '';
    const description = descriptionRaw.trim();
    if (!name) {
      this.projectForm.get('name')?.setErrors({ required: true });
      this.projectForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;

    if (this.isPreviewMode) {
      this.isLoading = false;
      this.messageService.add({ severity: 'success', summary: 'Preview', detail: `Project "${name}" simulated successfully.` });
      void this.router.navigate(['/projects']);
      return;
    }

    this.projectsApiClient.create({ name, description: description || null })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (createdProject) => {
          this.isLoading = false;
          this.messageService.add({ severity: 'success', summary: 'Created', detail: `Project "${createdProject.name}" created successfully.` });
          void this.router.navigate(['/projects']);
        },
        error: () => {
          this.isLoading = false;
          this.messageService.add({ severity: 'error', summary: 'Create Failed', detail: 'Could not create project. Please try again.' });
        }
      });
  }

  cancel(): void {
    void this.router.navigate(['/projects']);
  }

  private shouldUsePreviewMode(): boolean {
    if (!this.appEnvironment.production) {
      return true;
    }

    return this.authService.authSession()?.isDebugSession === true;
  }
}
