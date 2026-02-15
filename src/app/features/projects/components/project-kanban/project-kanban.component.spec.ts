import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { BehaviorSubject, of } from 'rxjs';

import { ProjectKanbanComponent } from './project-kanban.component';
import { ProjectsApiClient } from '../../../../core/api/clients/projects-api.client';
import { TaskItemsApiClient } from '../../../../core/api/clients/task-items-api.client';

describe('ProjectKanbanComponent', () => {
  let component: ProjectKanbanComponent;
  let fixture: ComponentFixture<ProjectKanbanComponent>;
  const queryParamMap$ = new BehaviorSubject(convertToParamMap({}));

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProjectKanbanComponent],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            queryParamMap: queryParamMap$.asObservable()
          }
        },
        {
          provide: ProjectsApiClient,
          useValue: {
            getProjects: () => of([{ id: 'project-1', name: 'Project One' }])
          }
        },
        {
          provide: TaskItemsApiClient,
          useValue: {
            getTasks: () => of([])
          }
        }
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ProjectKanbanComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
