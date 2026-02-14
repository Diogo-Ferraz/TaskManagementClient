import { HttpParams } from '@angular/common/http';

export type QueryValue = string | number | boolean | Date | null | undefined;

export function buildHttpParams(query: Record<string, QueryValue>): HttpParams {
  let params = new HttpParams();

  for (const [key, value] of Object.entries(query)) {
    if (value === null || value === undefined) {
      continue;
    }

    const resolvedValue = value instanceof Date ? value.toISOString() : String(value);
    params = params.set(key, resolvedValue);
  }

  return params;
}
