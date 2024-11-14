import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HomeLoginComponent } from "./features/login/components/home-login/home-login.component";

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet,
    HomeLoginComponent
],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'TaskManagementClient';
}
