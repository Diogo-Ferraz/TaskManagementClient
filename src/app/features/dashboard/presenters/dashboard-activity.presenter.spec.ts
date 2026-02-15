import { ActivityType } from '../../../core/api/models/activity-type.enum';
import { TaskStatus } from '../../../core/api/models/task-status.enum';
import { mapActivityToRecentActivity } from './dashboard-activity.presenter';

describe('dashboard-activity.presenter', () => {
  it('maps task status changes with readable status labels', () => {
    const event = mapActivityToRecentActivity(
      {
        id: '1',
        type: ActivityType.TaskStatusChanged,
        taskTitle: 'Update auth flow',
        actorUserId: 'user-1',
        actorDisplayName: 'Demo User',
        oldStatus: TaskStatus.Todo,
        newStatus: TaskStatus.InProgress,
        occurredAt: '2026-02-15T10:00:00.000Z'
      },
      new Date('2026-02-15T10:30:00.000Z').getTime()
    );

    expect(event.summary).toContain('Todo');
    expect(event.summary).toContain('In Progress');
    expect(event.icon).toBe('pi pi-sync');
    expect(event.time).toBe('30m ago');
  });

  it('escapes user-controlled text in summary', () => {
    const event = mapActivityToRecentActivity({
      id: '2',
      type: ActivityType.TaskCreated,
      taskTitle: '<script>alert("x")</script>',
      actorUserId: 'user-2',
      actorDisplayName: '<b>Hacker</b>',
      occurredAt: '2026-02-15T10:00:00.000Z'
    });

    expect(event.summary).not.toContain('<script>');
    expect(event.summary).toContain('&lt;script&gt;');
    expect(event.summary).not.toContain('<b>Hacker</b>');
  });

  it('uses deletion visual semantics for deleted activities', () => {
    const event = mapActivityToRecentActivity({
      id: '3',
      type: ActivityType.ProjectDeleted,
      projectName: 'Legacy Portal',
      actorUserId: 'user-3',
      actorDisplayName: 'Admin',
      occurredAt: '2026-02-15T10:00:00.000Z'
    });

    expect(event.icon).toBe('pi pi-trash');
    expect(event.iconColor).toBe('text-red-500');
    expect(event.bgColor).toBe('bg-red-100');
  });
});
