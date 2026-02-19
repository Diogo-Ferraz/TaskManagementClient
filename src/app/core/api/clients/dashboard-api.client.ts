import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { APP_ENVIRONMENT } from '../../config/app-environment.token';
import { joinUrl } from '../http/url.util';
import { DashboardSummaryDto } from '../models/dashboard.model';

@Injectable({ providedIn: 'root' })
export class DashboardApiClient {
  private readonly http = inject(HttpClient);
  private readonly appEnvironment = inject(APP_ENVIRONMENT);
  private readonly dashboardSummaryUrl = joinUrl(this.appEnvironment.apiBaseUrl, '/api/dashboard/summary');

  getSummary(): Observable<DashboardSummaryDto> {
    return this.http.get<DashboardSummaryDto>(this.dashboardSummaryUrl);
  }
}
