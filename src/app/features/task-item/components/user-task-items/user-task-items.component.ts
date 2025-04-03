import { Component, OnInit } from '@angular/core';
import { SharedModule } from '../../../../shared/shared.module';
import { TaskItemDto, TaskItemService, TaskStatus } from '../../services/task-item.service';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';

type TagSeverity = 'success' | 'secondary' | 'info' | 'warning' | 'danger' | 'contrast';

@Component({
  selector: 'app-user-task-items',
  standalone: true,
  imports: [SharedModule, FormsModule, DatePipe],
  templateUrl: './user-task-items.component.html',
  styleUrl: './user-task-items.component.scss'
})
export class UserTaskItemsComponent implements OnInit {
  tasks: TaskItemDto[] = [];
  isLoading: boolean = false;

  public TaskStatus = TaskStatus;

  constructor(private taskItemService: TaskItemService) { }

  ngOnInit(): void {
    this.loadTasks();
  }

  async loadTasks(): Promise<void> {
    this.isLoading = true;
    try {
      this.tasks = await this.taskItemService.getTasks();
    } catch (error) {
      console.error("Error loading tasks:", error);
      // TODO: Add user-friendly error handling (e.g., Toast message)
    } finally {
      this.isLoading = false;
    }
  }

  getPendingTasks(): TaskItemDto[] {
    return this.tasks.filter(task => task.status !== TaskStatus.Done);
  }

  getDoneTasks(): TaskItemDto[] {
    return this.tasks.filter(task => task.status === TaskStatus.Done);
  }

  async onTaskCheck(task: TaskItemDto): Promise<void> {
    const originalStatus = task.status;
    const newStatus = task.status === TaskStatus.Done ? TaskStatus.Todo : TaskStatus.Done;

    task.status = newStatus;

    try {
      const updatedTask = await this.taskItemService.updateTaskStatus(task.id, newStatus);
      if (!updatedTask) {
        task.status = originalStatus;
        console.error("Failed to update task status on backend.");
        // TODO: Add user notification (Toast)
      } else {
        console.log(`Task ${task.id} status updated to ${TaskStatus[newStatus]}`);
        // TODO: Object.assign(task, updatedTask); // Requires service to return full DTO
      }
    } catch (error) {
      task.status = originalStatus;
      console.error("Error updating task status:", error);
      // TODO: Add user notification (Toast)
    }
  }


  editTask(task: TaskItemDto): void {
    console.log('Editing task:', task);
    alert(`Editing: ${task.title}`);
    // TODO: open a modal/dialog here passing the 'task' object
  }

  async deleteTask(task: TaskItemDto): Promise<void> {
    console.log('Deleting task:', task);
    // TODO: Add confirmation dialog here

    const index = this.tasks.findIndex(t => t.id === task.id);
    if (index > -1) {
      this.tasks.splice(index, 1);
    }

    try {
      const success = await this.taskItemService.deleteTask(task.id);
      if (!success) {
        console.error("Failed to delete task on backend.");
        if (index > -1) this.tasks.splice(index, 0, task);
        // TODO: Add user notification (Toast)
      } else {
        console.log(`Task ${task.id} deleted.`);
      }
    } catch (error) {
      console.error("Error deleting task:", error);
      if (index > -1) this.tasks.splice(index, 0, task);
      // TODO: Add user notification (Toast)
    }
  }

  getTagSeverity(status: TaskStatus): TagSeverity {
    switch (status) {
      case TaskStatus.Todo: return 'info';
      case TaskStatus.InProgress: return 'warning';
      case TaskStatus.Blocked: return 'danger';
      case TaskStatus.Done: return 'success';
      default: return 'secondary';
    }
  }

  getStatusName(status: TaskStatus): string {
    return TaskStatus[status];
  }

  getInitials(name: string): string {
    return name.split(' ')
      .map(n => n[0])
      .filter((_, i, arr) => i === 0 || i === arr.length - 1)
      .join('').toUpperCase();
  }

  taskTrackBy(index: number, task: TaskItemDto): string {
    return task.id;
  }

  isOverdue(dueDate: Date | undefined): boolean {
    if (!dueDate) {
      return false;
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);
    return due < today;
  }
}
