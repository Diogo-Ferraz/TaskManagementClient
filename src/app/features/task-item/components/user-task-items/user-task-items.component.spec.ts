import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { Router } from '@angular/router';
import { UserTaskItemsComponent } from './user-task-items.component';
import { TaskItemsApiClient } from '../../../../core/api/clients/task-items-api.client';
import { AuthService } from '../../../../core/auth/services/auth.service';
import { APP_ENVIRONMENT } from '../../../../core/config/app-environment.token';
import { MessageService } from 'primeng/api';

describe('UserTaskItemsComponent', () => {
  let component: UserTaskItemsComponent;
  let fixture: ComponentFixture<UserTaskItemsComponent>;
  const taskItemsApiClientMock = {
    getTasks: jasmine.createSpy('getTasks').and.returnValue(of([])),
    patch: jasmine.createSpy('patch').and.returnValue(of({}))
  };
  const authServiceMock = {
    authSession: jasmine.createSpy('authSession').and.returnValue(null),
    currentUserId: jasmine.createSpy('currentUserId').and.returnValue('user-1'),
    userClaims: jasmine.createSpy('userClaims').and.returnValue({ name: 'Demo User' }),
    hasAnyRole: jasmine.createSpy('hasAnyRole').and.returnValue(false)
  };
  const routerMock = {
    navigate: jasmine.createSpy('navigate').and.resolveTo(true)
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UserTaskItemsComponent],
      providers: [
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

    fixture = TestBed.createComponent(UserTaskItemsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
