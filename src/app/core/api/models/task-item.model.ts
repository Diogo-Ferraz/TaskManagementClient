import { TaskStatus } from './task-status.enum';

export interface TaskItemDto {
  id: string;
  title: string;
  description?: string | null;
  status: TaskStatus;
  dueDate?: string | null;
  projectId: string;
  projectName: string;
  assignedUserId?: string | null;
  assignedUserName: string;
  createdAt: string;
  createdByUserId: string;
  createdByUserName: string;
  lastModifiedAt: string;
  lastModifiedByUserId: string;
  lastModifiedByUserName: string;
}

export interface CreateTaskItemRequest {
  projectId: string;
  title: string;
  description?: string | null;
  status?: TaskStatus;
  dueDate?: string | null;
  assignedUserId?: string | null;
}

export interface UpdateTaskItemRequest {
  title: string;
  description?: string | null;
  status: TaskStatus;
  dueDate?: string | null;
  assignedUserId?: string | null;
}

export interface PatchTaskItemRequest {
  title?: string | null;
  description?: string | null;
  status?: TaskStatus;
  dueDate?: string | null;
  assignedUserId?: string | null;
}

export interface GetTasksQuery {
  projectId?: string;
  assignedUserId?: string;
  updatedByUserId?: string;
  search?: string;
  lastModifiedFrom?: Date;
  lastModifiedTo?: Date;
  status?: TaskStatus;
  unassignedOnly?: boolean;
  limit?: number;
  page?: number;
  pageSize?: number;
}
