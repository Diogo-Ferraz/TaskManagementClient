import { Component, computed, inject } from '@angular/core';
import { SharedModule } from '../../../../shared/shared.module';
import { AuthService } from '../../../../core/auth/services/auth.service';
import { AppPreferencesService } from '../../../../core/preferences/app-preferences.service';

interface ClaimViewModel {
  key: string;
  value: string;
}

@Component({
  selector: 'app-user-profile-security',
  standalone: true,
  imports: [SharedModule],
  templateUrl: './user-profile-security.component.html',
  styleUrl: './user-profile-security.component.scss'
})
export class UserProfileSecurityComponent {
  private readonly authService = inject(AuthService);
  private readonly preferencesService = inject(AppPreferencesService);

  readonly session = computed(() => this.authService.authSession());
  readonly claims = computed(() => this.authService.userClaims());
  readonly roles = computed(() => this.authService.userRoles());
  readonly currentUserId = computed(() => this.authService.currentUserId());

  readonly userDisplayName = computed(() => {
    const claims = this.claims();
    const name = claims['name'];
    const preferredUserName = claims['preferred_username'];
    const email = claims['email'];

    if (typeof name === 'string' && name.trim().length > 0) {
      return name;
    }

    if (typeof preferredUserName === 'string' && preferredUserName.trim().length > 0) {
      return preferredUserName;
    }

    if (typeof email === 'string' && email.trim().length > 0) {
      return email;
    }

    return 'Authenticated User';
  });

  readonly userEmail = computed(() => {
    const email = this.claims()['email'];
    return typeof email === 'string' && email.trim().length > 0 ? email : 'Not provided';
  });

  readonly scopes = computed(() => {
    const scope = this.session()?.scope ?? '';
    return scope
      .split(' ')
      .map((value) => value.trim())
      .filter((value) => value.length > 0);
  });

  readonly expiresAt = computed(() => {
    const expires = this.session()?.expiresAtUtcMs;
    return expires ? new Date(expires) : null;
  });

  readonly expiresInMinutes = computed(() => {
    const expires = this.session()?.expiresAtUtcMs;
    if (!expires) {
      return 0;
    }

    return Math.max(0, Math.floor((expires - Date.now()) / 60_000));
  });

  readonly claimRows = computed<ClaimViewModel[]>(() => {
    const entries = Object.entries(this.claims());
    return entries
      .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
      .map(([key, value]) => ({
        key,
        value: this.serializeClaimValue(value)
      }));
  });

  readonly securityChecklist = [
    'OIDC Authorization Code + PKCE flow in use',
    'Token-based role extraction from JWT claims',
    'Route-level role guards for privileged areas',
    'Problem Details handling for consistent API errors',
    'SignalR connection authorized with access token'
  ];

  getRoleDescription(role: string): string {
    switch (role) {
      case 'Administrator':
        return 'Full platform access, including admin operations.';
      case 'ProjectManager':
        return 'Can manage project flow, tasks, and team delivery.';
      case 'User':
        return 'Standard collaborator with task-level execution permissions.';
      default:
        return 'Custom role from identity provider.';
    }
  }

  get isDebugSession(): boolean {
    return this.session()?.isDebugSession === true;
  }

  get tokenType(): string {
    return this.session()?.tokenType ?? 'Unknown';
  }

  get defaultTablePageSize(): number {
    return this.preferencesService.preferences().defaultTablePageSize;
  }

  logout(): void {
    this.authService.logout();
  }

  register(): void {
    this.authService.openRegisterPage();
  }

  private serializeClaimValue(value: unknown): string {
    if (Array.isArray(value)) {
      return value.map((item) => String(item)).join(', ');
    }

    if (value === null || value === undefined) {
      return '-';
    }

    if (typeof value === 'object') {
      try {
        return JSON.stringify(value);
      } catch {
        return '[object]';
      }
    }

    return String(value);
  }
}
