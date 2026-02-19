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
        label: 'Workspaces',
        items: [
          { label: 'All Projects', icon: 'pi pi-fw pi-list', routerLink: ['/projects'] },
          { label: 'Project Details', icon: 'pi pi-fw pi-folder-open', routerLink: ['/projects/details'] },
          { label: 'Project Members', icon: 'pi pi-fw pi-users', routerLink: ['/projects/members'] },
          { label: 'Create Project', icon: 'pi pi-fw pi-plus', routerLink: ['/projects/create'] },
          { label: 'Kanban Board', icon: 'pi pi-fw pi-th-large', routerLink: ['/projects/kanban'] }
        ]
      },
      {
        label: 'Delivery',
        items: [
          { label: 'All Tasks', icon: 'pi pi-fw pi-list', routerLink: ['/tasks'] },
          { label: 'My Tasks', icon: 'pi pi-fw pi-user', routerLink: ['/tasks/my-tasks'] },
          { label: 'Create Task', icon: 'pi pi-fw pi-plus', routerLink: ['/tasks/create'] }
        ]
      },
      {
        label: 'Activity',
        items: [
          { label: 'My Activity', icon: 'pi pi-fw pi-history', routerLink: ['/activity/my'] },
          { label: 'Activity Log', icon: 'pi pi-fw pi-database', routerLink: ['/activity/log'], visible: this.authService.hasAnyRole(['Administrator', 'ProjectManager']) },
          { label: 'Calendar', icon: 'pi pi-fw pi-calendar', routerLink: ['/calendar'] },
          { label: 'Search & Filters', icon: 'pi pi-fw pi-search', routerLink: ['/search'] }
        ]
      },
      {
        label: 'Account',
        items: [
          { label: 'Profile & Security', icon: 'pi pi-fw pi-user-edit', routerLink: ['/profile'] },
          { label: 'Settings', icon: 'pi pi-fw pi-cog', routerLink: ['/settings'] }
        ]
      },
      {
        label: 'About',
        items: [
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
