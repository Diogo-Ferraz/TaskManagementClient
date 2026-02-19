import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { APP_ENVIRONMENT } from '../../config/app-environment.token';
import { buildHttpParams } from '../http/query-params.util';
import { joinUrl } from '../http/url.util';
import { ActivityFeedQuery, ActivityLogDto } from '../models/activity.model';

@Injectable({ providedIn: 'root' })
export class ActivityApiClient {
  private readonly http = inject(HttpClient);
  private readonly appEnvironment = inject(APP_ENVIRONMENT);
  private readonly activityUrl = joinUrl(this.appEnvironment.apiBaseUrl, '/api/activity');

  getFeed(query: ActivityFeedQuery = {}): Observable<ActivityLogDto[]> {
    return this.http.get<ActivityLogDto[]>(this.activityUrl, {
      params: buildHttpParams(query)
    });
  }
}
