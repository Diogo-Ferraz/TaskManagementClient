import { Injectable, computed, effect, signal } from '@angular/core';

export type UiDensity = 'comfortable' | 'compact';
export type DateFormatPreference = 'medium' | 'short' | 'iso';
export type TaskDialogMode = 'dialog' | 'drawer';
export type DefaultHomeRoute = 'dashboard' | 'my-tasks' | 'kanban';

export interface AppPreferences {
  uiDensity: UiDensity;
  dateFormat: DateFormatPreference;
  defaultHomeRoute: DefaultHomeRoute;
  defaultTablePageSize: 10 | 25 | 50;
  rememberLastSelectedProject: boolean;
  useRelativeDates: boolean;
  showActivityToasts: boolean;
  showCalendarReminders: boolean;
  enableDesktopNotifications: boolean;
  showKanbanDragPreview: boolean;
  showKanbanAssigneeAvatars: boolean;
  taskDialogMode: TaskDialogMode;
}

const PREFERENCES_STORAGE_KEY = 'task_management.app.preferences';
const LAST_SELECTED_PROJECTS_STORAGE_KEY = 'task_management.last_selected_projects';

const DEFAULT_PREFERENCES: AppPreferences = {
  uiDensity: 'comfortable',
  dateFormat: 'medium',
  defaultHomeRoute: 'dashboard',
  defaultTablePageSize: 25,
  rememberLastSelectedProject: true,
  useRelativeDates: true,
  showActivityToasts: true,
  showCalendarReminders: true,
  enableDesktopNotifications: false,
  showKanbanDragPreview: true,
  showKanbanAssigneeAvatars: true,
  taskDialogMode: 'dialog'
};

@Injectable({ providedIn: 'root' })
export class AppPreferencesService {
  private readonly preferencesSignal = signal<AppPreferences>(DEFAULT_PREFERENCES);

  readonly preferences = this.preferencesSignal.asReadonly();
  readonly density = computed(() => this.preferencesSignal().uiDensity);
  readonly dateFormat = computed(() => this.preferencesSignal().dateFormat);

  constructor() {
    this.hydratePreferences();

    effect(() => {
      const preferences = this.preferencesSignal();
      this.persistPreferences(preferences);
      this.applyDensityClass(preferences.uiDensity);
    });
  }

  update(patch: Partial<AppPreferences>): void {
    this.preferencesSignal.update((current) => ({
      ...current,
      ...patch
    }));
  }

  reset(): void {
    this.preferencesSignal.set({ ...DEFAULT_PREFERENCES });
  }

  formatDate(value: string | Date): string {
    const date = typeof value === 'string' ? new Date(value) : value;
    if (this.dateFormat() === 'iso') {
      return date.toISOString().slice(0, 10);
    }

    if (this.dateFormat() === 'short') {
      return new Intl.DateTimeFormat(undefined, {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }).format(date);
    }

    return new Intl.DateTimeFormat(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(date);
  }

  getDefaultHomeRoutePath(): string {
    const defaultHomeRoute = this.preferencesSignal().defaultHomeRoute;
    switch (defaultHomeRoute) {
      case 'my-tasks':
        return '/tasks/my-tasks';
      case 'kanban':
        return '/projects/kanban';
      case 'dashboard':
      default:
        return '/dashboard';
    }
  }

  setLastSelectedProject(context: string, projectId: string): void {
    if (!context || !projectId || !this.preferencesSignal().rememberLastSelectedProject) {
      return;
    }

    const projectMap = this.readLastSelectedProjectsMap();
    projectMap[context] = projectId;
    localStorage.setItem(LAST_SELECTED_PROJECTS_STORAGE_KEY, JSON.stringify(projectMap));
  }

  getLastSelectedProject(context: string): string | null {
    if (!context || !this.preferencesSignal().rememberLastSelectedProject) {
      return null;
    }

    const projectMap = this.readLastSelectedProjectsMap();
    const value = projectMap[context];
    return typeof value === 'string' && value.trim().length > 0 ? value : null;
  }

  private hydratePreferences(): void {
    const rawValue = localStorage.getItem(PREFERENCES_STORAGE_KEY);
    if (!rawValue) {
      return;
    }

    try {
      const parsed = JSON.parse(rawValue) as Partial<AppPreferences>;
      this.preferencesSignal.set({
        ...DEFAULT_PREFERENCES,
        ...parsed
      });
    } catch {
      this.preferencesSignal.set({ ...DEFAULT_PREFERENCES });
    }
  }

  private persistPreferences(preferences: AppPreferences): void {
    localStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(preferences));
  }

  private applyDensityClass(density: UiDensity): void {
    const root = document.documentElement;
    root.classList.toggle('app-density-compact', density === 'compact');
  }

  private readLastSelectedProjectsMap(): Record<string, string> {
    const raw = localStorage.getItem(LAST_SELECTED_PROJECTS_STORAGE_KEY);
    if (!raw) {
      return {};
    }

    try {
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      return Object.entries(parsed).reduce<Record<string, string>>((acc, [key, value]) => {
        if (typeof value === 'string') {
          acc[key] = value;
        }
        return acc;
      }, {});
    } catch {
      return {};
    }
  }
}
