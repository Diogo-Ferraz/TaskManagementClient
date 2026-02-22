import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';

import { routes } from './app.routes';
import { provideAnimations } from '@angular/platform-browser/animations';
import { ConfirmationService, MessageService } from 'primeng/api';
import { environment } from '../environments/environment';
import { APP_ENVIRONMENT } from './core/config/app-environment.token';
import { authInterceptor } from './core/auth/interceptors/auth.interceptor';
import { problemDetailsInterceptor } from './core/http/interceptors/problem-details.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor, problemDetailsInterceptor])),
    provideAnimations(),
    ConfirmationService,
    MessageService,
    {
      provide: APP_ENVIRONMENT,
      useValue: environment
    }
  ]
};
