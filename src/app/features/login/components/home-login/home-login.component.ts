import { Component } from '@angular/core';
import { SharedModule } from '../../../../shared/shared.module';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

@Component({
  selector: 'app-home-login',
  standalone: true,
  imports: [SharedModule],
  templateUrl: './home-login.component.html',
  styleUrl: './home-login.component.scss'
})
export class HomeLoginComponent {
  loginForm: FormGroup;
  errorMessage: string = '';

  constructor(private fb: FormBuilder) {
    this.loginForm = this.fb.group({
      username: ['', [Validators.required]],
      password: ['', [Validators.required]],
    });

    this.loginForm.get('username')?.valueChanges.subscribe(() => {
      this.errorMessage = '';
    });

    this.loginForm.get('password')?.valueChanges.subscribe(() => {
      this.errorMessage = '';
    });
  }

  onLogin() {
    const { username, password } = this.loginForm.value;

    if (username === 'admin' && password === 'admin') {
      this.errorMessage = '';
      alert('Login successful');
    } else {
      this.errorMessage = 'Invalid credentials. Please try again.';
    }
  }

  get f() {
    return this.loginForm.controls;
  }

  get isFormValid() {
    return this.loginForm.valid;
  }
}
