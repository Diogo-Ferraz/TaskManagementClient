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
    'Dashboard with summary counters and live feed',
    'Kanban board with patch-based optimistic updates',
    'Search & filtering across projects, users, and tasks'
  ];

  readonly principles = [
    'API contract alignment first: DTOs and endpoints are typed at integration points.',
    'PrimeNG-first UI strategy: use battle-tested components before custom code.',
    'Resilient UX by default: loading, empty, and degraded states are always visible.',
    'Incremental delivery through focused commits and maintainable architecture.'
  ];
}
