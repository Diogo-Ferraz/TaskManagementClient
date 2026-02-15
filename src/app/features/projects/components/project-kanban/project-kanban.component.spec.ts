import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { BehaviorSubject, of, Subject } from 'rxjs';

import { ProjectKanbanComponent } from './project-kanban.component';
import { ProjectsApiClient } from '../../../../core/api/clients/projects-api.client';
import { TaskItemsApiClient } from '../../../../core/api/clients/task-items-api.client';
import { MessageService } from 'primeng/api';
import { TaskStatus } from '../../../../core/api/models/task-status.enum';
import { TaskItemDto } from '../../../../core/api/models/task-item.model';

describe('ProjectKanbanComponent', () => {
  let component: ProjectKanbanComponent;
  let fixture: ComponentFixture<ProjectKanbanComponent>;
  let projectsApiClient: jasmine.SpyObj<ProjectsApiClient>;
  let taskItemsApiClient: jasmine.SpyObj<TaskItemsApiClient>;
  let messageService: MessageService;
  const queryParamMap$ = new BehaviorSubject(convertToParamMap({ projectId: 'project-1' }));
  const baseTask: TaskItemDto = {
    id: 'task-1',
    title: 'My Task',
    description: null,
    status: TaskStatus.Todo,
    dueDate: null,
    projectId: 'project-1',
    projectName: 'Project One',
    assignedUserId: null,
    assignedUserName: 'Unassigned',
    createdAt: '2026-02-15T10:00:00.000Z',
    createdByUserId: 'user-1',
    createdByUserName: 'Demo',
    lastModifiedAt: '2026-02-15T10:00:00.000Z',
    lastModifiedByUserId: 'user-1',
    lastModifiedByUserName: 'Demo'
  };

  beforeEach(async () => {
    projectsApiClient = jasmine.createSpyObj<ProjectsApiClient>('ProjectsApiClient', ['getProjects', 'getMembers']);
    taskItemsApiClient = jasmine.createSpyObj<TaskItemsApiClient>('TaskItemsApiClient', ['getTasks', 'patch']);

    projectsApiClient.getProjects.and.returnValue(of([{ id: 'project-1', name: 'Project One' } as never]));
    projectsApiClient.getMembers.and.returnValue(
      of([
        { userId: 'user-2', displayName: 'Alice Example', isOwner: false } as never
      ])
    );
    taskItemsApiClient.getTasks.and.returnValue(of([{ ...baseTask }]));
    taskItemsApiClient.patch.and.returnValue(of({ ...baseTask, status: TaskStatus.InProgress }));

    await TestBed.configureTestingModule({
      imports: [ProjectKanbanComponent],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            queryParamMap: queryParamMap$.asObservable()
          }
        },
        {
          provide: ProjectsApiClient,
          useValue: projectsApiClient
        },
        {
          provide: TaskItemsApiClient,
          useValue: taskItemsApiClient
        },
        {
          provide: MessageService,
          useClass: MessageService
        }
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ProjectKanbanComponent);
    component = fixture.componentInstance;
    messageService = TestBed.inject(MessageService);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('applies optimistic status change and keeps server result on success', () => {
    const patchResult$ = new Subject<TaskItemDto>();
    taskItemsApiClient.patch.and.returnValue(patchResult$.asObservable());
    spyOn(messageService, 'add');

    const task = component.getTasksByStatus(TaskStatus.Todo)[0];
    component.onDragStart(task);
    component.onDrop(TaskStatus.InProgress);

    expect(component.getTasksByStatus(TaskStatus.Todo).length).toBe(0);
    expect(component.getTasksByStatus(TaskStatus.InProgress).length).toBe(1);
    expect(taskItemsApiClient.patch).toHaveBeenCalledWith('task-1', { status: TaskStatus.InProgress });

    patchResult$.next({ ...baseTask, status: TaskStatus.InProgress });
    patchResult$.complete();

    expect(messageService.add).toHaveBeenCalledWith(
      jasmine.objectContaining({ severity: 'success' })
    );
    expect(component.getTasksByStatus(TaskStatus.InProgress).length).toBe(1);
  });

  it('rolls back optimistic status change when patch fails', () => {
    const patchResult$ = new Subject<TaskItemDto>();
    taskItemsApiClient.patch.and.returnValue(patchResult$.asObservable());
    spyOn(messageService, 'add');

    const task = component.getTasksByStatus(TaskStatus.Todo)[0];
    component.onDragStart(task);
    component.onDrop(TaskStatus.InProgress);

    expect(component.getTasksByStatus(TaskStatus.InProgress).length).toBe(1);

    patchResult$.error(new Error('failed'));

    expect(messageService.add).toHaveBeenCalledWith(
      jasmine.objectContaining({ severity: 'error' })
    );
    expect(component.getTasksByStatus(TaskStatus.Todo).length).toBe(1);
    expect(component.getTasksByStatus(TaskStatus.InProgress).length).toBe(0);
  });

  it('applies optimistic assignee change and keeps server result on success', () => {
    const patchResult$ = new Subject<TaskItemDto>();
    taskItemsApiClient.patch.and.returnValue(patchResult$.asObservable());
    spyOn(messageService, 'add');

    const task = component.getTasksByStatus(TaskStatus.Todo)[0];
    component.onAssigneeChanged(task, 'user-2');

    expect(taskItemsApiClient.patch).toHaveBeenCalledWith('task-1', { assignedUserId: 'user-2' });
    expect(component.getTasksByStatus(TaskStatus.Todo)[0].assignedUserId).toBe('user-2');
    expect(component.getTasksByStatus(TaskStatus.Todo)[0].assignedUserName).toBe('Alice Example');

    patchResult$.next({ ...baseTask, assignedUserId: 'user-2', assignedUserName: 'Alice Example' });
    patchResult$.complete();

    expect(messageService.add).toHaveBeenCalledWith(
      jasmine.objectContaining({ severity: 'success' })
    );
    expect(component.getTasksByStatus(TaskStatus.Todo)[0].assignedUserName).toBe('Alice Example');
  });

  it('rolls back optimistic due date change when patch fails', () => {
    const patchResult$ = new Subject<TaskItemDto>();
    taskItemsApiClient.patch.and.returnValue(patchResult$.asObservable());
    spyOn(messageService, 'add');

    const newDueDate = new Date('2026-02-20T00:00:00.000Z');
    const task = component.getTasksByStatus(TaskStatus.Todo)[0];
    component.onDueDateChanged(task, newDueDate);

    expect(taskItemsApiClient.patch).toHaveBeenCalledWith('task-1', { dueDate: newDueDate.toISOString() });
    expect(component.getTasksByStatus(TaskStatus.Todo)[0].dueDate).toBe(newDueDate.toISOString());

    patchResult$.error(new Error('failed'));

    expect(messageService.add).toHaveBeenCalledWith(
      jasmine.objectContaining({ severity: 'error' })
    );
    expect(component.getTasksByStatus(TaskStatus.Todo)[0].dueDate).toBeNull();
  });
});
