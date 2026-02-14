export interface UserSummaryDto {
  id: string;
  displayName?: string | null;
  userName?: string | null;
  email?: string | null;
  isActive: boolean;
  roles: string[];
}

export interface UserDetailsDto extends UserSummaryDto {
  emailConfirmed: boolean;
  phoneNumber?: string | null;
  phoneNumberConfirmed: boolean;
  twoFactorEnabled: boolean;
  lockoutEnd?: string | null;
  accessFailedCount: number;
}

export interface UserListResponse {
  total: number;
  skip: number;
  take: number;
  items: UserSummaryDto[];
}

export interface GetUsersQuery {
  search?: string;
  isActive?: boolean;
  role?: string;
  page?: number;
  pageSize?: number;
  skip?: number;
  take?: number;
}

export interface SetUserStatusRequest {
  isActive: boolean;
}
