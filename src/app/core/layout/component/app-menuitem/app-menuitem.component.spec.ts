import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AppMenuitemComponent } from './app-menuitem.component';

describe('AppMenuitemComponent', () => {
  let component: AppMenuitemComponent;
  let fixture: ComponentFixture<AppMenuitemComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppMenuitemComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AppMenuitemComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
