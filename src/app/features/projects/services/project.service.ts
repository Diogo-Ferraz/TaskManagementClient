import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { TaskItemDto, TaskStatus } from '../../task-item/services/task-item.service';

@Injectable({
  providedIn: 'root'
})
export class ProjectService {

  private apiUrl = 'api/projects';

  constructor(private http: HttpClient) {}

  private generateDummyTaskItems(projectId: string, count: number = 3): TaskItemDto[] {
    return Array(count).fill(0).map((_, index) => ({
      id: crypto.randomUUID(),
      title: `Task ${index + 1}`,
      description: `Description for Task ${index + 1}`,
      status: TaskStatus.Todo,
      dueDate: new Date(Date.now() + (index + 1) * 24 * 60 * 60 * 1000),
      projectId: projectId,
      projectName: 'Dummy Project',
      assignedUserId: crypto.randomUUID(),
      assignedUserName: `User ${index + 1}`,
      createdAt: new Date(),
      createdBy: 'System',
      lastModifiedAt: new Date(),
      lastModifiedBy: 'System'
    }));
  }

  private generateDummyProjects(count: number = 3): ProjectDto[] {
    return Array(count).fill(0).map((_, index) => {
      const projectId = crypto.randomUUID();
      return {
        id: projectId,
        name: `Project ${index + 1}`,
        description: `Description for Project ${index + 1}`,
        userId: crypto.randomUUID(),
        userName: `Project Manager ${index + 1}`,
        createdAt: new Date(),
        createdBy: 'System',
        lastModifiedAt: new Date(),
        lastModifiedBy: 'System',
        taskItems: this.generateDummyTaskItems(projectId)
      };
    });
  }

  createProject(project: Partial<ProjectDto>): Observable<ProjectDto> {
    const newProject: ProjectDto = {
      ...project,
      id: crypto.randomUUID(),
      createdAt: new Date(),
      lastModifiedAt: new Date(),
      taskItems: this.generateDummyTaskItems(crypto.randomUUID())
    } as ProjectDto;
    return of(newProject);
  }

  updateProject(id: string, project: Partial<ProjectDto>): Observable<ProjectDto> {
    const updatedProject: ProjectDto = {
      ...project,
      id,
      lastModifiedAt: new Date(),
      lastModifiedBy: 'Current User'
    } as ProjectDto;
    return of(updatedProject);
  }

  deleteProject(id: string): Observable<void> {
    return of(undefined);
  }

  getProjectById(id: string): Observable<ProjectDto> {
    const projects = this.generateDummyProjects();
    const project = projects.find(p => p.id === id);
    return of(project || projects[0]);
  }

  getUserProjects(): Observable<ProjectDto[]> {
    return of(this.generateDummyProjects());
  }
}

export interface ProjectDto {
  id: string;
  name: string;
  description: string;
  userId: string;
  userName: string;
  createdAt: Date;
  createdBy: string;
  lastModifiedAt: Date;
  lastModifiedBy: string;
  taskItems?: TaskItemDto[];
}