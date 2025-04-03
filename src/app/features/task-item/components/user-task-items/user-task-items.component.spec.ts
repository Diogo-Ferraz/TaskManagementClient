import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UserTaskItemsComponent } from './user-task-items.component';

describe('UserTaskItemsComponent', () => {
  let component: UserTaskItemsComponent;
  let fixture: ComponentFixture<UserTaskItemsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UserTaskItemsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(UserTaskItemsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
