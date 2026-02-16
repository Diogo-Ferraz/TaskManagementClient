import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { AdminUsersApiClient } from '../../../../core/api/clients/admin-users-api.client';
import { AdminDashboardComponent } from './admin-dashboard.component';

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
      providers: [{ provide: AdminUsersApiClient, useValue: adminUsersApiClientMock }]
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
