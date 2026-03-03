import { AppEnvironment } from '../app/core/config/app-environment';

export const environment: AppEnvironment = {
  production: false,
  apiBaseUrl: 'https://api.144.24.250.76.nip.io',
  authApiBaseUrl: 'https://auth.144.24.250.76.nip.io',
  activityHubPath: '/hubs/activity',
  debugAuth: {
    enabled: false,
    allowedHosts: ['app.144.24.250.76.nip.io']
  },
  auth: {
    authority: 'https://auth.144.24.250.76.nip.io',
    clientId: 'angular-client',
    redirectUri: 'https://app.144.24.250.76.nip.io/callback',
    postLogoutRedirectUri: 'https://app.144.24.250.76.nip.io',
    responseType: 'code',
    scopes: ['openid', 'profile', 'email', 'roles', 'api1']
  }
};
