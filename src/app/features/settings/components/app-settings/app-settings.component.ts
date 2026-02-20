import { Component, computed, inject } from '@angular/core';
import { SharedModule } from '../../../../shared/shared.module';
import {
  AppPreferencesService,
  DefaultTaskFilterPreset,
  DefaultHomeRoute,
  DateFormatPreference,
  KanbanSwimlanePreference,
  SidebarBehavior,
  TaskSortPreference,
  UiDensity
} from '../../../../core/preferences/app-preferences.service';
import { LayoutService } from '../../../../core/layout/services/layout.service';

interface SelectOption<T> {
  label: string;
  value: T;
}

@Component({
  selector: 'app-app-settings',
  standalone: true,
  imports: [SharedModule],
  templateUrl: './app-settings.component.html',
  styleUrl: './app-settings.component.scss'
})
export class AppSettingsComponent {
  private readonly preferencesService = inject(AppPreferencesService);
  private readonly layoutService = inject(LayoutService);

  readonly preferences = this.preferencesService.preferences;
  readonly isDarkTheme = this.layoutService.isDarkTheme;

  readonly themeOptions: SelectOption<'light' | 'dark'>[] = [
    { label: 'Light', value: 'light' },
    { label: 'Dark', value: 'dark' }
  ];

  readonly densityOptions: SelectOption<UiDensity>[] = [
    { label: 'Comfortable', value: 'comfortable' },
    { label: 'Compact', value: 'compact' }
  ];

  readonly sidebarBehaviorOptions: SelectOption<SidebarBehavior>[] = [
    { label: 'Expanded by default', value: 'expanded' },
    { label: 'Collapsed by default', value: 'collapsed' }
  ];

  readonly dateFormatOptions: SelectOption<DateFormatPreference>[] = [
    { label: 'Medium (Jan 01, 2026)', value: 'medium' },
    { label: 'Short (01/01/2026)', value: 'short' },
    { label: 'ISO (2026-01-01)', value: 'iso' }
  ];

  readonly defaultHomeRouteOptions: SelectOption<DefaultHomeRoute>[] = [
    { label: 'Dashboard', value: 'dashboard' },
    { label: 'My Tasks', value: 'my-tasks' },
    { label: 'Kanban Board', value: 'kanban' }
  ];

  readonly tablePageSizeOptions: SelectOption<10 | 25 | 50>[] = [
    { label: '10 rows', value: 10 },
    { label: '25 rows', value: 25 },
    { label: '50 rows', value: 50 }
  ];

  readonly taskSortOptions: SelectOption<TaskSortPreference>[] = [
    { label: 'Last Updated (Newest)', value: 'lastUpdatedDesc' },
    { label: 'Due Date (Earliest First)', value: 'dueDateAsc' },
    { label: 'Status then Due Date', value: 'statusThenDueDate' }
  ];

  readonly kanbanSwimlaneOptions: SelectOption<KanbanSwimlanePreference>[] = [
    { label: 'None', value: 'none' },
    { label: 'Assignee', value: 'assignee' }
  ];

  readonly defaultTaskFilterPresetOptions: SelectOption<DefaultTaskFilterPreset>[] = [
    { label: 'All Tasks', value: 'all' },
    { label: 'Assigned to Me', value: 'assignedToMe' },
    { label: 'Unassigned', value: 'unassigned' }
  ];

  readonly datePreview = computed(() => this.preferencesService.formatDate(new Date('2026-02-19T10:30:00Z')));

  onThemeChange(mode: 'light' | 'dark'): void {
    const nextDarkTheme = mode === 'dark';
    this.layoutService.layoutConfig.update((state) => ({
      ...state,
      darkTheme: nextDarkTheme
    }));
  }

  onDensityChange(value: UiDensity): void {
    this.preferencesService.update({ uiDensity: value });
  }

  onSidebarBehaviorChange(value: SidebarBehavior): void {
    this.preferencesService.update({ sidebarBehavior: value });
  }

  onDateFormatChange(value: DateFormatPreference): void {
    this.preferencesService.update({ dateFormat: value });
  }

  onDefaultHomeRouteChange(value: DefaultHomeRoute): void {
    this.preferencesService.update({ defaultHomeRoute: value });
  }

  onDefaultTablePageSizeChange(value: 10 | 25 | 50): void {
    this.preferencesService.update({ defaultTablePageSize: value });
  }

  onDefaultTaskSortChange(value: TaskSortPreference): void {
    this.preferencesService.update({ defaultTaskSort: value });
  }

  onKanbanSwimlaneChange(value: KanbanSwimlanePreference): void {
    this.preferencesService.update({ kanbanSwimlanePreference: value });
  }

  onDefaultTaskFilterPresetChange(value: DefaultTaskFilterPreset): void {
    this.preferencesService.update({ defaultTaskFilterPreset: value });
  }

  onToggle<K extends keyof ReturnType<typeof this.preferences>>(key: K, value: ReturnType<typeof this.preferences>[K]): void {
    this.preferencesService.update({ [key]: value } as Partial<ReturnType<typeof this.preferences>>);
  }

  resetDefaults(): void {
    this.preferencesService.reset();
  }
}
