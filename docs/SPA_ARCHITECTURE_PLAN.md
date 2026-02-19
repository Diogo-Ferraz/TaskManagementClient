# SPA Architecture Plan (Angular + .NET 8 API)

## Current architecture status
- Angular standalone-first architecture is active (no feature NgModules used in runtime).
- Clear boundaries are in place:
  - `core`: auth, api clients/models, config, layout, realtime, preferences.
  - `shared`: shared module + reusable cross-feature UI.
  - `features`: page-level domain slices.
- API contracts are typed and aligned under `core/api/models` and consumed through `core/api/clients`.
- RxJS is used for async/server orchestration; Signals/computed are used for local/session/preferences state.

## Implemented folder structure
- `src/app/core/config`: app environment token + runtime config plumbing.
- `src/app/core/auth`: OIDC PKCE auth service + guards (`auth`, `admin`, `managerOrAdmin`).
- `src/app/core/http`: query param/url helpers and HTTP integration utilities.
- `src/app/core/api`: typed DTOs + API clients (`projects`, `taskitems`, `activity`, `dashboard`, `users`).
- `src/app/core/realtime`: SignalR hub integration for activity feed/log updates.
- `src/app/core/preferences`: persisted app preferences service (density/date/notification/kanban defaults).
- `src/app/features`: dashboard, projects, tasks, search, calendar, activity, profile, settings, docs, admin.

## Routing and authorization (implemented)
- Public routes:
  - `/` (landing)
  - `/login`
  - `/callback`
- Protected routes:
  - dashboard/workspaces/delivery/activity/account/about.
- Role-restricted routes:
  - `/admin` -> `Administrator`.
  - `/activity/log` -> `Administrator` or `ProjectManager`.

## Sidebar information architecture (current)
- Overview: Dashboard
- Workspaces: All Projects, Project Details, Project Members, Create Project, Kanban
- Delivery: All Tasks, My Tasks, Create Task
- Activity: My Activity, Activity Log, Calendar, Search & Filters
- Account: Profile & Security, Settings
- Administration: Admin Dashboard
- About: Project Docs

## Core feature status
- Auth foundation:
  - OIDC Authorization Code + PKCE, callback handling, guarded routes.
- Dashboard:
  - Summary KPIs + activity history + SignalR live updates + preview fallback.
- Kanban:
  - Project picker, grouped status columns, drag/drop, create/edit dialogs, optimistic patch flows.
- Search & filters:
  - Cross-entity filtering flows aligned with current API clients.
- Project tools:
  - All Projects, Project Details, Project Members.
- Task tools:
  - All Tasks, My Tasks, Create Task.
- Activity tools:
  - My Activity (personal timeline) + Activity Log (admin/pm audit).
- Account:
  - Profile & Security, Settings (persisted app preferences).

## Contract alignment rules (enforced)
- Frontend uses backend enums/contracts from typed models (no ad-hoc enum invention).
- Patch semantics preserve omitted vs `null` behavior.
- Date values sent to API follow ISO conventions.
- Problem Details responses are surfaced consistently at UI layer.

## Quality and cleanup status
- Legacy scaffold artifacts removed:
  - unused dummy services (`ProjectService`, `TaskItemService`, `LoginService`) and associated specs.
  - empty unused feature modules (`projects.module.ts`, `task-item.module.ts`).
- UI consistency pass completed across major pages:
  - header card + kpi cards + main content card patterns.
  - PrimeNG built-in table filter strategy on table-centric pages.

## Known backend/API gaps worth addressing
- Activity endpoint filtering:
  - Current contract used by SPA does not expose server-side actor/type/date filters.
  - Activity Log currently applies these filters client-side after fetching feed data.
- Authorization matrix check:
  - `GET /api/projects/{id}` policy should be verified against intended `User` read capabilities.
