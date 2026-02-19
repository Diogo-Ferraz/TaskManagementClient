import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { APP_ENVIRONMENT } from '../../config/app-environment.token';
import { buildHttpParams } from '../http/query-params.util';
import { joinUrl } from '../http/url.util';
import {
  CreateTaskItemRequest,
  GetTasksQuery,
  PatchTaskItemRequest,
  TaskItemDto,
  UpdateTaskItemRequest
} from '../models/task-item.model';

@Injectable({ providedIn: 'root' })
export class TaskItemsApiClient {
  private readonly http = inject(HttpClient);
  private readonly appEnvironment = inject(APP_ENVIRONMENT);
  private readonly taskItemsUrl = joinUrl(this.appEnvironment.apiBaseUrl, '/api/taskitems');

  getTasks(query: GetTasksQuery = {}): Observable<TaskItemDto[]> {
    return this.http.get<TaskItemDto[]>(this.taskItemsUrl, {
      params: buildHttpParams(query)
    });
  }

  getById(taskItemId: string): Observable<TaskItemDto> {
    return this.http.get<TaskItemDto>(joinUrl(this.taskItemsUrl, `/${taskItemId}`));
  }

  getByProject(projectId: string): Observable<TaskItemDto[]> {
    return this.http.get<TaskItemDto[]>(joinUrl(this.taskItemsUrl, `/project/${projectId}`));
  }

  create(request: CreateTaskItemRequest): Observable<TaskItemDto> {
    return this.http.post<TaskItemDto>(this.taskItemsUrl, request);
  }

  update(taskItemId: string, request: UpdateTaskItemRequest): Observable<TaskItemDto> {
    return this.http.put<TaskItemDto>(joinUrl(this.taskItemsUrl, `/${taskItemId}`), request);
  }

  patch(taskItemId: string, request: PatchTaskItemRequest): Observable<TaskItemDto> {
    return this.http.patch<TaskItemDto>(joinUrl(this.taskItemsUrl, `/${taskItemId}`), request);
  }

  delete(taskItemId: string): Observable<void> {
    return this.http.delete<void>(joinUrl(this.taskItemsUrl, `/${taskItemId}`));
  }
}
