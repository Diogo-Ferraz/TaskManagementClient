import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { SharedModule } from '../../../../shared/shared.module';

@Component({
  selector: 'app-project-docs',
  standalone: true,
  imports: [CommonModule, SharedModule],
  templateUrl: './project-docs.component.html',
  styleUrl: './project-docs.component.scss'
})
export class ProjectDocsComponent {
  readonly techStack = [
    '.NET 8 API + Auth service',
    'OpenIddict (Authorization Code + PKCE)',
    'Vertical Slice Architecture',
    'Angular SPA + PrimeNG',
    'SignalR real-time activity feed',
    'Dockerized local environment'
  ];

  readonly highlights = [
    'Role-aware UI for Administrator / ProjectManager / User',
    'Dashboard with summary counters and real-time activity',
    'Jira-style Kanban board with drag/drop and inline task editing',
    'Project details, project members, and task calendar',
    'Activity views: My Activity and Admin/PM Activity Log',
    'Admin dashboard with user activation and CSV export',
    'Settings page with persisted app preferences'
  ];

  readonly principles = [
    'API contract alignment first: DTOs and endpoints are typed at integration points.',
    'PrimeNG-first UI strategy: use battle-tested components before custom code.',
    'Resilient UX by default: loading, empty, and degraded states are always visible.',
    'Incremental delivery through focused commits and maintainable architecture.'
  ];

  readonly navigationGroups = [
    'Overview: Dashboard',
    'Workspaces: Projects, Project Details, Project Members, Kanban',
    'Delivery: All Tasks, My Tasks, Create Task',
    'Activity: My Activity, Activity Log, Calendar, Search & Filters',
    'Account: Profile & Security, Settings',
    'Administration: Admin Dashboard',
    'About: Project Docs'
  ];

  readonly engineeringStandards = [
    'Typed API client boundary under core/api with explicit DTO contracts.',
    'Role-aware routing and UI behavior for Administrator, ProjectManager, and User.',
    'OIDC Authorization Code + PKCE flow with guarded routes and secure callbacks.',
    'SignalR event ingestion for real-time activity without polling fallback.',
    'Problem Details-aligned error surfaces and resilient loading/empty/degraded states.',
    'Consistent PrimeNG-based component strategy for long-term maintainability.'
  ];

  readonly qualityAndDelivery = [
    'Incremental feature delivery with focused commit scopes and page-by-page hardening.',
    'Standalone Angular feature components organized by domain responsibility.',
    'Preview mode enables frontend validation while preserving production auth constraints.',
    'Responsive behavior is considered first-class across dashboard, kanban, tables, and forms.',
    'Build/test verification executed before closing implementation steps.'
  ];
}
