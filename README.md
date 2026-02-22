# TaskManagementClient

Angular SPA for a Jira-style task management system, integrated with an existing .NET 8 backend.

## Highlights

- OIDC authentication (Authorization Code + PKCE) against OpenIddict
- Register flow returns through OIDC and lands back in SPA callback
- Role-aware UX for `Administrator`, `ProjectManager`, and `User`
- Real-time activity updates via SignalR
- Project Kanban board with drag/drop and inline task editing
- Dashboard, calendar, search/filters, admin tools, activity views, and settings
- Preview mode support for frontend-only workflows (explicit debug session only)

## Tech Stack

- Angular 18 (standalone components)
- PrimeNG UI
- RxJS
- SignalR JavaScript client

## Architecture

- `src/app/core`: auth, api clients, config, layout, realtime, preferences
- `src/app/features`: page-level feature components by domain
- `src/app/shared`: shared module and reusable UI pieces

The SPA is API-contract-first: typed DTOs and clients are aligned with backend endpoints.

## Sidebar Information Architecture

- Overview: Dashboard
- Workspaces: Projects, Project Details, Project Members, Kanban
- Delivery: All Tasks, My Tasks, Create Task
- Activity: My Activity, Activity Log, Calendar, Search & Filters
- Account: Profile & Security, Settings
- Administration: Admin Dashboard
- About: Documentation

## Run

- Install dependencies: `npm install`
- Development server: `npm start`
- Build: `npm run build`
- Tests: `npm test`
