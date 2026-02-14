import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { AppTopbarComponent } from './app-topbar.component';
import { AuthService } from '../../../auth/services/auth.service';

describe('AppTopbarComponent', () => {
  let component: AppTopbarComponent;
  let fixture: ComponentFixture<AppTopbarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppTopbarComponent],
      providers: [
        provideRouter([]),
        {
          provide: AuthService,
          useValue: {
            isAuthenticated: () => true,
            startLoginRedirect: jasmine.createSpy('startLoginRedirect').and.resolveTo(),
            logout: jasmine.createSpy('logout')
          }
        }
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AppTopbarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
