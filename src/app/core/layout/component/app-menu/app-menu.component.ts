import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { MenuItem } from 'primeng/api';
import { ALL_ROLES, AppRole, MANAGEMENT_ROLES } from '../../../auth/models/app-role.model';
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
          { label: 'Kanban Board', icon: 'pi pi-fw pi-th-large', routerLink: ['/projects/kanban'] },
          { label: 'All Projects', icon: 'pi pi-fw pi-list', routerLink: ['/projects'] },
          {
            label: 'Project Details',
            icon: 'pi pi-fw pi-folder-open',
            routerLink: ['/projects/details'],
            visible: this.authService.hasAnyRole([...MANAGEMENT_ROLES])
          },
          { label: 'Project Members', icon: 'pi pi-fw pi-users', routerLink: ['/projects/members'] },
          {
            label: 'Create Project',
            icon: 'pi pi-fw pi-plus',
            routerLink: ['/projects/create'],
            visible: this.authService.hasAnyRole([...MANAGEMENT_ROLES])
          }
        ]
      },
      {
        label: 'Delivery',
        items: [
          { label: 'All Tasks', icon: 'pi pi-fw pi-list', routerLink: ['/tasks'] },
          {
            label: 'My Tasks',
            icon: 'pi pi-fw pi-user',
            routerLink: ['/tasks/my-tasks'],
            visible: this.authService.hasAnyRole([AppRole.Administrator, AppRole.User])
          },
          {
            label: 'Create Task',
            icon: 'pi pi-fw pi-plus',
            routerLink: ['/tasks/create'],
            visible: this.authService.hasAnyRole([...ALL_ROLES])
          }
        ]
      },
      {
        label: 'Activity',
        items: [
          { label: 'My Activity', icon: 'pi pi-fw pi-history', routerLink: ['/activity/my'] },
          { label: 'Activity Log', icon: 'pi pi-fw pi-database', routerLink: ['/activity/log'], visible: this.authService.hasAnyRole([...MANAGEMENT_ROLES]) },
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
        label: 'Administration',
        visible: this.authService.hasRole(AppRole.Administrator),
        items: [{ label: 'Admin Dashboard', icon: 'pi pi-fw pi-shield', routerLink: ['/admin'] }]
      },
      {
        label: 'About',
        items: [
          { label: 'Documentation', icon: 'pi pi-fw pi-book', routerLink: ['/docs'] },
          {
            label: 'Source Code',
            icon: 'pi pi-fw pi-github',
            items: [
              { label: 'Client Source', icon: 'pi pi-fw pi-desktop', url: 'https://github.com/Diogo-Ferraz/TaskManagementClient', target: '_blank' },
              { label: 'Server Source', icon: 'pi pi-fw pi-server', url: 'https://github.com/Diogo-Ferraz/TaskManagementServer', target: '_blank' },
              { label: 'Stack Source', icon: 'pi pi-fw pi-sitemap', url: 'https://github.com/Diogo-Ferraz/TaskManagementStack', target: '_blank' }
            ]
          }
        ]
      }
    ];
  }
}
