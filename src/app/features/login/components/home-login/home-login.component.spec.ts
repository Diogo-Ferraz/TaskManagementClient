import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HomeLoginComponent } from './home-login.component';
import { AuthService } from '../../../../core/auth/services/auth.service';

describe('HomeLoginComponent', () => {
  let component: HomeLoginComponent;
  let fixture: ComponentFixture<HomeLoginComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HomeLoginComponent],
      providers: [
        {
          provide: AuthService,
          useValue: {
            startLoginRedirect: jasmine.createSpy('startLoginRedirect').and.resolveTo()
          }
        }
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(HomeLoginComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
