import { TaskItemDto } from './task-item.model';

export interface ProjectDto {
  id: string;
  name: string;
  description: string;
  ownerUserId: string;
  createdAt: string;
  createdByUserId: string;
  createdByUserName: string;
  lastModifiedAt: string;
  lastModifiedByUserId: string;
  lastModifiedByUserName: string;
  taskItems?: TaskItemDto[];
}

export interface ProjectMemberDto {
  userId: string;
  displayName: string;
  isOwner: boolean;
}

export interface CreateProjectRequest {
  name: string;
  description?: string | null;
}

export interface UpdateProjectRequest {
  name: string;
  description?: string | null;
}

export interface PatchProjectRequest {
  name?: string | null;
  description?: string | null;
}

export interface ProjectListQuery {
  page?: number;
  pageSize?: number;
}
