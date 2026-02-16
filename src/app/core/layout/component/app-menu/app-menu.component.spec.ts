import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { RouterTestingModule } from '@angular/router/testing';

import { AppMenuComponent } from './app-menu.component';
import { AuthService } from '../../../auth/services/auth.service';

describe('AppMenuComponent', () => {
  let component: AppMenuComponent;
  let fixture: ComponentFixture<AppMenuComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NoopAnimationsModule, RouterTestingModule, AppMenuComponent],
      providers: [
        {
          provide: AuthService,
          useValue: {
            hasRole: () => true
          }
        }
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AppMenuComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
