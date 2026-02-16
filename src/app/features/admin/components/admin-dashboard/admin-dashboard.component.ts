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
import { UserSummaryDto } from '../../../../core/api/models/user.model';

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

  users: UserSummaryDto[] = [];
  isLoading = false;
  isExporting = false;
  totalRecords = 0;
  first = 0;
  rows = 25;
  search = '';
  selectedStatus: boolean | null = null;
  selectedRole: string | null = null;
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

  ngOnInit(): void {
    this.loadUsers();
  }

  onLazyLoad(event: TableLazyLoadEvent): void {
    this.first = event.first ?? 0;
    this.rows = event.rows ?? this.rows;
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
    const page = Math.floor(this.first / this.rows) + 1;
    const search = this.search.trim();

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
    const pageSize = 100;
    let page = 1;
    let total = 0;
    const allUsers: UserSummaryDto[] = [];
    const search = this.search.trim();

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
}
