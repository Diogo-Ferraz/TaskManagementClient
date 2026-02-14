# SPA Architecture Plan (Angular + .NET 8 API)

## Architecture decisions
- Use Angular standalone-first feature architecture (no new NgModules).
- Keep clear boundaries: `core` (cross-cutting), `shared` (pure UI primitives), `features` (domain pages/use-cases).
- Keep API contract strict by maintaining backend-aligned DTO/request models under `core/api/models`.
- Use typed API clients per backend feature under `core/api/clients`.
- Use route-level lazy loading for each feature page group.
- Use Signals for local UI state and RxJS streams for async/server workflows.

## Proposed folder structure
- `src/app/core/config`: environment/config injection tokens.
- `src/app/core/auth`: OIDC PKCE flow, auth facade, role extraction.
- `src/app/core/http`: interceptors (auth bearer, problem-details mapping, retry policy).
- `src/app/core/api`: typed models + API clients (projects, taskitems, activity, dashboard, users).
- `src/app/core/realtime`: SignalR clients and event mappers.
- `src/app/features/dashboard`: dashboard shell + summary cards + activity feed.
- `src/app/features/kanban`: project board, drag/drop interactions, task update workflows.
- `src/app/features/search`: cross-entity filters/search views.
- `src/app/shared/ui`: reusable presentational components (cards, chips, loaders, empty states).
- `src/app/shared/utils`: pure helpers/formatters with tests.

## State strategy
- Feature facades own page state and orchestration.
- Keep state close to feature; avoid global store until needed.
- Use explicit `load/error/empty` view models for each screen.
- Use optimistic updates only where backend conflict risk is low; otherwise apply server-authoritative updates.

## Routing and authorization
- Public routes: login + auth callback.
- Protected routes: dashboard, board, search.
- Route data declares required capabilities; guard checks token roles.
- UI capability helpers control action visibility but API remains final authority.

## API contract alignment rules
- No frontend-only enum/value inventions.
- Patch payloads use omitted vs `null` semantics exactly as API contract defines.
- Date query filters use ISO-8601 UTC.
- ProblemDetails (`application/problem+json`) mapped to typed client errors.

## Planned commit slices
1. Foundation: typed API models/clients + environment/config plumbing.
2. Auth: OIDC code+PKCE login/callback/logout + auth guard/interceptor.
3. Dashboard: server summary + activity history + SignalR live feed.
4. Kanban read model: project selector + grouped task columns from API.
5. Kanban mutations: patch task status/assignee/due date with optimistic UX safeguards.
6. Search/filter page: users/projects/tasks filters + pagination.
7. Quality pass: unit tests for core clients/facades + component tests for key flows.
8. Cleanup pass: remove legacy dummy services/components and dead CSS.

## Backend gap found during alignment
- `GET /api/projects/{id}` currently requires `CanManageProjects` policy, which excludes `User` role at authorization layer.
- This appears to conflict with documented matrix intention where `User` should have scoped project read access.
