import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const managerOrAdminGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.hasAnyRole(['Administrator', 'ProjectManager'])) {
    return true;
  }

  return router.createUrlTree(['/unauthorized']);
};
