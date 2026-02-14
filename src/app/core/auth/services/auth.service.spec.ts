import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { APP_ENVIRONMENT } from '../../config/app-environment.token';
import { AppEnvironment } from '../../config/app-environment';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  const appEnvironment: AppEnvironment = {
    production: false,
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

  let authService: AuthService;
  let httpController: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: APP_ENVIRONMENT, useValue: appEnvironment }
      ]
    });

    authService = TestBed.inject(AuthService);
    httpController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpController.verify();
  });

  it('stores tokens after successful callback exchange', () => {
    sessionStorage.setItem(
      'task_management.auth.pkce_request',
      JSON.stringify({ state: 'abc123', verifier: 'pkce-verifier', createdAtUtcMs: Date.now() })
    );

    const queryParams = new URLSearchParams({
      code: 'auth-code',
      state: 'abc123'
    });

    authService.completeLoginFromCallback(queryParams).subscribe();

    const request = httpController.expectOne('https://localhost:44377/connect/token');
    expect(request.request.method).toBe('POST');

    request.flush({
      access_token: 'access.token.value',
      token_type: 'Bearer',
      expires_in: 3600,
      scope: 'openid profile',
      id_token: 'id.token.value'
    });

    expect(authService.isAuthenticated()).toBeTrue();
    expect(authService.accessToken()).toBe('access.token.value');
  });

  it('extracts roles from role claim', () => {
    const payload = btoa(JSON.stringify({ role: 'Administrator' }))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/g, '');

    localStorage.setItem(
      'task_management.auth.session',
      JSON.stringify({
        accessToken: `header.${payload}.signature`,
        tokenType: 'Bearer',
        expiresAtUtcMs: Date.now() + 60_000
      })
    );

    const rehydratedService = TestBed.runInInjectionContext(() => new AuthService());
    expect(rehydratedService.hasRole('Administrator')).toBeTrue();
  });
});
