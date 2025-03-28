import { Component, ViewEncapsulation } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { MenuItem, PrimeNGConfig } from 'primeng/api';
import { SharedModule } from './shared/shared.module';
import { AppTopbarComponent } from "./core/layout/component/app-topbar/app-topbar.component";
import { AppFooterComponent } from "./core/layout/component/app-footer/app-footer.component";
import { AppSidebarComponent } from './core/layout/component/app-sidebar/app-sidebar.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    SharedModule,
    RouterOutlet,
    AppTopbarComponent,
    AppFooterComponent,
    AppSidebarComponent
],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
  encapsulation: ViewEncapsulation.None
})
export class AppComponent {
  title = 'TaskManagementClient';
  constructor(private primengConfig: PrimeNGConfig) {
    this.primengConfig.ripple = true;
  }

  get containerClass() {
    return {
        'layout-overlay': false,
        'layout-static': true,
        'layout-static-inactive': false,
        'layout-overlay-active': false,
        'layout-mobile-active': false
    };
}
}
