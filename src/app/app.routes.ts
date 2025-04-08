import { Routes } from '@angular/router';
import { HomeLoginComponent } from './features/login/components/home-login/home-login.component';
import { ProjectListComponent } from './features/projects/components/project-list/project-list.component';
import { DashboardComponent } from './features/dashboard/components/dashboard/dashboard.component';
import { ProjectKanbanComponent } from './features/projects/components/project-kanban/project-kanban.component';
import { TaskItemListComponent } from './features/task-item/components/task-item-list/task-item-list.component';
import { UserTaskItemsComponent } from './features/task-item/components/user-task-items/user-task-items.component';
import { ProjectCreateComponent } from './features/projects/components/project-create/project-create.component';
import { TaskItemCreateComponent } from './features/task-item/components/task-item-create/task-item-create.component';

export const routes: Routes = [
  { path: '', component: DashboardComponent },
  { path: 'projects', component: ProjectListComponent },
  { path: 'projects/kanban', component: ProjectKanbanComponent },
  { path: 'projects/create', component: ProjectCreateComponent },
  { path: 'tasks', component: TaskItemListComponent },
  { path: 'tasks/create', component: TaskItemCreateComponent },
  { path: 'tasks/my-tasks', component: UserTaskItemsComponent },
  { path: 'login', component: HomeLoginComponent },
];