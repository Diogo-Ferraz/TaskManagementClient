import { Component } from '@angular/core';
import { SharedModule } from '../../../../shared/shared.module';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { SelectItem, MessageService } from 'primeng/api';
import { Subject, takeUntil } from 'rxjs';
import { ProjectDto, ProjectService } from '../../../projects/services/project.service';
import { TaskStatus, TaskItemService } from '../../services/task-item.service';

@Component({
  selector: 'app-task-item-create',
  standalone: true,
  imports: [SharedModule, ReactiveFormsModule],
  templateUrl: './task-item-create.component.html',
  styleUrl: './task-item-create.component.scss'
})
export class TaskItemCreateComponent {
  taskForm!: FormGroup;
  isLoading = false;

  projectOptions: SelectItem<string>[] = [];
  statusOptions: SelectItem<TaskStatus>[] = [];

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private taskItemService: TaskItemService,
    private projectService: ProjectService,
    private router: Router,
    private messageService: MessageService
  ) { }

  ngOnInit(): void {
    this.initializeForm();
    this.loadDropdownData();
    this.prepareStatusOptions();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  initializeForm(): void {
    this.taskForm = this.fb.group({
      title: ['', Validators.required],
      projectId: ['', Validators.required],
      status: [TaskStatus.Todo, Validators.required],
      dueDate: [null],
      description: ['']
    });
  }

  loadDropdownData(): void {
    this.isLoading = true;
    this.projectService.getUserProjects()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (projects) => {
          this.projectOptions = projects.map(proj => ({
            label: proj.name,
            title: proj.name,
            value: proj.id
          }));
          this.isLoading = false;
        },
        error: (err) => {
          console.error("Error loading projects for dropdown", err);
          this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Could not load projects. Please try again.' });
          this.isLoading = false;
          this.projectOptions = [];
        }
      });
  }

  prepareStatusOptions(): void {
    this.statusOptions = Object.keys(TaskStatus)
      .filter(key => !isNaN(Number(TaskStatus[key as keyof typeof TaskStatus])))
      .map(key => ({
        name: key,
        value: TaskStatus[key as keyof typeof TaskStatus] as TaskStatus
      }));
  }

  isInvalid(controlName: string): boolean {
    const control = this.taskForm.get(controlName);
    return !!control && control.invalid && (control.dirty || control.touched);
  }

  onSubmit(): void {
    if (this.taskForm.invalid) {
      this.taskForm.markAllAsTouched();
      this.messageService.add({ severity: 'warn', summary: 'Validation Error', detail: 'Please fill in all required fields.' });
      return;
    }

    this.isLoading = true;
    const taskData = this.taskForm.value;

    const selectedProject = this.projectOptions.find(p => p.value === taskData.projectId);
    if (selectedProject) {
      taskData.projectName = selectedProject.label;
    }

    this.taskItemService.createTask(taskData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (createdTask) => {
          this.isLoading = false;
          this.messageService.add({ severity: 'success', summary: 'Success', detail: `Task "${createdTask.title}" created successfully!` });
          this.router.navigate(['/tasks']);
        },
        error: (err) => {
          this.isLoading = false;
          console.error('Error creating task:', err);
          this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Could not create task. Please try again.' });
        }
      });
  }

  cancel(): void {
    this.router.navigate(['/tasks']);
  }
}
