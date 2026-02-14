import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { StyleClassModule } from 'primeng/styleclass';
import { LayoutService } from '../../services/layout.service';
import { AuthService } from '../../../../core/auth/services/auth.service';

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [CommonModule, StyleClassModule, RouterLink],
  templateUrl: './app-topbar.component.html',
  styleUrl: './app-topbar.component.scss'
})
export class AppTopbarComponent {
  constructor(
    public layoutService: LayoutService,
    public authService: AuthService
  ) {}

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
    return this.authService.isAuthenticated() ? '/dashboard' : '/';
  }
}
