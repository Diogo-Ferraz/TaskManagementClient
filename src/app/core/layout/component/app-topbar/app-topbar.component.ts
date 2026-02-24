import { CommonModule } from '@angular/common';
import { Component, effect, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { MenuItem } from 'primeng/api';
import { AvatarModule } from 'primeng/avatar';
import { BadgeModule } from 'primeng/badge';
import { MenuModule } from 'primeng/menu';
import { OverlayPanel, OverlayPanelModule } from 'primeng/overlaypanel';
import { StyleClassModule } from 'primeng/styleclass';
import { LayoutService } from '../../services/layout.service';
import { AuthService } from '../../../../core/auth/services/auth.service';
import { AppPreferencesService } from '../../../preferences/app-preferences.service';
import { ActivityNotificationItem, ActivityNotificationService } from '../../../../core/notifications/activity-notification.service';
import { AppRole } from '../../../../core/auth/models/app-role.model';

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [CommonModule, StyleClassModule, RouterLink, MenuModule, AvatarModule, OverlayPanelModule, BadgeModule],
  templateUrl: './app-topbar.component.html',
  styleUrl: './app-topbar.component.scss'
})
export class AppTopbarComponent {
  private readonly notificationsService = inject(ActivityNotificationService);

  readonly accountMenuItems: MenuItem[] = [
    {
      label: 'Account Settings',
      icon: 'pi pi-user-edit',
      command: () => {
        void this.router.navigate(['/profile']);
      }
    },
    {
      label: 'Preferences',
      icon: 'pi pi-cog',
      command: () => {
        void this.router.navigate(['/settings']);
      }
    },
    {
      separator: true
    },
    {
      label: 'Sign out',
      icon: 'pi pi-sign-out',
      command: () => this.signOut()
    }
  ];

  constructor(
    public layoutService: LayoutService,
    public authService: AuthService,
    private readonly router: Router,
    private readonly preferencesService: AppPreferencesService
  ) {
    effect(() => {
      const isAuthenticated = this.authService.isAuthenticated();
      const showIndicator = this.preferencesService.preferences().showTopbarNotificationIndicator;

      if (!isAuthenticated || !showIndicator) {
        this.notificationsService.teardown();
        return;
      }

      this.notificationsService.initialize();
    }, { allowSignalWrites: true });
  }

  toggleDarkMode() {
    this.layoutService.layoutConfig.update((state) => ({ ...state, darkTheme: !state.darkTheme }));
  }

  signIn(): void {
    void this.authService.startLoginRedirect();
  }

  signOut(): void {
    this.authService.logout();
  }

  get homeRoute(): string {
    return this.authService.isAuthenticated() ? this.preferencesService.getDefaultHomeRoutePath() : '/';
  }

  get isPreviewMode(): boolean {
    return this.authService.authSession()?.isDebugSession === true;
  }

  get showNotificationIndicator(): boolean {
    return this.authService.isAuthenticated() && this.preferencesService.preferences().showTopbarNotificationIndicator;
  }

  get notificationItems(): ActivityNotificationItem[] {
    return this.notificationsService.items();
  }

  get unreadNotifications(): number {
    return this.notificationsService.unreadCount();
  }

  markNotificationsAsRead(): void {
    this.notificationsService.markAllAsRead();
  }

  notificationTime(value: string): string {
    return this.notificationsService.relativeTime(value);
  }

  openNotification(item: ActivityNotificationItem, panel: OverlayPanel): void {
    this.notificationsService.markAsRead(item.activityId);
    panel.hide();

    if (item.projectId) {
      void this.router.navigate(['/projects/kanban'], { queryParams: { projectId: item.projectId } });
      return;
    }

    void this.router.navigate(['/dashboard']);
  }

  get currentUserDisplayName(): string {
    const claims = this.authService.userClaims();
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
  }

  get currentUserEmail(): string {
    const email = this.authService.userClaims()['email'];
    return typeof email === 'string' && email.trim().length > 0 ? email : 'No email claim';
  }

  get currentUserInitials(): string {
    const name = this.currentUserDisplayName;
    const words = name
      .split(' ')
      .map((word) => word.trim())
      .filter((word) => word.length > 0);

    if (words.length === 0) {
      return 'U';
    }

    if (words.length === 1) {
      return words[0][0]!.toUpperCase();
    }

    return `${words[0][0] ?? ''}${words[words.length - 1][0] ?? ''}`.toUpperCase();
  }

  get currentRoleLabel(): string {
    switch (true) {
      case this.authService.hasRole(AppRole.Administrator):
        return 'Administrator';
      case this.authService.hasRole(AppRole.ProjectManager):
        return 'Project Manager';
      case this.authService.hasRole(AppRole.User):
        return 'User';
      default:
        return 'Role';
    }
  }

}
