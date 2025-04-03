import { Component, OnInit, ChangeDetectorRef, ViewChild } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Table } from 'primeng/table';
import { ProjectService, ProjectDto } from '../../../projects/services/project.service';
import { TaskStatus, TaskItemService, TaskItemDto } from '../../services/task-item.service';
import { SharedModule } from '../../../../shared/shared.module';

type TagSeverity = 'success' | 'secondary' | 'info' | 'warning' | 'danger' | 'contrast';
interface StatusOption { label: string; value: TaskStatus; }

@Component({
  selector: 'app-task-item-list',
  standalone: true,
  imports: [
    SharedModule, FormsModule, DatePipe
  ],
  templateUrl: './task-item-list.component.html',
  styleUrls: ['./task-item-list.component.scss']
})
export class TaskItemListComponent implements OnInit {
  projects: ProjectDto[] = [];
  selectedProject: ProjectDto | null = null;
  tasks: TaskItemDto[] = [];

  isLoadingProjects: boolean = false;
  isLoadingTasks: boolean = false;

  showStatusDropdown: boolean = false;

  statusOptions: StatusOption[] = [];

  currentUserId: string = 'current-user-123';
  currentUserName: string = 'Me';

  globalFilterValue: string = '';

  @ViewChild('dt') dt: Table | undefined;

  public TaskStatus = TaskStatus;

  constructor(
    private projectService: ProjectService,
    private taskItemService: TaskItemService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadProjects();
    this.prepareStatusOptions();
  }

  prepareStatusOptions(): void {
    this.statusOptions = Object.keys(TaskStatus)
      .filter(key => !isNaN(Number(TaskStatus[key as keyof typeof TaskStatus])))
      .map(key => ({
        label: this.formatStatusName(key),
        value: TaskStatus[key as keyof typeof TaskStatus]
      }));
  }

  formatStatusName(key: string): string {
    let formatted = key.replace(/([A-Z])/g, ' $1').trim().toUpperCase();
    if (formatted === 'TODO') formatted = 'TO DO';
    return formatted;
  }

  async loadProjects(): Promise<void> {
    this.isLoadingProjects = true;
    this.projects = [];
    this.selectedProject = null;
    this.tasks = [];
    try {
      const fetchedProjects = await this.projectService.getUserProjects().toPromise() ?? [];
      if (fetchedProjects.length > 0 && fetchedProjects[0].taskItems) {
        fetchedProjects[0].taskItems.forEach((task, index) => {
          if (index % 4 === 1) { // Make some unassigned
            task.assignedUserId = '';
            task.assignedUserName = '';
          } else if (index % 4 === 2) { // Make some assigned to 'Other User'
            task.assignedUserId = 'other-user-456';
            task.assignedUserName = 'Bob Smith';
          } else if (index % 4 === 3) { // Make some assigned to 'Me'
            task.assignedUserId = this.currentUserId;
            task.assignedUserName = this.currentUserName;
          }
        });
      }
      this.projects = fetchedProjects;
      if (this.projects.length > 0) {
        this.selectedProject = this.projects[0];
        this.onProjectChange();
      }
    } catch (error) {
      console.error("Error loading projects:", error);
    } finally {
      this.isLoadingProjects = false;
    }
  }

  onProjectChange(): void {
    this.tasks = [];
    this.globalFilterValue = '';
    this.dt?.clear();
    if (this.selectedProject?.id) {
      this.loadTasksForSelectedProject();
    }
  }

  loadTasksForSelectedProject(): void {
    if (!this.selectedProject) return;
    this.isLoadingTasks = true;
    setTimeout(() => {
      this.tasks = this.selectedProject?.taskItems?.map(t => ({
        ...t,
        statusName: this.getStatusName(t.status)
      })) || [];
      this.isLoadingTasks = false;
      this.cdr.detectChanges();
    }, 150);
  }


  async assignToMe(task: TaskItemDto): Promise<void> {
    if (!task || !this.isUnassigned(task)) return;
    const originalValues = { assignedUserId: task.assignedUserId, assignedUserName: task.assignedUserName };
    task.assignedUserId = this.currentUserId;
    task.assignedUserName = this.currentUserName;
    this.updateTaskInList(task);

    try {
      const updatePayload = { assignedUserId: this.currentUserId, assignedUserName: this.currentUserName, lastModifiedBy: this.currentUserName };
      const updated = await this.taskItemService.updateTask({ ...task, ...updatePayload });
      if (!updated) throw new Error("Backend update failed");
      console.log(`Task ${task.id} assigned to ${this.currentUserName}`);
    } catch (error) {
      console.error(`Error assigning task ${task.id}:`, error);
      task.assignedUserId = originalValues.assignedUserId;
      task.assignedUserName = originalValues.assignedUserName;
      this.updateTaskInList(task);
      // Add Toast
    }
  }

  async unassignTask(task: TaskItemDto): Promise<void> {
    if (!task || !this.isAssignedToMe(task)) return;
    const originalValues = { assignedUserId: task.assignedUserId, assignedUserName: task.assignedUserName, status: task.status };
    task.assignedUserId = ''; task.assignedUserName = ''; task.status = TaskStatus.Todo;
    this.updateTaskInList(task);

    try {
      const updatePayload = { assignedUserId: '', assignedUserName: '', status: TaskStatus.Todo, lastModifiedBy: this.currentUserName };
      const updated = await this.taskItemService.updateTask({ ...task, ...updatePayload });
      if (!updated) throw new Error("Backend update failed");
      console.log(`Task ${task.id} unassigned and status set to Todo.`);
    } catch (error) {
      console.error(`Error unassigning task ${task.id}:`, error);
      task.assignedUserId = originalValues.assignedUserId; task.assignedUserName = originalValues.assignedUserName; task.status = originalValues.status;
      this.updateTaskInList(task);
      // Add Toast
    }
  }

  async onStatusChange(task: TaskItemDto): Promise<void> {
    if (!this.isAssignedToMe(task)) return;
    const newStatus = task.status;
    const taskId = task.id;
    console.log(`Attempting to update task ${taskId} to status ${TaskStatus[newStatus]}`);

    try {
      const updatePayload = { status: newStatus, lastModifiedBy: this.currentUserName };
      const updated = await this.taskItemService.updateTask({ ...task, ...updatePayload });
      if (!updated) throw new Error("Backend status update failed");
      console.log(`Task ${taskId} status updated to ${TaskStatus[newStatus]}`);
      this.updateTaskInList(task);
    } catch (error) {
      console.error(`Error updating status for task ${taskId}:`, error);
      alert(`Error updating status for task ${task.title}. Please refresh and try again.`);
    }
  }

  updateTaskInList(updatedTask: TaskItemDto): void {
    const taskWithStatusName = { ...updatedTask, statusName: this.getStatusName(updatedTask.status) };
    const index = this.tasks.findIndex(t => t.id === updatedTask.id);
    if (index !== -1) {
      this.tasks = [
        ...this.tasks.slice(0, index),
        taskWithStatusName,
        ...this.tasks.slice(index + 1)
      ];
    }
  }

  getTagSeverity(status: TaskStatus): TagSeverity {
    switch (status) {
      case TaskStatus.Todo: return 'info';
      case TaskStatus.InProgress: return 'warning';
      case TaskStatus.Done: return 'success';
      case TaskStatus.Blocked: return 'danger';
      default: return 'secondary';
    }
  }

  getStatusName(status: TaskStatus): string {
    const key = TaskStatus[status] as keyof typeof TaskStatus;
    return this.formatStatusName(key);
  }

  getInitials(name: string | undefined | null): string {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).filter((_, i, arr) => i === 0 || i === arr.length - 1).join('').toUpperCase();
  }

  applyFilterGlobal(event: Event) {
    const filterValue = (event.target as HTMLInputElement)?.value;
    this.globalFilterValue = filterValue;
    this.dt?.filterGlobal(filterValue, 'contains');
  }

  isAssignedToMe(task: TaskItemDto): boolean {
    return !!task.assignedUserId && task.assignedUserId === this.currentUserId;
  }

  isUnassigned(task: TaskItemDto): boolean {
    return !task.assignedUserId || task.assignedUserId.trim() === '';
  }

  refreshTasks() {
    if (this.selectedProject) {
      console.log("Refreshing tasks for project:", this.selectedProject.name);
      this.loadTasksForSelectedProject();
    }
  }

  async deleteTask(task: TaskItemDto): Promise<void> {
    // Optimistic UI update
    const index = this.tasks.findIndex(t => t.id === task.id);
    let removedTask: TaskItemDto | null = null;
    if (index > -1) {
      removedTask = this.tasks.splice(index, 1)[0];
      this.tasks = [...this.tasks];
    }

    try {
      const success = await this.taskItemService.deleteTask(task.id);
      if (!success) throw new Error("Backend delete failed");
      console.log(`Task ${task.id} deleted.`);
      // Add Toast success
    } catch (error) {
      console.error("Error deleting task:", error);
      if (removedTask && index > -1) {
        this.tasks.splice(index, 0, removedTask);
        this.tasks = [...this.tasks];
      }
      // Add Toast error
    }
  }
}