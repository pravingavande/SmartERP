import { Injectable, signal } from '@angular/core';
import { ToastItem, ToastType } from '../models/toast.model';

@Injectable({ providedIn: 'root' })
export class ToastService {
  private readonly _toasts = signal<ToastItem[]>([]);
  private readonly timers = new Map<number, number>();
  private seq = 0;

  readonly toasts = this._toasts.asReadonly();

  showSuccess(message: string, title?: string, durationMs = 3000): void {
    this.show('success', message, title, durationMs);
  }

  showError(message: string, title?: string, durationMs = 4000): void {
    this.show('error', message, title, durationMs);
  }

  showWarning(message: string, title?: string, durationMs = 3500): void {
    this.show('warning', message, title, durationMs);
  }

  showInfo(message: string, title?: string, durationMs = 3000): void {
    this.show('info', message, title, durationMs);
  }

  dismiss(id: number): void {
    const handle = this.timers.get(id);
    if (handle !== undefined) {
      window.clearTimeout(handle);
      this.timers.delete(id);
    }

    queueMicrotask(() => {
      this._toasts.update((list) => list.filter((t) => t.id !== id));
    });
  }

  private show(type: ToastType, message: string, title: string | undefined, durationMs: number): void {
    const id = ++this.seq;
    const item: ToastItem = {
      id,
      type,
      title: title?.trim() || this.defaultTitle(type),
      message,
      duration: durationMs,
      createdAt: Date.now()
    };

    queueMicrotask(() => {
      this._toasts.update((list) => [...list, item]);
    });

    const handle = window.setTimeout(() => this.dismiss(id), durationMs);
    this.timers.set(id, handle);
  }

  private defaultTitle(type: ToastType): string {
    switch (type) {
      case 'success':
        return 'Success';
      case 'error':
        return 'Error';
      case 'warning':
        return 'Warning';
      case 'info':
        return 'Info';
    }
  }
}
