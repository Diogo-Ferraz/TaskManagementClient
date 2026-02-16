import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { adminRoleGuard } from './admin-role.guard';

describe('adminRoleGuard', () => {
  it('allows navigation for administrators', () => {
    const authServiceMock = {
      hasRole: (role: string) => role === 'Administrator'
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

    const canActivate = TestBed.runInInjectionContext(() => adminRoleGuard({} as never, {} as never));
    expect(canActivate).toBeTrue();
    expect(routerMock.createUrlTree).not.toHaveBeenCalled();
  });

  it('redirects non-admin users to dashboard', () => {
    const redirectTree = {} as never;
    const authServiceMock = {
      hasRole: () => false
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

    const canActivate = TestBed.runInInjectionContext(() => adminRoleGuard({} as never, {} as never));
    expect(canActivate).toBe(redirectTree);
    expect(routerMock.createUrlTree).toHaveBeenCalledWith(['/dashboard']);
  });
});
