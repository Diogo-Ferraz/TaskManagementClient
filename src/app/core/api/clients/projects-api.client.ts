import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { APP_ENVIRONMENT } from '../../config/app-environment.token';
import { buildHttpParams } from '../http/query-params.util';
import { joinUrl } from '../http/url.util';
import {
  CreateProjectRequest,
  PatchProjectRequest,
  ProjectDto,
  ProjectListQuery,
  ProjectMemberDto,
  UpdateProjectRequest
} from '../models/project.model';

@Injectable({ providedIn: 'root' })
export class ProjectsApiClient {
  private readonly http = inject(HttpClient);
  private readonly appEnvironment = inject(APP_ENVIRONMENT);
  private readonly projectsUrl = joinUrl(this.appEnvironment.apiBaseUrl, '/api/projects');

  getProjects(query: ProjectListQuery = {}): Observable<ProjectDto[]> {
    return this.http.get<ProjectDto[]>(this.projectsUrl, {
      params: buildHttpParams(query)
    });
  }

  getMyProjects(): Observable<ProjectDto[]> {
    return this.http.get<ProjectDto[]>(joinUrl(this.projectsUrl, '/my-projects'));
  }

  getById(projectId: string): Observable<ProjectDto> {
    return this.http.get<ProjectDto>(joinUrl(this.projectsUrl, `/${projectId}`));
  }

  getMembers(projectId: string): Observable<ProjectMemberDto[]> {
    return this.http.get<ProjectMemberDto[]>(joinUrl(this.projectsUrl, `/${projectId}/members`));
  }

  create(request: CreateProjectRequest): Observable<ProjectDto> {
    return this.http.post<ProjectDto>(this.projectsUrl, request);
  }

  update(projectId: string, request: UpdateProjectRequest): Observable<ProjectDto> {
    return this.http.put<ProjectDto>(joinUrl(this.projectsUrl, `/${projectId}`), request);
  }

  patch(projectId: string, request: PatchProjectRequest): Observable<ProjectDto> {
    return this.http.patch<ProjectDto>(joinUrl(this.projectsUrl, `/${projectId}`), request);
  }

  delete(projectId: string): Observable<void> {
    return this.http.delete<void>(joinUrl(this.projectsUrl, `/${projectId}`));
  }
}
