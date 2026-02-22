import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { Router } from '@angular/router';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ProjectListComponent } from './project-list.component';
import { ProjectsApiClient } from '../../../../core/api/clients/projects-api.client';
import { AuthService } from '../../../../core/auth/services/auth.service';
import { APP_ENVIRONMENT } from '../../../../core/config/app-environment.token';

describe('ProjectListComponent', () => {
  let component: ProjectListComponent;
  let fixture: ComponentFixture<ProjectListComponent>;
  const projectsApiClientMock = {
    getProjects: jasmine.createSpy('getProjects').and.returnValue(of([])),
    delete: jasmine.createSpy('delete').and.returnValue(of(void 0))
  };
  const routerMock = {
    navigate: jasmine.createSpy('navigate').and.resolveTo(true)
  };
  const authServiceMock = {
    authSession: jasmine.createSpy('authSession').and.returnValue(null),
    hasAnyRole: jasmine.createSpy('hasAnyRole').and.returnValue(true),
    hasRole: jasmine.createSpy('hasRole').and.returnValue(false),
    currentUserId: jasmine.createSpy('currentUserId').and.returnValue('test-user')
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProjectListComponent],
      providers: [
        { provide: ProjectsApiClient, useValue: projectsApiClientMock },
        { provide: Router, useValue: routerMock },
        { provide: AuthService, useValue: authServiceMock },
        ConfirmationService,
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

    fixture = TestBed.createComponent(ProjectListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
