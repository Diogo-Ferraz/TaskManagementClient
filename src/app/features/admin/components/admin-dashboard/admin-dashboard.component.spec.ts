import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { AdminUsersApiClient } from '../../../../core/api/clients/admin-users-api.client';
import { AdminDashboardComponent } from './admin-dashboard.component';
import { AuthService } from '../../../../core/auth/services/auth.service';
import { APP_ENVIRONMENT } from '../../../../core/config/app-environment.token';

describe('AdminDashboardComponent', () => {
  let component: AdminDashboardComponent;
  let fixture: ComponentFixture<AdminDashboardComponent>;

  beforeEach(async () => {
    const adminUsersApiClientMock = {
      getUsers: jasmine.createSpy('getUsers').and.returnValue(
        of({
          total: 1,
          skip: 0,
          take: 25,
          items: [
            {
              id: 'user-1',
              displayName: 'Demo Admin',
              userName: 'demo-admin',
              email: 'demo-admin@example.com',
              isActive: true,
              roles: ['Administrator']
            }
          ]
        })
      ),
      setStatus: jasmine.createSpy('setStatus').and.returnValue(of(void 0))
    };

    await TestBed.configureTestingModule({
      imports: [AdminDashboardComponent],
      providers: [
        { provide: AdminUsersApiClient, useValue: adminUsersApiClientMock },
        {
          provide: AuthService,
          useValue: {
            authSession: () => null
          }
        },
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
    }).compileComponents();

    fixture = TestBed.createComponent(AdminDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
    expect(component.users.length).toBe(1);
  });
});
