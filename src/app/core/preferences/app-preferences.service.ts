import { Injectable, computed, effect, signal } from '@angular/core';

export type UiDensity = 'comfortable' | 'compact';
export type DateFormatPreference = 'medium' | 'short' | 'iso';
export type TaskDialogMode = 'dialog' | 'drawer';

export interface AppPreferences {
  uiDensity: UiDensity;
  dateFormat: DateFormatPreference;
  useRelativeDates: boolean;
  showActivityToasts: boolean;
  showCalendarReminders: boolean;
  enableDesktopNotifications: boolean;
  showKanbanDragPreview: boolean;
  showKanbanAssigneeAvatars: boolean;
  taskDialogMode: TaskDialogMode;
}

const PREFERENCES_STORAGE_KEY = 'task_management.app.preferences';

const DEFAULT_PREFERENCES: AppPreferences = {
  uiDensity: 'comfortable',
  dateFormat: 'medium',
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
}

