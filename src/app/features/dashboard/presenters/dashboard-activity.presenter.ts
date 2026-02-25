import { ActivityLogDto } from '../../../core/api/models/activity.model';
import { ActivityType } from '../../../core/api/models/activity-type.enum';
import { TaskStatus } from '../../../core/api/models/task-status.enum';

export interface RecentActivityViewModel {
  icon: string;
  iconColor: string;
  bgColor: string;
  summary: string;
  time: string;
  rawEvent: ActivityLogDto;
}

export function mapActivityToRecentActivity(
  activity: ActivityLogDto,
  nowUtcMs: number = Date.now()
): RecentActivityViewModel {
  const summary = createActivitySummary(activity);

  return {
    icon: getActivityIcon(activity.type),
    iconColor: getActivityIconColor(activity.type),
    bgColor: getActivityBackgroundColor(activity.type),
    summary,
    time: formatRelativeTime(activity.occurredAt, nowUtcMs),
    rawEvent: activity
  };
}

function createActivitySummary(activity: ActivityLogDto): string {
  const actor = escapeText(activity.actorDisplayName || 'Someone');

  switch (activity.type) {
    case ActivityType.ProjectCreated:
      return `<strong>${actor}</strong> created project <strong>${escapeText(activity.projectName ?? '')}</strong>`;
    case ActivityType.ProjectRenamed:
      return `<strong>${actor}</strong> renamed project from <i>${escapeText(activity.oldValue ?? '')}</i> to <i>${escapeText(activity.newValue ?? '')}</i>`;
    case ActivityType.ProjectDeleted:
      return `<strong>${actor}</strong> deleted project <strong>${escapeText(activity.projectName ?? '')}</strong>`;
    case ActivityType.TaskCreated:
      return `<strong>${actor}</strong> created task <i>${escapeText(activity.taskTitle ?? '')}</i>`;
    case ActivityType.TaskStatusChanged:
      return `<strong>${actor}</strong> changed task status from <i>${escapeText(formatTaskStatus(activity.oldStatus))}</i> to <i>${escapeText(formatTaskStatus(activity.newStatus))}</i>`;
    case ActivityType.TaskRenamed:
      return `<strong>${actor}</strong> renamed task from <i>${escapeText(activity.oldValue ?? '')}</i> to <i>${escapeText(activity.newValue ?? '')}</i>`;
    case ActivityType.TaskDeleted:
      return `<strong>${actor}</strong> deleted task <i>${escapeText(activity.taskTitle ?? '')}</i>`;
    case ActivityType.TaskAssigneeChanged:
      return `<strong>${actor}</strong> reassigned task from <i>${escapeText(activity.oldValue ?? 'Unassigned')}</i> to <i>${escapeText(activity.newValue ?? 'Unassigned')}</i>`;
    case ActivityType.TaskDueDateChanged:
      return `<strong>${actor}</strong> changed due date from <i>${escapeText(formatActivityDateValue(activity.oldValue))}</i> to <i>${escapeText(formatActivityDateValue(activity.newValue))}</i>`;
    default:
      return `<strong>${actor}</strong> performed an update`;
  }
}

function getActivityIcon(type: ActivityType): string {
  switch (type) {
    case ActivityType.ProjectCreated:
    case ActivityType.TaskCreated:
      return 'pi pi-plus';
    case ActivityType.TaskStatusChanged:
      return 'pi pi-sync';
    case ActivityType.TaskDeleted:
    case ActivityType.ProjectDeleted:
      return 'pi pi-trash';
    case ActivityType.TaskAssigneeChanged:
      return 'pi pi-user-edit';
    case ActivityType.TaskDueDateChanged:
      return 'pi pi-calendar';
    case ActivityType.ProjectRenamed:
    case ActivityType.TaskRenamed:
      return 'pi pi-pencil';
    default:
      return 'pi pi-bolt';
  }
}

function getActivityIconColor(type: ActivityType): string {
  switch (type) {
    case ActivityType.ProjectDeleted:
    case ActivityType.TaskDeleted:
      return 'text-red-500';
    case ActivityType.TaskStatusChanged:
      return 'text-orange-500';
    case ActivityType.TaskCreated:
    case ActivityType.ProjectCreated:
      return 'text-green-500';
    default:
      return 'text-blue-500';
  }
}

function getActivityBackgroundColor(type: ActivityType): string {
  switch (type) {
    case ActivityType.ProjectDeleted:
    case ActivityType.TaskDeleted:
      return 'bg-red-100';
    case ActivityType.TaskStatusChanged:
      return 'bg-orange-100';
    case ActivityType.TaskCreated:
    case ActivityType.ProjectCreated:
      return 'bg-green-100';
    default:
      return 'bg-blue-100';
  }
}

function formatRelativeTime(value: string, nowUtcMs: number): string {
  const date = new Date(value);
  const diffSeconds = Math.max(1, Math.floor((nowUtcMs - date.getTime()) / 1000));

  if (diffSeconds < 60) {
    return `${diffSeconds}s ago`;
  }

  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

function formatTaskStatus(status?: TaskStatus | null): string {
  if (status === null || status === undefined) {
    return 'Unknown';
  }

  switch (status) {
    case TaskStatus.Todo:
      return 'Todo';
    case TaskStatus.InProgress:
      return 'In Progress';
    case TaskStatus.Done:
      return 'Done';
    default:
      return 'Unknown';
  }
}

function formatActivityDateValue(value?: string | null): string {
  if (!value || value.trim().length === 0) {
    return 'None';
  }

  const trimmed = value.trim();
  const parsedDate = new Date(trimmed);
  if (Number.isNaN(parsedDate.getTime())) {
    return trimmed;
  }

  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }).format(parsedDate);
}

function escapeText(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
