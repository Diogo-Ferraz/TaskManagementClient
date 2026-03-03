import { AppEnvironment } from './app-environment';

interface RuntimeEnvironmentOverrides {
  production?: boolean;
  apiBaseUrl?: string;
  authApiBaseUrl?: string;
  activityHubPath?: string;
  debugAuth?: {
    enabled?: boolean;
    allowedHosts?: string[];
  };
  auth?: {
    authority?: string;
    clientId?: string;
    redirectUri?: string;
    postLogoutRedirectUri?: string;
    responseType?: 'code';
    scopes?: string[];
  };
}

export async function loadRuntimeEnvironment(baseEnvironment: AppEnvironment): Promise<AppEnvironment> {
  try {
    const response = await fetch('/assets/runtime-config.json', { cache: 'no-store' });
    if (!response.ok) {
      return baseEnvironment;
    }

    const overrides = (await response.json()) as RuntimeEnvironmentOverrides;
    return mergeEnvironment(baseEnvironment, overrides);
  } catch {
    return baseEnvironment;
  }
}

function mergeEnvironment(base: AppEnvironment, overrides: RuntimeEnvironmentOverrides): AppEnvironment {
  return {
    production: typeof overrides.production === 'boolean' ? overrides.production : base.production,
    apiBaseUrl: normalizeString(overrides.apiBaseUrl, base.apiBaseUrl),
    authApiBaseUrl: normalizeString(overrides.authApiBaseUrl, base.authApiBaseUrl),
    activityHubPath: normalizeString(overrides.activityHubPath, base.activityHubPath),
    debugAuth: {
      enabled: typeof overrides.debugAuth?.enabled === 'boolean' ? overrides.debugAuth.enabled : base.debugAuth.enabled,
      allowedHosts:
        Array.isArray(overrides.debugAuth?.allowedHosts) && overrides.debugAuth.allowedHosts.length > 0
          ? overrides.debugAuth.allowedHosts
          : base.debugAuth.allowedHosts
    },
    auth: {
      authority: normalizeString(overrides.auth?.authority, base.auth.authority),
      clientId: normalizeString(overrides.auth?.clientId, base.auth.clientId),
      redirectUri: normalizeString(overrides.auth?.redirectUri, base.auth.redirectUri),
      postLogoutRedirectUri: normalizeString(overrides.auth?.postLogoutRedirectUri, base.auth.postLogoutRedirectUri),
      responseType: overrides.auth?.responseType ?? base.auth.responseType,
      scopes: Array.isArray(overrides.auth?.scopes) && overrides.auth.scopes.length > 0 ? overrides.auth.scopes : base.auth.scopes
    }
  };
}

function normalizeString(value: string | undefined, fallback: string): string {
  return typeof value === 'string' && value.trim().length > 0 ? value : fallback;
}
