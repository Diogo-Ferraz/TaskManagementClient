import { Injectable } from '@angular/core';

export enum TaskStatus {
  Todo = 0,
  InProgress = 1,
  Done = 2,
  Blocked = 3
}

export interface TaskItemDto {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  dueDate?: Date;
  projectId: string;
  projectName: string;
  assignedUserId: string;
  assignedUserName: string;
  createdAt: Date;
  createdBy: string;
  lastModifiedAt: Date;
  lastModifiedBy: string;
}


@Injectable({
  providedIn: 'root'
})
export class TaskItemService {

  constructor() { }

  generateDummyTaskItems(projectId: string = 'dummy-proj-1', count: number = 7): TaskItemDto[] {
    const statuses = [TaskStatus.Todo, TaskStatus.InProgress, TaskStatus.Done, TaskStatus.Blocked];
    return Array(count).fill(0).map((_, index) => {
      const status = statuses[index % statuses.length];
      const daysToAdd = index % 2 === 0 ? (index + 1) : -(index + 1);

      return {
        id: crypto.randomUUID(),
        title: `Task ${index + 1} for Project`,
        description: `Description for Task ${index + 1}`,
        status: status,
        dueDate: new Date(Date.now() + daysToAdd * 24 * 60 * 60 * 1000),
        projectId: projectId,
        projectName: 'Dummy Project ' + projectId.slice(-1),
        assignedUserId: crypto.randomUUID(),
        assignedUserName: `User ${String.fromCharCode(65 + (index % 5))}`,
        createdAt: new Date(Date.now() - (count - index) * 24 * 60 * 60 * 1000),
        createdBy: 'System',
        lastModifiedAt: new Date(),
        lastModifiedBy: 'System'
      };
    });
  }

  async getTasks(): Promise<TaskItemDto[]> {
    console.log('TaskItemService: Fetching tasks...');
    await new Promise(resolve => setTimeout(resolve, 300));
    const tasks = this.generateDummyTaskItems();
    console.log('TaskItemService: Fetched tasks:', tasks);
    return tasks;
  }

  async updateTaskStatus(taskId: string, newStatus: TaskStatus): Promise<TaskItemDto | null> {
    console.log(`TaskItemService: Updating task ${taskId} to status ${TaskStatus[newStatus]}`);
    await new Promise(resolve => setTimeout(resolve, 100));
    return { id: taskId, status: newStatus } as TaskItemDto;
  }

  async deleteTask(taskId: string): Promise<boolean> {
    console.log(`TaskItemService: Deleting task ${taskId}`);
    await new Promise(resolve => setTimeout(resolve, 100));
    return true;
  }

  async updateTask(task: TaskItemDto): Promise<TaskItemDto | null> {
    console.log(`TaskItemService: Updating task ${task.id}`, task);
    await new Promise(resolve => setTimeout(resolve, 100));
    return task;
  }
}