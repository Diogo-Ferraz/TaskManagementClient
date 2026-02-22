import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { MANAGEMENT_ROLES } from '../models/app-role.model';
import { AuthService } from '../services/auth.service';

export const managerOrAdminGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.hasAnyRole([...MANAGEMENT_ROLES])) {
    return true;
  }

  return router.createUrlTree(['/unauthorized']);
};
