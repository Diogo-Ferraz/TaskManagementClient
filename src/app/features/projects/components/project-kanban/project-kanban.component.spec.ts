import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { BehaviorSubject, of } from 'rxjs';

import { ProjectKanbanComponent } from './project-kanban.component';
import { ProjectsApiClient } from '../../../../core/api/clients/projects-api.client';
import { TaskItemsApiClient } from '../../../../core/api/clients/task-items-api.client';
import { MessageService } from 'primeng/api';
import { TaskStatus } from '../../../../core/api/models/task-status.enum';

describe('ProjectKanbanComponent', () => {
  let component: ProjectKanbanComponent;
  let fixture: ComponentFixture<ProjectKanbanComponent>;
  const queryParamMap$ = new BehaviorSubject(convertToParamMap({}));

  beforeEach(async () => {
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
          useValue: {
            getProjects: () => of([{ id: 'project-1', name: 'Project One' }]),
            getMembers: () => of([])
          }
        },
        {
          provide: TaskItemsApiClient,
          useValue: {
            getTasks: () =>
              of([
                {
                  id: 'task-1',
                  title: 'My Task',
                  status: TaskStatus.Todo,
                  projectId: 'project-1',
                  projectName: 'Project One',
                  assignedUserName: 'Unassigned',
                  createdAt: '2026-02-15T10:00:00.000Z',
                  createdByUserId: 'user-1',
                  createdByUserName: 'Demo',
                  lastModifiedAt: '2026-02-15T10:00:00.000Z',
                  lastModifiedByUserId: 'user-1',
                  lastModifiedByUserName: 'Demo'
                }
              ]),
            patch: () =>
              of({
                id: 'task-1',
                title: 'My Task',
                status: TaskStatus.InProgress,
                projectId: 'project-1',
                projectName: 'Project One',
                assignedUserName: 'Unassigned',
                createdAt: '2026-02-15T10:00:00.000Z',
                createdByUserId: 'user-1',
                createdByUserName: 'Demo',
                lastModifiedAt: '2026-02-15T10:00:00.000Z',
                lastModifiedByUserId: 'user-1',
                lastModifiedByUserName: 'Demo'
              })
          }
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
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
