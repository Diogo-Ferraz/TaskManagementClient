import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { APP_ENVIRONMENT } from '../../config/app-environment.token';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const authService = inject(AuthService);
  const appEnvironment = inject(APP_ENVIRONMENT);
  const accessToken = authService.accessToken();

  if (!accessToken) {
    return next(request);
  }

  const shouldAttachToken =
    request.url.startsWith(appEnvironment.apiBaseUrl) ||
    request.url.startsWith(appEnvironment.authApiBaseUrl) ||
    request.url.startsWith('/api/') ||
    request.url.startsWith('api/');

  if (!shouldAttachToken) {
    return next(request);
  }

  const authenticatedRequest = request.clone({
    setHeaders: {
      Authorization: `Bearer ${accessToken}`
    }
  });

  return next(authenticatedRequest);
};
