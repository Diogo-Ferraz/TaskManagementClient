export interface AppEnvironment {
  production: boolean;
  apiBaseUrl: string;
  authApiBaseUrl: string;
  activityHubPath: string;
  auth: {
    authority: string;
    clientId: string;
    redirectUri: string;
    postLogoutRedirectUri: string;
    responseType: 'code';
    scopes: string[];
  };
}
