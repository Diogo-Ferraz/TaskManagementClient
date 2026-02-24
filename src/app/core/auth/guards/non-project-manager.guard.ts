import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AppRole } from '../models/app-role.model';
import { AuthService } from '../services/auth.service';

export const nonProjectManagerGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.hasRole(AppRole.ProjectManager)) {
    return true;
  }

  return router.createUrlTree(['/unauthorized']);
};
