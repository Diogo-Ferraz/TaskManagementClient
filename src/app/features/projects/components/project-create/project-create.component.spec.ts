import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { Router } from '@angular/router';
import { ProjectCreateComponent } from './project-create.component';
import { ProjectsApiClient } from '../../../../core/api/clients/projects-api.client';
import { AuthService } from '../../../../core/auth/services/auth.service';
import { APP_ENVIRONMENT } from '../../../../core/config/app-environment.token';
import { MessageService } from 'primeng/api';

describe('ProjectCreateComponent', () => {
  let component: ProjectCreateComponent;
  let fixture: ComponentFixture<ProjectCreateComponent>;
  const projectsApiClientMock = {
    create: jasmine.createSpy('create').and.returnValue(
      of({
        id: 'project-1',
        name: 'Demo Project',
        description: 'Description',
        ownerUserId: 'user-1',
        createdAt: new Date().toISOString(),
        createdByUserId: 'user-1',
        createdByUserName: 'Demo User',
        lastModifiedAt: new Date().toISOString(),
        lastModifiedByUserId: 'user-1',
        lastModifiedByUserName: 'Demo User'
      })
    )
  };
  const routerMock = {
    navigate: jasmine.createSpy('navigate').and.resolveTo(true)
  };
  const authServiceMock = {
    authSession: jasmine.createSpy('authSession').and.returnValue(null)
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProjectCreateComponent],
      providers: [
        { provide: ProjectsApiClient, useValue: projectsApiClientMock },
        { provide: Router, useValue: routerMock },
        { provide: AuthService, useValue: authServiceMock },
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

    fixture = TestBed.createComponent(ProjectCreateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
