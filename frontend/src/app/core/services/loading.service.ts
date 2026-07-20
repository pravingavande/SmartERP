import { Injectable, computed, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class LoadingService {
  private readonly pending = signal(0);
  private showTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly visible = signal(false);

  /** True when at least one HTTP request is in flight long enough to show UI. */
  readonly isLoading = computed(() => this.visible());

  begin(): void {
    this.pending.update((n) => n + 1);
    if (this.pending() === 1 && !this.showTimer) {
      // Avoid flicker on fast calls.
      this.showTimer = setTimeout(() => {
        this.showTimer = null;
        if (this.pending() > 0) this.visible.set(true);
      }, 250);
    }
  }

  end(): void {
    this.pending.update((n) => Math.max(0, n - 1));
    if (this.pending() === 0) {
      if (this.showTimer) {
        clearTimeout(this.showTimer);
        this.showTimer = null;
      }
      this.visible.set(false);
    }
  }
}
