import { CanActivateFn } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);

  const debugSession = authService.authSession();
  if (debugSession?.isDebugSession && authService.canStartDebugSession()) {
    return true;
  }

  if (authService.isAuthenticated()) {
    return true;
  }

  void authService.startLoginRedirect();
  return false;
};
