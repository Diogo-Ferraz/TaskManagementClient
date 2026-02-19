import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { authGuard } from './auth.guard';

describe('authGuard', () => {
  it('allows navigation when user is authenticated', () => {
    const authServiceMock = {
      isAuthenticated: () => true,
      authSession: () => null,
      canStartDebugSession: () => false
    };

    const routerMock = {
      createUrlTree: jasmine.createSpy('createUrlTree')
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: authServiceMock },
        { provide: Router, useValue: routerMock }
      ]
    });

    const canActivate = TestBed.runInInjectionContext(() => authGuard({} as never, {} as never));
    expect(canActivate).toBeTrue();
    expect(routerMock.createUrlTree).not.toHaveBeenCalled();
  });

  it('redirects to unauthorized when user is not authenticated', () => {
    const redirectTree = {} as never;
    const authServiceMock = {
      isAuthenticated: () => false,
      authSession: () => null,
      canStartDebugSession: () => false
    };

    const routerMock = {
      createUrlTree: jasmine.createSpy('createUrlTree').and.returnValue(redirectTree)
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: authServiceMock },
        { provide: Router, useValue: routerMock }
      ]
    });

    const canActivate = TestBed.runInInjectionContext(() => authGuard({} as never, {} as never));
    expect(canActivate).toBe(redirectTree);
    expect(routerMock.createUrlTree).toHaveBeenCalledWith(['/unauthorized']);
  });

  it('allows navigation when debug session is active in preview mode', () => {
    const authServiceMock = {
      isAuthenticated: () => false,
      authSession: () => ({ isDebugSession: true }),
      canStartDebugSession: () => true
    };

    const routerMock = {
      createUrlTree: jasmine.createSpy('createUrlTree')
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: authServiceMock },
        { provide: Router, useValue: routerMock }
      ]
    });

    const canActivate = TestBed.runInInjectionContext(() => authGuard({} as never, {} as never));
    expect(canActivate).toBeTrue();
    expect(routerMock.createUrlTree).not.toHaveBeenCalled();
  });
});
