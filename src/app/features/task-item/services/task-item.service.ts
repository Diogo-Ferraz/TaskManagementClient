import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class TaskItemService {

  constructor() { }
}

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