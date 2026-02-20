import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TableLazyLoadEvent, TableModule } from 'primeng/table';
import { InputSwitchModule } from 'primeng/inputswitch';
import { DropdownModule } from 'primeng/dropdown';
import { InputTextModule } from 'primeng/inputtext';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { TooltipModule } from 'primeng/tooltip';
import { finalize, firstValueFrom } from 'rxjs';
import { AdminUsersApiClient } from '../../../../core/api/clients/admin-users-api.client';
import { AuthService } from '../../../../core/auth/services/auth.service';
import { APP_ENVIRONMENT } from '../../../../core/config/app-environment.token';
import { UserSummaryDto } from '../../../../core/api/models/user.model';
import { AppPreferencesService } from '../../../../core/preferences/app-preferences.service';

interface SelectOption<TValue> {
  label: string;
  value: TValue;
}

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TableModule,
    InputSwitchModule,
    DropdownModule,
    InputTextModule,
    TagModule,
    ButtonModule,
    CardModule,
    TooltipModule
  ],
  templateUrl: './admin-dashboard.component.html',
  styleUrl: './admin-dashboard.component.scss'
})
export class AdminDashboardComponent implements OnInit {
  private readonly adminUsersApiClient = inject(AdminUsersApiClient);
  private readonly authService = inject(AuthService);
  private readonly appEnvironment = inject(APP_ENVIRONMENT);
  private readonly preferencesService = inject(AppPreferencesService);

  users: UserSummaryDto[] = [];
  isLoading = false;
  isExporting = false;
  isPreviewMode = false;
  previewDetail: string | null = null;
  totalRecords = 0;
  first = 0;
  rows = 25;
  search = '';
  selectedStatus: boolean | null = null;
  selectedRole: string | null = null;
  displayNameFilter = '';
  emailFilter = '';
  updatingUserIds = new Set<string>();

  readonly statusOptions: SelectOption<boolean | null>[] = [
    { label: 'All Statuses', value: null },
    { label: 'Active', value: true },
    { label: 'Inactive', value: false }
  ];

  readonly roleOptions: SelectOption<string | null>[] = [
    { label: 'All Roles', value: null },
    { label: 'Administrator', value: 'Administrator' },
    { label: 'ProjectManager', value: 'ProjectManager' },
    { label: 'User', value: 'User' }
  ];

  get exportFileName(): string {
    const date = new Date().toISOString().slice(0, 10);
    return `admin-users-${date}`;
  }

  get activeUsersCount(): number {
    return this.users.filter((user) => user.isActive).length;
  }

  get inactiveUsersCount(): number {
    return this.users.filter((user) => !user.isActive).length;
  }

  get adminUsersCount(): number {
    return this.users.filter((user) => user.roles.includes('Administrator')).length;
  }

  get projectManagerUsersCount(): number {
    return this.users.filter((user) => user.roles.includes('ProjectManager')).length;
  }

  get standardUsersCount(): number {
    return this.users.filter((user) => user.roles.includes('User')).length;
  }

  ngOnInit(): void {
    this.rows = this.preferencesService.preferences().defaultTablePageSize;
    this.loadUsers();
  }

  onLazyLoad(event: TableLazyLoadEvent): void {
    this.first = event.first ?? 0;
    this.rows = event.rows ?? this.rows;
    this.displayNameFilter = this.getFilterTextValue(event.filters?.['displayName']);
    this.emailFilter = this.getFilterTextValue(event.filters?.['email']);
    this.selectedRole = this.getFilterTextValue(event.filters?.['roles']) || null;
    this.selectedStatus = this.getFilterBooleanValue(event.filters?.['isActive']);
    this.loadUsers();
  }

  applyFilters(): void {
    this.first = 0;
    this.loadUsers();
  }

  clearFilters(): void {
    this.search = '';
    this.selectedStatus = null;
    this.selectedRole = null;
    this.displayNameFilter = '';
    this.emailFilter = '';
    this.first = 0;
    this.loadUsers();
  }

  async exportUsersAsExcelCompatibleCsv(): Promise<void> {
    if (this.isExporting) {
      return;
    }

    this.isExporting = true;
    try {
      const header = ['Display Name', 'Username', 'Email', 'Is Active', 'Roles'];
      const usersForExport = await this.loadAllUsersForExport();
      const lines = usersForExport.map((user) => [
        user.displayName ?? '',
        user.userName ?? '',
        user.email ?? '',
        user.isActive ? 'Yes' : 'No',
        user.roles.join(' | ')
      ]);

      const csv = [header, ...lines]
        .map((line) => line.map((value) => this.escapeCsv(value)).join(','))
        .join('\n');

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${this.exportFileName}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } finally {
      this.isExporting = false;
    }
  }

  isStatusUpdating(userId: string): boolean {
    return this.updatingUserIds.has(userId);
  }

  onActiveStatusChange(user: UserSummaryDto, isActive: boolean): void {
    if (user.isActive === isActive || this.isStatusUpdating(user.id)) {
      return;
    }

    const previousStatus = user.isActive;
    user.isActive = isActive;

    if (this.isPreviewMode) {
      return;
    }

    this.updatingUserIds.add(user.id);

    this.adminUsersApiClient
      .setStatus(user.id, { isActive })
      .pipe(
        finalize(() => {
          this.updatingUserIds.delete(user.id);
        })
      )
      .subscribe({
        next: () => undefined,
        error: () => {
          user.isActive = previousStatus;
        }
      });
  }

  trackByUserId(index: number, user: UserSummaryDto): string {
    return user.id;
  }

  private loadUsers(): void {
    this.isLoading = true;
    this.isPreviewMode = false;
    this.previewDetail = null;
    const page = Math.floor(this.first / this.rows) + 1;
    const search = this.getMergedSearchTerm();

    if (this.shouldUsePreviewMode()) {
      this.loadPreviewUsers('Preview mode active. Showing local admin dataset.');
      return;
    }

    this.adminUsersApiClient
      .getUsers({
        page,
        pageSize: this.rows,
        search: search.length > 0 ? search : undefined,
        isActive: this.selectedStatus ?? undefined,
        role: this.selectedRole ?? undefined
      })
      .pipe(
        finalize(() => {
          this.isLoading = false;
        })
      )
      .subscribe({
        next: (response) => {
          this.users = response.items;
          this.totalRecords = response.total;
          this.first = response.skip;
          this.rows = response.take;
        },
        error: () => {
          if (this.shouldUsePreviewMode()) {
            this.loadPreviewUsers('Backend unavailable. Showing preview admin dataset.');
            return;
          }

          this.users = [];
          this.totalRecords = 0;
        }
      });
  }

  private escapeCsv(value: string): string {
    const escaped = value.replace(/"/g, '""');
    return `"${escaped}"`;
  }

  private async loadAllUsersForExport(): Promise<UserSummaryDto[]> {
    if (this.isPreviewMode) {
      return [...this.users];
    }

    const pageSize = 100;
    let page = 1;
    let total = 0;
    const allUsers: UserSummaryDto[] = [];
    const search = this.getMergedSearchTerm();

    do {
      const response = await firstValueFrom(
        this.adminUsersApiClient.getUsers({
          page,
          pageSize,
          search: search.length > 0 ? search : undefined,
          isActive: this.selectedStatus ?? undefined,
          role: this.selectedRole ?? undefined
        })
      );

      total = response.total;
      allUsers.push(...response.items);
      page += 1;
    } while (allUsers.length < total);

    return allUsers;
  }

  private shouldUsePreviewMode(): boolean {
    return this.authService.authSession()?.isDebugSession === true && this.authService.canStartDebugSession();
  }

  private loadPreviewUsers(detail: string): void {
    this.isPreviewMode = true;
    this.previewDetail = detail;
    this.users = this.filterPreviewUsers(this.createPreviewUsers());
    this.totalRecords = this.users.length;
    this.first = 0;
    this.isLoading = false;
  }

  private filterPreviewUsers(users: UserSummaryDto[]): UserSummaryDto[] {
    const search = this.search.trim().toLowerCase();
    const displayName = this.displayNameFilter.trim().toLowerCase();
    const email = this.emailFilter.trim().toLowerCase();
    let filtered = [...users];

    if (search.length > 0) {
      filtered = filtered.filter((user) => {
        const haystack = `${user.displayName ?? ''} ${user.userName ?? ''} ${user.email ?? ''}`.toLowerCase();
        return haystack.includes(search);
      });
    }

    if (displayName.length > 0) {
      filtered = filtered.filter((user) => (user.displayName ?? '').toLowerCase().includes(displayName));
    }

    if (email.length > 0) {
      filtered = filtered.filter((user) => (user.email ?? '').toLowerCase().includes(email));
    }

    if (this.selectedStatus !== null) {
      filtered = filtered.filter((user) => user.isActive === this.selectedStatus);
    }

    if (this.selectedRole) {
      filtered = filtered.filter((user) => user.roles.includes(this.selectedRole as string));
    }

    return filtered;
  }

  private getMergedSearchTerm(): string {
    return [this.search, this.displayNameFilter, this.emailFilter]
      .map((value) => value.trim())
      .filter((value) => value.length > 0)
      .join(' ');
  }

  private getFilterTextValue(filterMeta: unknown): string {
    const filterValue = this.getFilterRawValue(filterMeta);

    if (filterValue === null || filterValue === undefined) {
      return '';
    }

    return String(filterValue).trim();
  }

  private getFilterBooleanValue(filterMeta: unknown): boolean | null {
    const filterValue = this.getFilterRawValue(filterMeta);

    if (filterValue === null || filterValue === undefined || filterValue === '') {
      return null;
    }

    if (typeof filterValue === 'boolean') {
      return filterValue;
    }

    if (typeof filterValue === 'string') {
      const normalized = filterValue.trim().toLowerCase();
      if (normalized === 'true') {
        return true;
      }

      if (normalized === 'false') {
        return false;
      }
    }

    return null;
  }

  private getFilterRawValue(filterMeta: unknown): unknown {
    if (!filterMeta || typeof filterMeta !== 'object') {
      return null;
    }

    const meta = filterMeta as { value?: unknown; constraints?: Array<{ value?: unknown }> };
    if (Array.isArray(meta.constraints) && meta.constraints.length > 0) {
      return meta.constraints[0]?.value ?? null;
    }

    return meta.value ?? null;
  }

  private createPreviewUsers(): UserSummaryDto[] {
    return [
      {
        id: 'user-1',
        displayName: 'Ava Mitchell',
        userName: 'ava.mitchell',
        email: 'ava.mitchell@example.com',
        isActive: true,
        roles: ['Administrator']
      },
      {
        id: 'user-2',
        displayName: 'Noah Sanders',
        userName: 'noah.sanders',
        email: 'noah.sanders@example.com',
        isActive: true,
        roles: ['ProjectManager']
      },
      {
        id: 'user-3',
        displayName: 'Liam Carter',
        userName: 'liam.carter',
        email: 'liam.carter@example.com',
        isActive: true,
        roles: ['User']
      },
      {
        id: 'user-4',
        displayName: 'Mia Foster',
        userName: 'mia.foster',
        email: 'mia.foster@example.com',
        isActive: false,
        roles: ['User']
      },
      {
        id: 'user-5',
        displayName: 'Ethan Brooks',
        userName: 'ethan.brooks',
        email: 'ethan.brooks@example.com',
        isActive: true,
        roles: ['ProjectManager', 'User']
      }
    ];
  }
}
