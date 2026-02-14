import { Routes } from '@angular/router';
import { HomeLoginComponent } from './features/login/components/home-login/home-login.component';
import { ProjectListComponent } from './features/projects/components/project-list/project-list.component';
import { DashboardComponent } from './features/dashboard/components/dashboard/dashboard.component';
import { ProjectKanbanComponent } from './features/projects/components/project-kanban/project-kanban.component';
import { TaskItemListComponent } from './features/task-item/components/task-item-list/task-item-list.component';
import { UserTaskItemsComponent } from './features/task-item/components/user-task-items/user-task-items.component';
import { ProjectCreateComponent } from './features/projects/components/project-create/project-create.component';
import { TaskItemCreateComponent } from './features/task-item/components/task-item-create/task-item-create.component';
import { authGuard } from './core/auth/guards/auth.guard';
import { AuthCallbackComponent } from './features/login/components/auth-callback/auth-callback.component';
import { LandingPageComponent } from './features/landing/components/landing-page/landing-page.component';

export const routes: Routes = [
  { path: '', component: LandingPageComponent },
  { path: 'dashboard', component: DashboardComponent, canActivate: [authGuard] },
  { path: 'projects', component: ProjectListComponent, canActivate: [authGuard] },
  { path: 'projects/kanban', component: ProjectKanbanComponent, canActivate: [authGuard] },
  { path: 'projects/create', component: ProjectCreateComponent, canActivate: [authGuard] },
  { path: 'tasks', component: TaskItemListComponent, canActivate: [authGuard] },
  { path: 'tasks/create', component: TaskItemCreateComponent, canActivate: [authGuard] },
  { path: 'tasks/my-tasks', component: UserTaskItemsComponent, canActivate: [authGuard] },
  { path: 'login', component: HomeLoginComponent },
  { path: 'callback', component: AuthCallbackComponent },
];
