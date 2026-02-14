import { ActivityType } from './activity-type.enum';
import { TaskStatus } from './task-status.enum';

export interface ActivityLogDto {
  id: string;
  type: ActivityType;
  projectId?: string | null;
  taskItemId?: string | null;
  projectName?: string | null;
  taskTitle?: string | null;
  oldValue?: string | null;
  newValue?: string | null;
  oldStatus?: TaskStatus | null;
  newStatus?: TaskStatus | null;
  actorUserId: string;
  actorDisplayName: string;
  occurredAt: string;
}

export interface ActivityFeedQuery {
  projectId?: string;
  limit?: number;
  page?: number;
  pageSize?: number;
}
