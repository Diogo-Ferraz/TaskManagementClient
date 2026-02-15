import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { SearchFiltersComponent } from './search-filters.component';
import { ProjectsApiClient } from '../../../../core/api/clients/projects-api.client';
import { TaskItemsApiClient } from '../../../../core/api/clients/task-items-api.client';

describe('SearchFiltersComponent', () => {
  let component: SearchFiltersComponent;
  let fixture: ComponentFixture<SearchFiltersComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SearchFiltersComponent],
      providers: [
        {
          provide: ProjectsApiClient,
          useValue: {
            getProjects: () => of([{ id: 'project-1', name: 'Project One' }]),
            getMembers: () => of([{ userId: 'user-1', displayName: 'Alice Example', isOwner: false }])
          }
        },
        {
          provide: TaskItemsApiClient,
          useValue: {
            getTasks: () => of([])
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(SearchFiltersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
