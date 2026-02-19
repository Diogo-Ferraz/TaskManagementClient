import { Routes } from '@angular/router';
import { HomeLoginComponent } from './features/login/components/home-login/home-login.component';
import { ProjectListComponent } from './features/projects/components/project-list/project-list.component';
import { DashboardComponent } from './features/dashboard/components/dashboard/dashboard.component';
import { ProjectKanbanComponent } from './features/projects/components/project-kanban/project-kanban.component';
import { TaskItemListComponent } from './features/task-item/components/task-item-list/task-item-list.component';
import { UserTaskItemsComponent } from './features/task-item/components/user-task-items/user-task-items.component';
import { ProjectCreateComponent } from './features/projects/components/project-create/project-create.component';
import { ProjectDetailsComponent } from './features/projects/components/project-details/project-details.component';
import { TaskItemCreateComponent } from './features/task-item/components/task-item-create/task-item-create.component';
import { authGuard } from './core/auth/guards/auth.guard';
import { AuthCallbackComponent } from './features/login/components/auth-callback/auth-callback.component';
import { LandingPageComponent } from './features/landing/components/landing-page/landing-page.component';
import { NotFoundComponent } from './features/errors/components/not-found/not-found.component';
import { SearchFiltersComponent } from './features/search/components/search-filters/search-filters.component';
import { ProjectDocsComponent } from './features/docs/components/project-docs/project-docs.component';
import { TaskCalendarComponent } from './features/calendar/components/task-calendar/task-calendar.component';
import { AdminDashboardComponent } from './features/admin/components/admin-dashboard/admin-dashboard.component';
import { adminRoleGuard } from './core/auth/guards/admin-role.guard';
import { MyActivityComponent } from './features/activity/components/my-activity/my-activity.component';

export const routes: Routes = [
  { path: '', component: LandingPageComponent },
  { path: 'dashboard', component: DashboardComponent, canActivate: [authGuard] },
  { path: 'projects', component: ProjectListComponent, canActivate: [authGuard] },
  { path: 'projects/kanban', component: ProjectKanbanComponent, canActivate: [authGuard] },
  { path: 'projects/create', component: ProjectCreateComponent, canActivate: [authGuard] },
  { path: 'projects/details', component: ProjectDetailsComponent, canActivate: [authGuard] },
  { path: 'tasks', component: TaskItemListComponent, canActivate: [authGuard] },
  { path: 'search', component: SearchFiltersComponent, canActivate: [authGuard] },
  { path: 'docs', component: ProjectDocsComponent, canActivate: [authGuard] },
  { path: 'calendar', component: TaskCalendarComponent, canActivate: [authGuard] },
  { path: 'activity/my', component: MyActivityComponent, canActivate: [authGuard] },
  { path: 'admin', component: AdminDashboardComponent, canActivate: [authGuard, adminRoleGuard] },
  { path: 'tasks/create', component: TaskItemCreateComponent, canActivate: [authGuard] },
  { path: 'tasks/my-tasks', component: UserTaskItemsComponent, canActivate: [authGuard] },
  { path: 'login', component: HomeLoginComponent },
  { path: 'callback', component: AuthCallbackComponent },
  { path: 'not-found', component: NotFoundComponent },
  { path: '**', component: NotFoundComponent }
];
