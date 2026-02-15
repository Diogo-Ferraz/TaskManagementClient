import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { DashboardComponent } from './dashboard.component';
import { DashboardApiClient } from '../../../../core/api/clients/dashboard-api.client';
import { ActivityApiClient } from '../../../../core/api/clients/activity-api.client';
import { ActivityHubRealtimeService } from '../../../../core/realtime/activity-hub-realtime.service';
import { AuthService } from '../../../../core/auth/services/auth.service';

describe('DashboardComponent', () => {
  let component: DashboardComponent;
  let fixture: ComponentFixture<DashboardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardComponent],
      providers: [
        {
          provide: DashboardApiClient,
          useValue: {
            getSummary: () =>
              of({
                assignedTasksCount: 0,
                tasksClosedThisWeekCount: 0,
                projectsCount: 0,
                overdueAssignedTasksCount: 0
              })
          }
        },
        {
          provide: ActivityApiClient,
          useValue: {
            getFeed: () => of([])
          }
        },
        {
          provide: ActivityHubRealtimeService,
          useValue: {
            connect: () => Promise.resolve(),
            disconnect: () => Promise.resolve(),
            activityCreated$: () => of()
          }
        },
        {
          provide: AuthService,
          useValue: {
            authSession: () => ({ isDebugSession: false })
          }
        }
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
