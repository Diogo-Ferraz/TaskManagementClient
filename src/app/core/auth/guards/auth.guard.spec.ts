import { TestBed } from '@angular/core/testing';
import { AuthService } from '../services/auth.service';
import { authGuard } from './auth.guard';

describe('authGuard', () => {
  it('allows navigation when user is authenticated', () => {
    const authServiceMock = {
      isAuthenticated: () => true,
      authSession: () => null,
      canStartDebugSession: () => false,
      startLoginRedirect: jasmine.createSpy('startLoginRedirect').and.resolveTo()
    };

    TestBed.configureTestingModule({
      providers: [{ provide: AuthService, useValue: authServiceMock }]
    });

    const canActivate = TestBed.runInInjectionContext(() => authGuard({} as never, {} as never));
    expect(canActivate).toBeTrue();
    expect(authServiceMock.startLoginRedirect).not.toHaveBeenCalled();
  });

  it('starts login redirect when user is not authenticated', () => {
    const authServiceMock = {
      isAuthenticated: () => false,
      authSession: () => null,
      canStartDebugSession: () => false,
      startLoginRedirect: jasmine.createSpy('startLoginRedirect').and.resolveTo()
    };

    TestBed.configureTestingModule({
      providers: [{ provide: AuthService, useValue: authServiceMock }]
    });

    const canActivate = TestBed.runInInjectionContext(() => authGuard({} as never, {} as never));
    expect(canActivate).toBeFalse();
    expect(authServiceMock.startLoginRedirect).toHaveBeenCalled();
  });

  it('allows navigation when debug session is active in preview mode', () => {
    const authServiceMock = {
      isAuthenticated: () => false,
      authSession: () => ({ isDebugSession: true }),
      canStartDebugSession: () => true,
      startLoginRedirect: jasmine.createSpy('startLoginRedirect').and.resolveTo()
    };

    TestBed.configureTestingModule({
      providers: [{ provide: AuthService, useValue: authServiceMock }]
    });

    const canActivate = TestBed.runInInjectionContext(() => authGuard({} as never, {} as never));
    expect(canActivate).toBeTrue();
    expect(authServiceMock.startLoginRedirect).not.toHaveBeenCalled();
  });
});
