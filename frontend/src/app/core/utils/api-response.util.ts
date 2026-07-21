export interface ApiEnvelope<T> {
  success?: boolean;
  Success?: boolean;
  message?: string | null;
  Message?: string | null;
  data?: T | null;
  Data?: T | null;
}

export function apiSuccess<T>(response: ApiEnvelope<T>): boolean {
  return !!(response.success ?? response.Success);
}

export function apiMessage<T>(response: ApiEnvelope<T>): string | undefined {
  return response.message ?? response.Message ?? undefined;
}

export function apiData<T>(response: ApiEnvelope<T>): T | null | undefined {
  return response.data ?? response.Data;
}

export interface UploadResult {
  path: string | null;
  error: string | null;
}

export function apiUploadPath(response: ApiEnvelope<string>): UploadResult {
  const path = apiData(response);
  if (apiSuccess(response) && path) {
    return { path, error: null };
  }
  return { path: null, error: apiMessage(response) ?? 'Upload failed.' };
}

export function apiUploadHttpError(err: unknown, fallback = 'Upload failed.'): string {
  const body = (err as { error?: ApiEnvelope<unknown> })?.error;
  return body ? apiMessage(body) ?? fallback : fallback;
}
