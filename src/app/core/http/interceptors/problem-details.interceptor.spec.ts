import { HttpErrorResponse, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { MessageService } from 'primeng/api';
import { problemDetailsInterceptor } from './problem-details.interceptor';
import { HttpClient } from '@angular/common/http';

describe('problemDetailsInterceptor', () => {
  let http: HttpClient;
  let httpTestingController: HttpTestingController;
  let messageService: MessageService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([problemDetailsInterceptor])),
        provideHttpClientTesting(),
        MessageService
      ]
    });

    http = TestBed.inject(HttpClient);
    httpTestingController = TestBed.inject(HttpTestingController);
    messageService = TestBed.inject(MessageService);
  });

  afterEach(() => {
    httpTestingController.verify();
  });

  it('shows problem details from API detail field', () => {
    spyOn(messageService, 'add');

    http.get('/api/projects').subscribe({
      error: (_error: HttpErrorResponse) => undefined
    });

    const request = httpTestingController.expectOne('/api/projects');
    request.flush(
      {
        title: 'Validation Error',
        status: 400,
        detail: 'Name is required.'
      },
      { status: 400, statusText: 'Bad Request' }
    );

    expect(messageService.add).toHaveBeenCalledWith(
      jasmine.objectContaining({
        summary: 'Validation error',
        detail: 'Name is required.'
      })
    );
  });

  it('falls back to first validation message from errors map', () => {
    spyOn(messageService, 'add');

    http.get('/api/taskitems').subscribe({
      error: (_error: HttpErrorResponse) => undefined
    });

    const request = httpTestingController.expectOne('/api/taskitems');
    request.flush(
      {
        title: 'Validation Error',
        status: 400,
        errors: {
          title: ['Title must not be empty.']
        }
      },
      { status: 400, statusText: 'Bad Request' }
    );

    expect(messageService.add).toHaveBeenCalledWith(
      jasmine.objectContaining({
        summary: 'Validation error',
        detail: 'Title must not be empty.'
      })
    );
  });

  it('prefers field validation errors over generic detail message', () => {
    spyOn(messageService, 'add');

    http.post('/api/projects', {}).subscribe({
      error: (_error: HttpErrorResponse) => undefined
    });

    const request = httpTestingController.expectOne('/api/projects');
    request.flush(
      {
        title: 'Validation Error',
        status: 400,
        detail: 'One or more validation errors occurred.',
        errors: {
          description: ['Description must be 500 characters or fewer.']
        }
      },
      { status: 400, statusText: 'Bad Request' }
    );

    expect(messageService.add).toHaveBeenCalledWith(
      jasmine.objectContaining({
        summary: 'Validation error',
        detail: 'Description must be 500 characters or fewer.'
      })
    );
  });
});
