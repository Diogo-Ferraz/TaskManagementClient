import { Component, OnInit } from '@angular/core';
import { ProjectDto, ProjectService } from '../../services/project.service';
import { CommonModule } from '@angular/common';
import { SharedModule } from '../../../../shared/shared.module';
import { Table } from 'primeng/table';

@Component({
  selector: 'app-project-list',
  standalone: true,
  imports: [CommonModule, SharedModule],
  templateUrl: './project-list.component.html',
  styleUrl: './project-list.component.scss'
})
export class ProjectListComponent implements OnInit {
  projects: ProjectDto[] = [];

  representatives: any[] = [];

  statuses!: any[];

  loading: boolean = true;

  activityValues: number[] = [0, 100];

  searchValue: string | undefined;

  constructor(private projectService: ProjectService) { }

  ngOnInit() {
    this.projectService.getUserProjects().subscribe({
      next: (projects) => {
        this.projects = projects;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error fetching projects:', err);
        this.loading = false;
      }
    });

    this.representatives = [
      { name: 'Amy Elsner', image: 'amyelsner.png' },
      { name: 'Anna Fali', image: 'annafali.png' },
      { name: 'Asiya Javayant', image: 'asiyajavayant.png' },
      { name: 'Bernardo Dominic', image: 'bernardodominic.png' },
      { name: 'Elwin Sharvill', image: 'elwinsharvill.png' },
      { name: 'Ioni Bowcher', image: 'ionibowcher.png' },
      { name: 'Ivan Magalhaes', image: 'ivanmagalhaes.png' },
      { name: 'Onyama Limba', image: 'onyamalimba.png' },
      { name: 'Stephen Shaw', image: 'stephenshaw.png' },
      { name: 'Xuxue Feng', image: 'xuxuefeng.png' }
    ];

    this.statuses = [
      { label: 'Unqualified', value: 'unqualified' },
      { label: 'Qualified', value: 'qualified' },
      { label: 'New', value: 'new' },
      { label: 'Negotiation', value: 'negotiation' },
      { label: 'Renewal', value: 'renewal' },
      { label: 'Proposal', value: 'proposal' }
    ];
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

  clear(table: Table) {
    table.clear();
    this.searchValue = ''
  }

  getSeverity(status: string) {
    switch (status.toLowerCase()) {
      case 'unqualified':
        return 'danger';

      case 'qualified':
        return 'success';

      case 'new':
        return 'info';

      case 'negotiation':
        return 'warning';

      case 'renewal':
        return undefined;
    }
    return undefined;
  }

  onGlobalFilter(table: Table, event: Event) {
    table.filterGlobal((event.target as HTMLInputElement).value, 'contains');
  }
}
