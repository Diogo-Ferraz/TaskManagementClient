import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { MenuItem } from 'primeng/api';
import { AppMenuitemComponent } from '../app-menuitem/app-menuitem.component';
import { AuthService } from '../../../auth/services/auth.service';

@Component({
  selector: 'app-menu',
  standalone: true,
  imports: [CommonModule, AppMenuitemComponent],
  templateUrl: './app-menu.component.html',
  styleUrl: './app-menu.component.scss'
})
export class AppMenuComponent {
  private readonly authService = inject(AuthService);
  model: MenuItem[] = [];

  ngOnInit() {
    this.model = [
      {
        label: 'Overview',
        items: [{ label: 'Dashboard', icon: 'pi pi-fw pi-home', routerLink: ['/dashboard'] }]
      },
      {
        label: 'Projects',
        items: [
          { label: 'All Projects', icon: 'pi pi-fw pi-list', routerLink: ['/projects'] },
          { label: 'Create Project', icon: 'pi pi-fw pi-plus', routerLink: ['/projects/create'] },
          { label: 'Kanban Board', icon: 'pi pi-fw pi-th-large', routerLink: ['/projects/kanban'] }
        ]
      },
      {
        label: 'Tasks',
        items: [
          { label: 'All Tasks', icon: 'pi pi-fw pi-list', routerLink: ['/tasks'] },
          { label: 'My Tasks', icon: 'pi pi-fw pi-user', routerLink: ['/tasks/my-tasks'] },
          { label: 'Create Task', icon: 'pi pi-fw pi-plus', routerLink: ['/tasks/create'] }
        ]
      },
      {
        label: 'Insights',
        items: [
          { label: 'Search & Filters', icon: 'pi pi-fw pi-search', routerLink: ['/search'] },
          { label: 'Calendar', icon: 'pi pi-fw pi-calendar', routerLink: ['/calendar'] },
          { label: 'Project Docs', icon: 'pi pi-fw pi-book', routerLink: ['/docs'] }
        ]
      },
      {
        label: 'Administration',
        visible: this.authService.hasRole('Administrator'),
        items: [{ label: 'Admin Dashboard', icon: 'pi pi-fw pi-shield', routerLink: ['/admin'] }]
      }
    ];
  }
}
