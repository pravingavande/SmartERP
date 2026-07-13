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
