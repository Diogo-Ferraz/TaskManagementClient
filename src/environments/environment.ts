import { AppEnvironment } from '../app/core/config/app-environment';

export const environment: AppEnvironment = {
  production: true,
  apiBaseUrl: 'https://localhost:44320',
  authApiBaseUrl: 'https://localhost:44377',
  activityHubPath: '/hubs/activity',
  auth: {
    authority: 'https://localhost:44377',
    clientId: 'angular-client',
    redirectUri: 'http://localhost:4200/callback',
    postLogoutRedirectUri: 'http://localhost:4200',
    responseType: 'code',
    scopes: ['openid', 'profile', 'email', 'roles', 'api1']
  }
};
