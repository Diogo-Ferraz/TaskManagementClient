import { Component, OnInit } from '@angular/core';
import { ProjectDto, ProjectService } from '../../services/project.service';

@Component({
  selector: 'app-project-list',
  standalone: true,
  imports: [],
  templateUrl: './project-list.component.html',
  styleUrl: './project-list.component.scss'
})
export class ProjectListComponent implements OnInit {
  projects: ProjectDto[] = [];

  constructor(private projectService: ProjectService) {}

  ngOnInit() {
    this.projectService.getUserProjects().subscribe(
      projects => this.projects = projects
    );
  }

  createProject() {
    const newProject = {
      name: 'New Project',
      description: 'A brand new project'
    };

    this.projectService.createProject(newProject).subscribe(
      createdProject => this.projects.push(createdProject)
    );
  }
}
