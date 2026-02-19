import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

import { TaskCalendarComponent } from './task-calendar.component';
import { TaskItemsApiClient } from '../../../../core/api/clients/task-items-api.client';
import { AuthService } from '../../../../core/auth/services/auth.service';

describe('TaskCalendarComponent', () => {
  let component: TaskCalendarComponent;
  let fixture: ComponentFixture<TaskCalendarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TaskCalendarComponent],
      providers: [
        provideRouter([]),
        provideNoopAnimations(),
        {
          provide: AuthService,
          useValue: {
            currentUserId: () => 'user-1',
            authSession: () => ({ isDebugSession: false }),
            isAuthenticated: () => true
          }
        },
        {
          provide: TaskItemsApiClient,
          useValue: {
            getTasks: () => of([])
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(TaskCalendarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
