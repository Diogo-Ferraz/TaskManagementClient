import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

import { AppTopbarComponent } from './app-topbar.component';
import { AuthService } from '../../../auth/services/auth.service';
import { AppPreferencesService } from '../../../preferences/app-preferences.service';

describe('AppTopbarComponent', () => {
  let component: AppTopbarComponent;
  let fixture: ComponentFixture<AppTopbarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppTopbarComponent],
      providers: [
        provideRouter([]),
        provideNoopAnimations(),
        {
          provide: AuthService,
          useValue: {
            isAuthenticated: () => true,
            authSession: () => null,
            userClaims: () => ({
              name: 'Demo Admin',
              email: 'demo-admin@example.com'
            }),
            startLoginRedirect: jasmine.createSpy('startLoginRedirect').and.resolveTo(),
            logout: jasmine.createSpy('logout')
          }
        },
        {
          provide: AppPreferencesService,
          useValue: {
            getDefaultHomeRoutePath: jasmine.createSpy('getDefaultHomeRoutePath').and.returnValue('/dashboard')
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
