import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { APP_ENVIRONMENT } from '../../config/app-environment.token';
import { buildHttpParams } from '../http/query-params.util';
import { joinUrl } from '../http/url.util';
import {
  GetUsersQuery,
  SetUserStatusRequest,
  UserDetailsDto,
  UserListResponse
} from '../models/user.model';

@Injectable({ providedIn: 'root' })
export class AdminUsersApiClient {
  private readonly http = inject(HttpClient);
  private readonly appEnvironment = inject(APP_ENVIRONMENT);
  private readonly usersUrl = joinUrl(this.appEnvironment.authApiBaseUrl, '/api/users');

  getUsers(query: GetUsersQuery = {}): Observable<UserListResponse> {
    return this.http.get<UserListResponse>(this.usersUrl, {
      params: buildHttpParams(query)
    });
  }

  getDetails(userId: string): Observable<UserDetailsDto> {
    return this.http.get<UserDetailsDto>(joinUrl(this.usersUrl, `/${userId}/details`));
  }

  setStatus(userId: string, request: SetUserStatusRequest): Observable<void> {
    return this.http.patch<void>(joinUrl(this.usersUrl, `/${userId}/status`), request);
  }
}
