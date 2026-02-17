import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { Router } from '@angular/router';
import { TaskItemListComponent } from './task-item-list.component';
import { ProjectsApiClient } from '../../../../core/api/clients/projects-api.client';
import { TaskItemsApiClient } from '../../../../core/api/clients/task-items-api.client';
import { AuthService } from '../../../../core/auth/services/auth.service';
import { APP_ENVIRONMENT } from '../../../../core/config/app-environment.token';
import { MessageService } from 'primeng/api';

describe('TaskItemListComponent', () => {
  let component: TaskItemListComponent;
  let fixture: ComponentFixture<TaskItemListComponent>;
  const projectsApiClientMock = {
    getProjects: jasmine.createSpy('getProjects').and.returnValue(of([]))
  };
  const taskItemsApiClientMock = {
    getTasks: jasmine.createSpy('getTasks').and.returnValue(of([])),
    patch: jasmine.createSpy('patch').and.returnValue(of({}))
  };
  const authServiceMock = {
    authSession: jasmine.createSpy('authSession').and.returnValue(null),
    currentUserId: jasmine.createSpy('currentUserId').and.returnValue('user-1'),
    hasAnyRole: jasmine.createSpy('hasAnyRole').and.returnValue(false),
    userClaims: jasmine.createSpy('userClaims').and.returnValue({})
  };
  const routerMock = {
    navigate: jasmine.createSpy('navigate').and.resolveTo(true)
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TaskItemListComponent],
      providers: [
        { provide: ProjectsApiClient, useValue: projectsApiClientMock },
        { provide: TaskItemsApiClient, useValue: taskItemsApiClientMock },
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

    fixture = TestBed.createComponent(TaskItemListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
