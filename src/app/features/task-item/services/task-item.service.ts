import { Injectable } from '@angular/core';
import { Observable, of, delay } from 'rxjs';

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

  getTasks(projectId?: string): Observable<TaskItemDto[]> {
    console.log('TaskItemService: Fetching tasks...');
    const tasks = this.generateDummyTaskItems(projectId);
    console.log('TaskItemService: Fetched tasks:', tasks);
    return of(tasks).pipe(delay(300)); // Return Observable<TaskItemDto[]>
  }

  getAllTasks(): Observable<TaskItemDto[]> {
    console.log('TaskItemService: Fetching ALL tasks...');
    const tasks1 = this.generateDummyTaskItems('dummy-proj-1', 5);
    const tasks2 = this.generateDummyTaskItems('dummy-proj-2', 8);
    const allTasks = [...tasks1, ...tasks2];
    console.log('TaskItemService: Fetched ALL tasks:', allTasks);
    return of(allTasks).pipe(delay(400));
  }

  updateTaskStatus(taskId: string, newStatus: TaskStatus): Observable<TaskItemDto | null> {
    console.log(`TaskItemService: Updating task ${taskId} to status ${TaskStatus[newStatus]}`);
    return of({ id: taskId, status: newStatus } as TaskItemDto).pipe(delay(100));
  }

  deleteTask(taskId: string): Observable<boolean> {
    console.log(`TaskItemService: Deleting task ${taskId}`);
    return of(true).pipe(delay(100));
  }

  updateTask(task: TaskItemDto): Observable<TaskItemDto | null> {
    console.log(`TaskItemService: Updating task ${task.id}`, task);
    return of(task).pipe(delay(100));
  }

  createTask(taskData: Partial<TaskItemDto>): Observable<TaskItemDto> {
    console.log(`TaskItemService: Creating task`, taskData);
    const newTask: TaskItemDto = {
      id: crypto.randomUUID(),
      title: taskData.title || 'New Task',
      description: taskData.description || '',
      status: taskData.status ?? TaskStatus.Todo,
      dueDate: taskData.dueDate,
      projectId: taskData.projectId || 'unknown-project',
      projectName: taskData.projectName || 'Unknown Project',
      assignedUserId: taskData.assignedUserId || 'unassigned',
      assignedUserName: taskData.assignedUserName || 'Unassigned',
      createdAt: new Date(),
      createdBy: 'Current User',
      lastModifiedAt: new Date(),
      lastModifiedBy: 'Current User'
    };
    return of(newTask).pipe(delay(200));
  }
}