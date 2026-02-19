export interface AuthSession {
  accessToken: string;
  idToken?: string;
  tokenType: string;
  scope?: string;
  expiresAtUtcMs: number;
  isDebugSession?: boolean;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope?: string;
  id_token?: string;
}

export interface PkceAuthorizationRequestState {
  state: string;
  verifier: string;
  createdAtUtcMs: number;
}
