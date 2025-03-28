import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { MenuItem } from 'primeng/api';
import { AppMenuitemComponent } from '../app-menuitem/app-menuitem.component';

@Component({
  selector: 'app-menu',
  standalone: true,
  imports: [CommonModule, AppMenuitemComponent],
  templateUrl: './app-menu.component.html',
  styleUrl: './app-menu.component.scss'
})
export class AppMenuComponent {
  model: MenuItem[] = [];

  ngOnInit() {
    this.model = [
      {
        label: 'Home',
        items: [{ label: 'Dashboard', icon: 'pi pi-fw pi-home', routerLink: ['/'] }]
      },
      {
        label: 'Projects',
        icon: 'pi pi-fw pi-folder',
        items: [
          { label: 'All Projects', icon: 'pi pi-fw pi-list', routerLink: ['/projects'] },
          { label: 'Create Project', icon: 'pi pi-fw pi-plus', routerLink: ['/projects/create'] },
          { label: 'Kanban Board', icon: 'pi pi-fw pi-th-large', routerLink: ['/projects/kanban'] },
          { label: 'Archived Projects', icon: 'pi pi-fw pi-folder', routerLink: ['/projects/archived'] }
        ]
      },
      {
        label: 'Tasks',
        icon: 'pi pi-fw pi-check',
        items: [
          { label: 'All Tasks', icon: 'pi pi-fw pi-list', routerLink: ['/tasks'] },
          { label: 'My Tasks', icon: 'pi pi-fw pi-user', routerLink: ['/tasks/my-tasks'] },
          { label: 'Completed Tasks', icon: 'pi pi-fw pi-check-circle', routerLink: ['/tasks/completed'] },
          { label: 'Create Task', icon: 'pi pi-fw pi-plus', routerLink: ['/tasks/create'] }
        ]
      },
      {
        label: 'Teams',
        icon: 'pi pi-fw pi-users',
        items: [
          { label: 'Manage Teams', icon: 'pi pi-fw pi-user-edit', routerLink: ['/teams'] },
          { label: 'User Roles', icon: 'pi pi-fw pi-users', routerLink: ['/teams/roles'] },
          { label: 'Invite Members', icon: 'pi pi-fw pi-user-plus', routerLink: ['/teams/invite'] }
        ]
      },
      {
        label: 'Reports',
        icon: 'pi pi-fw pi-chart-line',
        items: [
          { label: 'Project Reports', icon: 'pi pi-fw pi-folder-open', routerLink: ['/reports/projects'] },
          { label: 'Task Reports', icon: 'pi pi-fw pi-check-square', routerLink: ['/reports/tasks'] },
          { label: 'User Activity', icon: 'pi pi-fw pi-clock', routerLink: ['/reports/activity'] }
        ]
      },
      {
        label: 'Settings',
        icon: 'pi pi-fw pi-cog',
        items: [
          { label: 'Profile Settings', icon: 'pi pi-fw pi-user', routerLink: ['/settings/profile'] },
          { label: 'Notification Settings', icon: 'pi pi-fw pi-bell', routerLink: ['/settings/notifications'] },
          { label: 'Theme & Appearance', icon: 'pi pi-fw pi-palette', routerLink: ['/settings/theme'] }
        ]
      },
      {
        label: 'Help',
        icon: 'pi pi-fw pi-question-circle',
        items: [
          { label: 'Documentation', icon: 'pi pi-fw pi-book', routerLink: ['/help/documentation'] },
          { label: 'Support', icon: 'pi pi-fw pi-question', routerLink: ['/help/support'] }
        ]
      }
    ];
}
}
