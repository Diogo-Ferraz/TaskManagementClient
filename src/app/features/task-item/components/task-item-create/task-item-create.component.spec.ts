import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { Router } from '@angular/router';
import { TaskItemCreateComponent } from './task-item-create.component';
import { TaskItemsApiClient } from '../../../../core/api/clients/task-items-api.client';
import { ProjectsApiClient } from '../../../../core/api/clients/projects-api.client';
import { AuthService } from '../../../../core/auth/services/auth.service';
import { APP_ENVIRONMENT } from '../../../../core/config/app-environment.token';
import { MessageService } from 'primeng/api';

describe('TaskItemCreateComponent', () => {
  let component: TaskItemCreateComponent;
  let fixture: ComponentFixture<TaskItemCreateComponent>;
  const taskItemsApiClientMock = {
    create: jasmine.createSpy('create').and.returnValue(
      of({
        id: 'task-1',
        title: 'Demo Task',
        description: 'Description',
        status: 0,
        dueDate: null,
        projectId: 'project-1',
        projectName: 'Demo Project',
        assignedUserId: null,
        assignedUserName: 'Unassigned',
        createdAt: new Date().toISOString(),
        createdByUserId: 'user-1',
        createdByUserName: 'Demo User',
        lastModifiedAt: new Date().toISOString(),
        lastModifiedByUserId: 'user-1',
        lastModifiedByUserName: 'Demo User'
      })
    )
  };
  const projectsApiClientMock = {
    getProjects: jasmine.createSpy('getProjects').and.returnValue(of([]))
  };
  const authServiceMock = {
    authSession: jasmine.createSpy('authSession').and.returnValue(null)
  };
  const routerMock = {
    navigate: jasmine.createSpy('navigate').and.resolveTo(true)
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TaskItemCreateComponent],
      providers: [
        { provide: TaskItemsApiClient, useValue: taskItemsApiClientMock },
        { provide: ProjectsApiClient, useValue: projectsApiClientMock },
        { provide: AuthService, useValue: authServiceMock },
        { provide: Router, useValue: routerMock },
        MessageService,
        {
          provide: APP_ENVIRONMENT,
          useValue: {
            production: true,
            apiBaseUrl: 'https://localhost:44320',
            authApiBaseUrl: 'https://localhost:44377',
            activityHubPath: '/hubs/activity',
            debugAuth: { enabled: false, allowedHosts: [] },
            auth: {
              authority: 'https://localhost:44377',
              clientId: 'angular-client',
              redirectUri: 'http://localhost:4200/callback',
              postLogoutRedirectUri: 'http://localhost:4200',
              responseType: 'code',
              scopes: ['openid', 'profile', 'email', 'roles', 'api1']
            }
          }
        }
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TaskItemCreateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
