import { AppEnvironment } from '../app/core/config/app-environment';

export const environment: AppEnvironment = {
  production: false,
  apiBaseUrl: 'https://api.localhost',
  authApiBaseUrl: 'https://auth.localhost',
  activityHubPath: '/hubs/activity',
  debugAuth: {
    enabled: false,
    allowedHosts: ['app.localhost']
  },
  auth: {
    authority: 'https://auth.localhost',
    clientId: 'angular-client',
    redirectUri: 'https://app.localhost/callback',
    postLogoutRedirectUri: 'https://app.localhost',
    responseType: 'code',
    scopes: ['openid', 'profile', 'email', 'roles', 'api1']
  }
};
