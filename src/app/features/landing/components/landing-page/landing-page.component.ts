import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { AuthService } from '../../../../core/auth/services/auth.service';

@Component({
  selector: 'app-landing-page',
  standalone: true,
  imports: [ButtonModule, RouterLink],
  templateUrl: './landing-page.component.html',
  styleUrl: './landing-page.component.scss'
})
export class LandingPageComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly isDebugEntryEnabled = this.authService.canStartDebugSession;

  signIn(): void {
    void this.authService.startLoginRedirect();
  }

  register(): void {
    this.authService.openRegisterPage();
  }

  startDebugMode(): void {
    this.authService.startDebugSession();
    void this.router.navigate(['/dashboard']);
  }
}
