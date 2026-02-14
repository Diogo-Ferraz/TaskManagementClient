import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { map, Observable } from 'rxjs';
import { APP_ENVIRONMENT } from '../../config/app-environment.token';
import {
  AuthSession,
  PkceAuthorizationRequestState,
  TokenResponse
} from '../models/auth-session.model';

const SESSION_STORAGE_KEY = 'task_management.auth.session';
const PKCE_REQUEST_STORAGE_KEY = 'task_management.auth.pkce_request';
const PKCE_STATE_TTL_MS = 10 * 60 * 1000;

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly appEnvironment = inject(APP_ENVIRONMENT);
  private readonly authSessionSignal = signal<AuthSession | null>(null);

  readonly authSession = this.authSessionSignal.asReadonly();
  readonly isAuthenticated = computed(() => this.hasValidSession(this.authSessionSignal()));
  readonly accessToken = computed(() => this.authSessionSignal()?.accessToken ?? null);
  readonly userRoles = computed(() => this.extractRolesFromSession(this.authSessionSignal()));

  constructor() {
    this.hydrateAuthSession();
  }

  async startLoginRedirect(): Promise<void> {
    const state = this.createRandomUrlSafeString(32);
    const verifier = this.createRandomUrlSafeString(64);
    const challenge = await this.createPkceChallenge(verifier);

    const requestState: PkceAuthorizationRequestState = {
      state,
      verifier,
      createdAtUtcMs: Date.now()
    };

    sessionStorage.setItem(PKCE_REQUEST_STORAGE_KEY, JSON.stringify(requestState));

    const authorizeUrl = this.createAuthorizeUrl(state, challenge);
    window.location.assign(authorizeUrl);
  }

  completeLoginFromCallback(queryParams: URLSearchParams): Observable<void> {
    const error = queryParams.get('error');
    if (error) {
      const description = queryParams.get('error_description') ?? 'Authorization failed.';
      throw new Error(`${error}: ${description}`);
    }

    const code = queryParams.get('code');
    const state = queryParams.get('state');
    if (!code || !state) {
      throw new Error('Authorization callback is missing code/state.');
    }

    const requestState = this.readAndValidatePkceRequest(state);
    const tokenUrl = `${this.appEnvironment.auth.authority.replace(/\/$/, '')}/connect/token`;

    const body = new HttpParams({
      fromObject: {
        grant_type: 'authorization_code',
        client_id: this.appEnvironment.auth.clientId,
        code,
        redirect_uri: this.appEnvironment.auth.redirectUri,
        code_verifier: requestState.verifier
      }
    }).toString();

    return this.http
      .post<TokenResponse>(tokenUrl, body, {
        headers: new HttpHeaders({
          'Content-Type': 'application/x-www-form-urlencoded'
        })
      })
      .pipe(
        map((response) => {
          const session: AuthSession = {
            accessToken: response.access_token,
            idToken: response.id_token,
            tokenType: response.token_type,
            scope: response.scope,
            expiresAtUtcMs: Date.now() + response.expires_in * 1000
          };

          this.setSession(session);
          sessionStorage.removeItem(PKCE_REQUEST_STORAGE_KEY);
        })
      );
  }

  logout(): void {
    const idToken = this.authSessionSignal()?.idToken;
    this.clearSession();

    const logoutUrl = this.createLogoutUrl(idToken);
    window.location.assign(logoutUrl);
  }

  openRegisterPage(): void {
    const registerUrl = `${this.appEnvironment.auth.authority.replace(/\/$/, '')}/Identity/Account/Register`;
    window.location.assign(registerUrl);
  }

  hasRole(role: string): boolean {
    return this.userRoles().includes(role);
  }

  hasAnyRole(roles: string[]): boolean {
    const activeRoles = this.userRoles();
    return roles.some((role) => activeRoles.includes(role));
  }

  private createAuthorizeUrl(state: string, challenge: string): string {
    const authorizeEndpoint = `${this.appEnvironment.auth.authority.replace(/\/$/, '')}/connect/authorize`;
    const scopes = this.appEnvironment.auth.scopes.join(' ');
    const params = new URLSearchParams({
      response_type: this.appEnvironment.auth.responseType,
      client_id: this.appEnvironment.auth.clientId,
      redirect_uri: this.appEnvironment.auth.redirectUri,
      scope: scopes,
      state,
      code_challenge: challenge,
      code_challenge_method: 'S256'
    });

    return `${authorizeEndpoint}?${params.toString()}`;
  }

  private createLogoutUrl(idTokenHint?: string): string {
    const logoutEndpoint = `${this.appEnvironment.auth.authority.replace(/\/$/, '')}/connect/logout`;
    const params = new URLSearchParams({
      client_id: this.appEnvironment.auth.clientId,
      post_logout_redirect_uri: this.appEnvironment.auth.postLogoutRedirectUri
    });

    if (idTokenHint) {
      params.set('id_token_hint', idTokenHint);
    }

    return `${logoutEndpoint}?${params.toString()}`;
  }

  private async createPkceChallenge(verifier: string): Promise<string> {
    const digest = await this.sha256(verifier);
    return this.base64UrlEncodeBytes(digest);
  }

  private async sha256(value: string): Promise<Uint8Array> {
    const bytes = new TextEncoder().encode(value);
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    return new Uint8Array(digest);
  }

  private createRandomUrlSafeString(bytes: number): string {
    const randomBytes = new Uint8Array(bytes);
    crypto.getRandomValues(randomBytes);
    return this.base64UrlEncodeBytes(randomBytes);
  }

  private base64UrlEncodeBytes(bytes: Uint8Array): string {
    let binary = '';
    for (const byte of bytes) {
      binary += String.fromCharCode(byte);
    }

    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
  }

  private readAndValidatePkceRequest(stateFromCallback: string): PkceAuthorizationRequestState {
    const rawState = sessionStorage.getItem(PKCE_REQUEST_STORAGE_KEY);
    if (!rawState) {
      throw new Error('PKCE state is missing from session storage.');
    }

    const parsed = JSON.parse(rawState) as PkceAuthorizationRequestState;
    const isExpired = Date.now() - parsed.createdAtUtcMs > PKCE_STATE_TTL_MS;
    if (isExpired) {
      throw new Error('PKCE state has expired.');
    }

    if (parsed.state !== stateFromCallback) {
      throw new Error('Invalid PKCE callback state.');
    }

    return parsed;
  }

  private extractRolesFromSession(session: AuthSession | null): string[] {
    if (!session?.accessToken) {
      return [];
    }

    const claims = this.parseJwtPayload(session.accessToken);
    const roleClaimKeys = ['role', 'roles', 'http://schemas.microsoft.com/ws/2008/06/identity/claims/role'];
    const extractedRoles: string[] = [];

    for (const key of roleClaimKeys) {
      const claimValue = claims[key];
      if (!claimValue) {
        continue;
      }

      if (Array.isArray(claimValue)) {
        for (const value of claimValue) {
          if (typeof value === 'string' && !extractedRoles.includes(value)) {
            extractedRoles.push(value);
          }
        }
      } else if (typeof claimValue === 'string' && !extractedRoles.includes(claimValue)) {
        extractedRoles.push(claimValue);
      }
    }

    return extractedRoles;
  }

  private parseJwtPayload(jwt: string): Record<string, unknown> {
    const parts = jwt.split('.');
    if (parts.length < 2) {
      return {};
    }

    try {
      const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const paddedPayload = payload + '='.repeat((4 - (payload.length % 4)) % 4);
      const json = atob(paddedPayload);
      return JSON.parse(json) as Record<string, unknown>;
    } catch {
      return {};
    }
  }

  private hydrateAuthSession(): void {
    const rawSession = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!rawSession) {
      this.authSessionSignal.set(null);
      return;
    }

    try {
      const session = JSON.parse(rawSession) as AuthSession;
      if (!this.hasValidSession(session)) {
        this.clearSession();
        return;
      }

      this.authSessionSignal.set(session);
    } catch {
      this.clearSession();
    }
  }

  private hasValidSession(session: AuthSession | null): boolean {
    if (!session?.accessToken) {
      return false;
    }

    return session.expiresAtUtcMs > Date.now() + 30_000;
  }

  private setSession(session: AuthSession): void {
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    this.authSessionSignal.set(session);
  }

  private clearSession(): void {
    localStorage.removeItem(SESSION_STORAGE_KEY);
    sessionStorage.removeItem(PKCE_REQUEST_STORAGE_KEY);
    this.authSessionSignal.set(null);
  }
}
