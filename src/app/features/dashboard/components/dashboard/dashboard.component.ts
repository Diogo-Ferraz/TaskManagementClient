import { Component, OnInit, OnDestroy } from '@angular/core';
import { forkJoin, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { SharedModule } from '../../../../shared/shared.module';
import { TaskItemService, TaskItemDto, TaskStatus } from '../../../task-item/services/task-item.service';
import { ProjectService, ProjectDto } from '../../../projects/services/project.service';
import { ChartModule } from 'primeng/chart';
import { MessagesModule } from 'primeng/messages';
import { Message } from 'primeng/api';

interface DashboardCard {
  title: string;
  value: string | number;
  icon: string;
  iconColor: string;
  bgColor: string;
  description?: string;
  stat?: string;
}

interface ProjectCompletionStat {
  id: string;
  name: string;
  percentage: number;
  taskCount: number;
}

interface RecentActivity {
  icon: string;
  iconColor: string;
  bgColor: string;
  summary: string;
  time: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [SharedModule, ChartModule, MessagesModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit, OnDestroy {

  dashboardCards: DashboardCard[] = [];
  isLoading = true;
  errorMessages: Message[] = [];

  projectCompletionStats: ProjectCompletionStat[] = [];
  recentActivities: RecentActivity[] = [];

  taskStatusChartData: any;
  taskStatusChartOptions: any;

  private destroy$ = new Subject<void>();

  constructor(
    private projectService: ProjectService,
    private taskItemService: TaskItemService
  ) { }

  ngOnInit(): void {
    this.loadDashboardData();
    this.initializeChartOptions();
    this.loadMockActivities();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadDashboardData(): void {
    this.isLoading = true;
    this.errorMessages = [];
    this.projectCompletionStats = [];

    forkJoin({
      projects: this.projectService.getUserProjects(),
      tasks: this.taskItemService.getAllTasks()
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: ({ projects, tasks }) => {
          this.calculateDashboardStats(projects, tasks);
          this.prepareChartData(tasks);
          this.isLoading = false;
        },
        error: (err) => {
          console.error('Error loading dashboard data:', err);
          this.errorMessages = [{ severity: 'error', summary: 'Error', detail: 'Could not fetch dashboard information.' }];
          this.isLoading = false;
          this.dashboardCards = this.getDefaultCards();
        }
      });
  }

  calculateDashboardStats(projects: ProjectDto[], tasks: TaskItemDto[]): void {
    const totalProjects = projects.length;
    const totalTasks = tasks.length;
    const tasksInProgress = tasks.filter(t => t.status === TaskStatus.InProgress).length;
    const tasksDone = tasks.filter(t => t.status === TaskStatus.Done).length;

    this.dashboardCards = [
      { title: 'Total Projects', value: totalProjects, icon: 'pi pi-folder-open', iconColor: 'text-primary', bgColor: 'bg-blue-100', description: 'Active projects' },
      { title: 'Total Tasks', value: totalTasks, icon: 'pi pi-th-large', iconColor: 'text-teal-500', bgColor: 'bg-teal-100 dark:bg-teal-400/10', description: 'Across all projects' },
      { title: 'Tasks In Progress', value: tasksInProgress, icon: 'pi pi-spinner-dotted', iconColor: 'text-orange-500', bgColor: 'bg-orange-100 dark:bg-orange-400/10', description: 'Currently active' },
      { title: 'Completed Tasks', value: tasksDone, icon: 'pi pi-check-circle', iconColor: 'text-green-500', bgColor: 'bg-green-100 dark:bg-green-400/10', description: 'Finished work' }
    ];

    this.projectCompletionStats = projects.map(project => {
      const projectTasks = tasks.filter(task => task.projectId === project.id);
      const totalProjectTasks = projectTasks.length;
      const completedProjectTasks = projectTasks.filter(task => task.status === TaskStatus.Done).length;
      const percentage = totalProjectTasks > 0 ? Math.round((completedProjectTasks / totalProjectTasks) * 100) : 0;

      return {
        id: project.id,
        name: project.name,
        percentage: percentage,
        taskCount: totalProjectTasks
      };
    }).sort((a, b) => b.percentage - a.percentage);
  }

  getDefaultCards(): DashboardCard[] {
    return [
      { title: 'Total Projects', value: '-', icon: 'pi pi-folder-open', iconColor: 'text-gray-500', bgColor: 'bg-gray-100' },
      { title: 'Total Tasks', value: '-', icon: 'pi pi-th-large', iconColor: 'text-gray-500', bgColor: 'bg-gray-100' },
      { title: 'Tasks In Progress', value: '-', icon: 'pi pi-spinner', iconColor: 'text-gray-500', bgColor: 'bg-gray-100' },
      { title: 'Completed Tasks', value: '-', icon: 'pi pi-check-circle', iconColor: 'text-gray-500', bgColor: 'bg-gray-100' },
    ];
  }

  initializeChartOptions(): void {
    const documentStyle = getComputedStyle(document.documentElement);
    const textColor = documentStyle.getPropertyValue('--text-color') || '#495057';

    this.taskStatusChartOptions = {
      plugins: {
        legend: {
          labels: {
            color: textColor,
            usePointStyle: true
          },
          position: 'bottom'
        }
      },
      cutout: '60%'
    };
  }

  prepareChartData(tasks: TaskItemDto[]): void {
    const statusCounts = {
      [TaskStatus.Todo]: 0,
      [TaskStatus.InProgress]: 0,
      [TaskStatus.Done]: 0,
      [TaskStatus.Blocked]: 0
    };

    tasks.forEach(task => {
      if (statusCounts.hasOwnProperty(task.status)) {
        statusCounts[task.status]++;
      }
    });

    const todoColor = '#94A3B8';
    const inProgressColor = '#F59E0B';
    const doneColor = '#10B981';
    const blockedColor = '#EF4444';

    this.taskStatusChartData = {
      labels: ['To Do', 'In Progress', 'Done', 'Blocked'],
      datasets: [
        {
          data: [
            statusCounts[TaskStatus.Todo],
            statusCounts[TaskStatus.InProgress],
            statusCounts[TaskStatus.Done],
            statusCounts[TaskStatus.Blocked]
          ],
          backgroundColor: [
            todoColor,
            inProgressColor,
            doneColor,
            blockedColor
          ],
          hoverBackgroundColor: [
            '#64748B',
            '#D97706',
            '#059669',
            '#DC2626'
          ],
          borderColor: document.documentElement.style.getPropertyValue('--surface-ground') || '#ffffff',
          borderWidth: 1
        }
      ]
    };
  }

  loadMockActivities(): void {
    this.recentActivities = [
      {
        icon: 'pi pi-check',
        iconColor: 'text-green-500',
        bgColor: 'bg-green-100 dark:bg-green-900/40',
        summary: `User <strong>Alice</strong> completed task <i>"Deploy Feature X"</i>`,
        time: '1h ago'
      },
      {
        icon: 'pi pi-plus',
        iconColor: 'text-blue-500',
        bgColor: 'bg-blue-100 dark:bg-blue-900/40',
        summary: `New project <strong>"Website Redesign"</strong> created`,
        time: '4h ago'
      },
      {
        icon: 'pi pi-comment',
        iconColor: 'text-orange-500',
        bgColor: 'bg-orange-100 dark:bg-orange-900/40',
        summary: `<strong>Bob</strong> commented on task <i>"Fix Login Bug"</i>`,
        time: 'Yesterday'
      },
      {
        icon: 'pi pi-user-plus',
        iconColor: 'text-purple-500',
        bgColor: 'bg-purple-100 dark:bg-purple-900/40',
        summary: `<strong>Charlie</strong> was assigned to project <strong>"API Development"</strong>`,
        time: '2 days ago'
      },
      {
        icon: 'pi pi-exclamation-triangle',
        iconColor: 'text-red-500',
        bgColor: 'bg-red-100 dark:bg-red-900/40',
        summary: `Task <i>"Update Dependencies"</i> is now <strong>Blocked</strong>`,
        time: '3 days ago'
      }
    ];
  }
}