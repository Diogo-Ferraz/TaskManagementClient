import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { MessageService } from 'primeng/api';
import { catchError, throwError } from 'rxjs';
import { ProblemDetails } from '../../api/models/problem-details.model';

export const problemDetailsInterceptor: HttpInterceptorFn = (request, next) => {
  const messageService = inject(MessageService);

  return next(request).pipe(
    catchError((error: unknown) => {
      if (!(error instanceof HttpErrorResponse)) {
        return throwError(() => error);
      }

      // Avoid noisy toasts when browser/network interruption happens before response.
      if (error.status === 0) {
        messageService.add({
          severity: 'error',
          summary: 'Network error',
          detail: 'Could not reach the server. Please check your connection.'
        });
        return throwError(() => error);
      }

      const problem = normalizeProblemDetails(error.error);
      const detail = resolveErrorDetail(problem, error.status);
      const summary = resolveErrorSummary(error.status);

      messageService.add({
        severity: error.status >= 500 ? 'error' : 'warn',
        summary,
        detail
      });

      return throwError(() => error);
    })
  );
};

function normalizeProblemDetails(value: unknown): ProblemDetails {
  if (!value || typeof value !== 'object') {
    return {};
  }

  return value as ProblemDetails;
}

function resolveErrorSummary(status: number): string {
  switch (status) {
    case 400:
      return 'Validation error';
    case 401:
      return 'Authentication required';
    case 403:
      return 'Access denied';
    case 404:
      return 'Not found';
    case 429:
      return 'Too many requests';
    default:
      return status >= 500 ? 'Server error' : 'Request failed';
  }
}

function resolveErrorDetail(problem: ProblemDetails, status: number): string {
  if (problem.detail && problem.detail.trim().length > 0) {
    return problem.detail;
  }

  const firstValidationError = extractFirstValidationError(problem.errors);
  if (firstValidationError) {
    return firstValidationError;
  }

  switch (status) {
    case 401:
      return 'Please sign in to continue.';
    case 403:
      return 'You do not have permission to perform this action.';
    case 404:
      return 'The requested resource was not found.';
    case 429:
      return 'Rate limit exceeded. Please try again shortly.';
    default:
      return status >= 500
        ? 'An unexpected server error occurred.'
        : 'The request could not be completed.';
  }
}

function extractFirstValidationError(errors?: Record<string, string[]>): string | null {
  if (!errors) {
    return null;
  }

  for (const messages of Object.values(errors)) {
    if (messages.length > 0) {
      return messages[0];
    }
  }

  return null;
}
