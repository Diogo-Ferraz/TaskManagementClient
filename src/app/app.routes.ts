import { Routes } from '@angular/router';
import { HomeLoginComponent } from './features/login/components/home-login/home-login.component';
import { ProjectListComponent } from './features/projects/components/project-list/project-list.component';
import { DashboardComponent } from './features/dashboard/components/dashboard/dashboard.component';
import { ProjectKanbanComponent } from './features/projects/components/project-kanban/project-kanban.component';

export const routes: Routes = [
  { path: '', component: DashboardComponent },
  { path: 'projects', component: ProjectListComponent },
  { path: 'projects/kanban', component: ProjectKanbanComponent },
  { path: 'login', component: HomeLoginComponent },
];