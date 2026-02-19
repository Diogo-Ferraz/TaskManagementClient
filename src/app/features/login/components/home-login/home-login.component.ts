import { Component, inject } from '@angular/core';
import { SharedModule } from '../../../../shared/shared.module';
import { AuthService } from '../../../../core/auth/services/auth.service';

@Component({
  selector: 'app-home-login',
  standalone: true,
  imports: [SharedModule],
  templateUrl: './home-login.component.html',
  styleUrl: './home-login.component.scss'
})
export class HomeLoginComponent {
  private readonly authService = inject(AuthService);

  signIn(): void {
    void this.authService.startLoginRedirect();
  }
}
