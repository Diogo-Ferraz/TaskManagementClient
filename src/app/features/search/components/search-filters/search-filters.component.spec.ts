import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { SearchFiltersComponent } from './search-filters.component';
import { ProjectsApiClient } from '../../../../core/api/clients/projects-api.client';
import { TaskItemsApiClient } from '../../../../core/api/clients/task-items-api.client';
import { AuthService } from '../../../../core/auth/services/auth.service';
import { APP_ENVIRONMENT } from '../../../../core/config/app-environment.token';

describe('SearchFiltersComponent', () => {
  let component: SearchFiltersComponent;
  let fixture: ComponentFixture<SearchFiltersComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SearchFiltersComponent],
      providers: [
        {
          provide: ProjectsApiClient,
          useValue: {
            getProjects: () => of([{ id: 'project-1', name: 'Project One' }]),
            getMembers: () => of([{ userId: 'user-1', displayName: 'Alice Example', isOwner: false }])
          }
        },
        {
          provide: TaskItemsApiClient,
          useValue: {
            getTasks: () => of([])
          }
        },
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

    fixture = TestBed.createComponent(SearchFiltersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
