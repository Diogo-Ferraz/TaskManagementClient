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
  const validationSummary = extractValidationSummary(problem.errors);
  if (status === 400 && validationSummary) {
    return validationSummary;
  }

  if (problem.detail && problem.detail.trim().length > 0) {
    return problem.detail;
  }

  if (validationSummary) {
    return validationSummary;
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

function extractValidationSummary(errors?: Record<string, string[]>): string | null {
  if (!errors) {
    return null;
  }

  const messages: string[] = [];

  for (const [fieldName, fieldErrors] of Object.entries(errors)) {
    for (const message of fieldErrors) {
      if (!message || message.trim().length === 0) {
        continue;
      }

      const fieldLabel = toFieldLabel(fieldName);
      const hasFieldNameInMessage = message.toLowerCase().includes(fieldLabel.toLowerCase());
      messages.push(hasFieldNameInMessage ? message : `${fieldLabel}: ${message}`);
    }
  }

  if (messages.length === 0) {
    return null;
  }

  const preview = messages.slice(0, 2).join(' ');
  const remainingCount = messages.length - 2;
  if (remainingCount > 0) {
    return `${preview} (+${remainingCount} more)`;
  }

  return preview;
}

function toFieldLabel(fieldName: string): string {
  const normalized = fieldName
    .replace(/^\$\./, '')
    .replace(/\./g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim();

  if (!normalized) {
    return 'Field';
  }

  return normalized
    .split(' ')
    .map((segment) => {
      if (segment.length === 0) {
        return segment;
      }

      if (segment.length === 1) {
        return segment.toUpperCase();
      }

      return `${segment[0].toUpperCase()}${segment.slice(1)}`;
    })
    .join(' ');
}
