import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../../core/auth/services/auth.service';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-auth-callback',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './auth-callback.component.html',
  styleUrl: './auth-callback.component.scss'
})
export class AuthCallbackComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  isProcessing = true;
  errorMessage = '';

  ngOnInit(): void {
    const queryParams = new URLSearchParams(window.location.search);

    this.authService
      .completeLoginFromCallback(queryParams)
      .pipe(finalize(() => (this.isProcessing = false)))
      .subscribe({
        next: () => void this.router.navigateByUrl('/dashboard'),
        error: (error: unknown) => {
          this.errorMessage = error instanceof Error ? error.message : 'Authentication failed.';
        }
      });
  }

  retryLogin(): void {
    void this.authService.startLoginRedirect();
  }
}
