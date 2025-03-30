import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { SharedModule } from '../../../../shared/shared.module';
import { DragDropModule } from 'primeng/dragdrop';

@Component({
  selector: 'app-project-kanban',
  standalone: true,
  imports: [CommonModule, SharedModule, DragDropModule],
  templateUrl: './project-kanban.component.html',
  styleUrl: './project-kanban.component.scss'
})
export class ProjectKanbanComponent {
  taskStatus = ['To Do', 'In Progress', 'Done', 'Blocked'];
  public type = '';
  public draggedTask: any;
  public todos = [
    {
      id: 1,
      name: 'Set up theme',
      description: `Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book`,
      assignee: 'John Doe',
      createdOn: new Date(),
      status: 'Blocked',
    },
    {
      id: 2,
      name: 'Develop layout',
      description: `Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book`,
      assignee: 'Will Smith',
      createdOn: new Date(),
      status: 'To Do',
    },
    {
      id: 3,
      name: 'Develop Auth Module',
      description: `Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book`,
      assignee: 'James Aninston',
      createdOn: new Date(),
      status: 'To Do',
    },
    {
      id: 4,
      name: 'Develop layout',
      description: `Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book`,
      assignee: 'Will Smith',
      createdOn: new Date(),
      status: 'In Progress',
    },
    {
      id: 5,
      name: 'Develop layout',
      description: `Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book`,
      assignee: 'Will Smith',
      createdOn: new Date(),
      status: 'In Progress',
    },
    {
      id: 6,
      name: 'Develop layout',
      description: `Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book`,
      assignee: 'John Doe',
      createdOn: new Date(),
      status: 'Done',
    },
  ];

  constructor() { }

  getTasksByStatus(status: string): any[] {
    return this.todos.filter(task => task.status === status);
  }

  dragStart(event: DragEvent, task: any) {
    this.draggedTask = task;
  }

  dragEnd() {
    this.draggedTask = null;
  }

  drop(event: any, newStatus: string) {
    if (this.draggedTask) {
      const taskIndex = this.todos.findIndex(t => t.id === this.draggedTask!.id);

      if (taskIndex !== -1) {
        this.todos[taskIndex] = {
          ...this.todos[taskIndex],
          status: newStatus
        };

        this.saveChanges();
      }

      this.draggedTask = null;
    }
  }

  saveChanges() {
    console.log('Tasks updated:', this.todos);
  }

  addNewTask(status: string) {
    const newTask: any = {
      id: this.todos.length + 1,
      name: 'New Task',
      description: 'Add description here',
      status: status,
      createdOn: new Date()
    };

    this.todos.push(newTask);
  }
}
