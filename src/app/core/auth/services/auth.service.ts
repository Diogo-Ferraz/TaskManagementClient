import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { map, Observable } from 'rxjs';
import { APP_ENVIRONMENT } from '../../config/app-environment.token';
import { AppRole } from '../models/app-role.model';
import {
  AuthSession,
  PkceAuthorizationRequestState,
  TokenResponse
} from '../models/auth-session.model';

const SESSION_STORAGE_KEY = 'task_management.auth.session';
const PKCE_REQUEST_STORAGE_KEY = 'task_management.auth.pkce_request';
const DEBUG_SESSION_FLAG_STORAGE_KEY = 'task_management.auth.debug_session_enabled';
const PKCE_STATE_TTL_MS = 10 * 60 * 1000;

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly appEnvironment = inject(APP_ENVIRONMENT);
  private readonly authSessionSignal = signal<AuthSession | null>(null);

  readonly authSession = this.authSessionSignal.asReadonly();
  readonly isAuthenticated = computed(() => this.hasValidSession(this.authSessionSignal()));
  readonly accessToken = computed(() => this.authSessionSignal()?.accessToken ?? null);
  readonly userClaims = computed(() => {
    const accessClaims = this.parseJwtPayload(this.authSessionSignal()?.accessToken ?? '');
    if (Object.keys(accessClaims).length > 0) {
      return accessClaims;
    }

    return this.parseJwtPayload(this.authSessionSignal()?.idToken ?? '');
  });
  readonly userRoles = computed(() => this.extractRolesFromSession(this.authSessionSignal()));
  readonly currentUserId = computed(() => this.extractUserId(this.userClaims()));
  readonly canStartDebugSession = computed(() => this.isDebugAuthAllowed());

  constructor() {
    this.hydrateAuthSession();
  }

  async startLoginRedirect(): Promise<void> {
    const authorizeUrl = await this.createAuthorizeRedirectUrl();
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

  async openRegisterPage(): Promise<void> {
    const authorizePath = await this.createAuthorizeRedirectPath();
    const registerUrl = `${this.appEnvironment.auth.authority.replace(/\/$/, '')}/Identity/Account/Register?returnUrl=${encodeURIComponent(authorizePath)}`;
    window.location.assign(registerUrl);
  }

  startDebugSession(): void {
    if (!this.isDebugAuthAllowed()) {
      throw new Error('Debug session is disabled.');
    }

    const nowUtcMs = Date.now();
    const debugClaims = {
      sub: 'debug-user',
      name: 'Debug User',
      preferred_username: 'debug.user',
      email: 'debug.user@local.test',
      role: [AppRole.Administrator, AppRole.ProjectManager, AppRole.User]
    };

    const session: AuthSession = {
      accessToken: this.createUnsignedJwt(debugClaims),
      idToken: this.createUnsignedJwt({
        sub: debugClaims.sub,
        name: debugClaims.name,
        email: debugClaims.email
      }),
      tokenType: 'Bearer',
      scope: this.appEnvironment.auth.scopes.join(' '),
      expiresAtUtcMs: nowUtcMs + 8 * 60 * 60 * 1000,
      isDebugSession: true
    };

    this.setSession(session);
    sessionStorage.setItem(DEBUG_SESSION_FLAG_STORAGE_KEY, '1');
  }

  setDebugSessionRole(role: AppRole): void {
    const currentSession = this.authSessionSignal();
    if (!currentSession?.isDebugSession || !this.isDebugAuthAllowed() || !this.hasDebugSessionFlag()) {
      return;
    }

    const nowUtcMs = Date.now();
    const roleName = this.resolveDebugRoleName(role);
    const debugClaims = {
      sub: 'debug-user',
      name: `${roleName} (Preview)`,
      preferred_username: `debug.${role.toLowerCase()}`,
      email: `debug.${role.toLowerCase()}@local.test`,
      role: [role]
    };

    const session: AuthSession = {
      ...currentSession,
      accessToken: this.createUnsignedJwt(debugClaims),
      idToken: this.createUnsignedJwt({
        sub: debugClaims.sub,
        name: debugClaims.name,
        email: debugClaims.email
      }),
      scope: this.appEnvironment.auth.scopes.join(' '),
      expiresAtUtcMs: nowUtcMs + 8 * 60 * 60 * 1000,
      isDebugSession: true
    };

    this.setSession(session);
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
    const params = this.createAuthorizeParams(state, challenge);

    return `${authorizeEndpoint}?${params.toString()}`;
  }

  private async createAuthorizeRedirectUrl(): Promise<string> {
    const { state, challenge } = await this.createPkceAuthorizationRequestState();
    return this.createAuthorizeUrl(state, challenge);
  }

  private async createAuthorizeRedirectPath(): Promise<string> {
    const { state, challenge } = await this.createPkceAuthorizationRequestState();
    const params = this.createAuthorizeParams(state, challenge);
    return `/connect/authorize?${params.toString()}`;
  }

  private createAuthorizeParams(state: string, challenge: string): URLSearchParams {
    return new URLSearchParams({
      response_type: this.appEnvironment.auth.responseType,
      client_id: this.appEnvironment.auth.clientId,
      redirect_uri: this.appEnvironment.auth.redirectUri,
      scope: this.appEnvironment.auth.scopes.join(' '),
      state,
      code_challenge: challenge,
      code_challenge_method: 'S256'
    });
  }

  private async createPkceAuthorizationRequestState(): Promise<{ state: string; challenge: string }> {
    const state = this.createRandomUrlSafeString(32);
    const verifier = this.createRandomUrlSafeString(64);
    const challenge = await this.createPkceChallenge(verifier);

    const requestState: PkceAuthorizationRequestState = {
      state,
      verifier,
      createdAtUtcMs: Date.now()
    };

    sessionStorage.setItem(PKCE_REQUEST_STORAGE_KEY, JSON.stringify(requestState));
    return { state, challenge };
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
    if (!session) {
      return [];
    }

    const roleClaimKeys = ['role', 'roles', 'http://schemas.microsoft.com/ws/2008/06/identity/claims/role'];
    const extractedRoles: string[] = [];
    const addRolesFromClaims = (claims: Record<string, unknown>) => {
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
    };

    addRolesFromClaims(this.parseJwtPayload(session.accessToken ?? ''));
    if (extractedRoles.length === 0) {
      addRolesFromClaims(this.parseJwtPayload(session.idToken ?? ''));
    }

    return extractedRoles;
  }

  private extractUserId(claims: Record<string, unknown>): string | null {
    const value =
      claims['sub'] ??
      claims['nameid'] ??
      claims['nameidentifier'] ??
      claims['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'] ??
      claims['uid'] ??
      claims['user_id'];
    return typeof value === 'string' && value.trim().length > 0 ? value : null;
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

  private createUnsignedJwt(claims: Record<string, unknown>): string {
    const header = { alg: 'none', typ: 'JWT' };
    const encodedHeader = this.base64UrlEncodeString(JSON.stringify(header));
    const encodedPayload = this.base64UrlEncodeString(JSON.stringify(claims));
    return `${encodedHeader}.${encodedPayload}.`;
  }

  private base64UrlEncodeString(value: string): string {
    const bytes = new TextEncoder().encode(value);
    return this.base64UrlEncodeBytes(bytes);
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

    if (session.isDebugSession && (!this.isDebugAuthAllowed() || !this.hasDebugSessionFlag())) {
      return false;
    }

    if (!this.isDebugAuthAllowed() && this.isUnsignedJwt(session.accessToken)) {
      return false;
    }

    return session.expiresAtUtcMs > Date.now() + 30_000;
  }

  private isDebugAuthAllowed(): boolean {
    if (this.appEnvironment.production || !this.appEnvironment.debugAuth.enabled) {
      return false;
    }

    if (typeof window === 'undefined') {
      return false;
    }

    const currentHost = window.location.hostname.toLowerCase();
    return this.appEnvironment.debugAuth.allowedHosts.some((host) => host.toLowerCase() === currentHost);
  }

  private isUnsignedJwt(jwt: string): boolean {
    const parts = jwt.split('.');
    if (parts.length !== 3) {
      return false;
    }

    if (parts[2].length === 0) {
      return true;
    }

    try {
      const headerJson = atob(parts[0].replace(/-/g, '+').replace(/_/g, '/'));
      const header = JSON.parse(headerJson) as { alg?: string };
      return header.alg === 'none';
    } catch {
      return false;
    }
  }

  private setSession(session: AuthSession): void {
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    this.authSessionSignal.set(session);
  }

  private clearSession(): void {
    localStorage.removeItem(SESSION_STORAGE_KEY);
    sessionStorage.removeItem(PKCE_REQUEST_STORAGE_KEY);
    sessionStorage.removeItem(DEBUG_SESSION_FLAG_STORAGE_KEY);
    this.authSessionSignal.set(null);
  }

  private hasDebugSessionFlag(): boolean {
    return sessionStorage.getItem(DEBUG_SESSION_FLAG_STORAGE_KEY) === '1';
  }

  private resolveDebugRoleName(role: AppRole): string {
    switch (role) {
      case AppRole.Administrator:
        return 'Debug Admin';
      case AppRole.ProjectManager:
        return 'Debug Manager';
      case AppRole.User:
        return 'Debug User';
      default:
        return 'Debug User';
    }
  }
}
