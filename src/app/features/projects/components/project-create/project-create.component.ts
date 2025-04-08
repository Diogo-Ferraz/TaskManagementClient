import { Component, OnDestroy, OnInit } from '@angular/core';
import { SharedModule } from '../../../../shared/shared.module';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ProjectService } from '../../services/project.service';

@Component({
  selector: 'app-project-create',
  standalone: true,
  imports: [SharedModule, ReactiveFormsModule],
  templateUrl: './project-create.component.html',
  styleUrl: './project-create.component.scss'
})
export class ProjectCreateComponent implements OnInit, OnDestroy {

  projectForm!: FormGroup;
  isLoading = false;
  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private projectService: ProjectService,
    private router: Router,
    private messageService: MessageService
  ) { }

  ngOnInit(): void {
    this.projectForm = this.fb.group({
      name: ['', Validators.required],
      description: ['']
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

  onSubmit(): void {
    if (this.projectForm.invalid) {
      this.projectForm.markAllAsTouched();
      this.messageService.add({ severity: 'warn', summary: 'Validation Error', detail: 'Please fill in all required fields.' });
      return;
    }

    this.isLoading = true;
    const projectData = this.projectForm.value;

    this.projectService.createProject(projectData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (createdProject) => {
          this.isLoading = false;
          this.messageService.add({ severity: 'success', summary: 'Success', detail: `Project "${createdProject.name}" created successfully!` });
          this.router.navigate(['/projects']);
        },
        error: (err) => {
          this.isLoading = false;
          console.error('Error creating project:', err);
          this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Could not create project. Please try again.' });
        }
      });
  }

  cancel(): void {
    this.router.navigate(['/projects']);
  }
}
