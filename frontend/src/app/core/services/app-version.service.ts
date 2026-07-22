import { Injectable, inject, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { fromEvent, interval, merge } from 'rxjs';
import { filter, switchMap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { APP_BUILD_ID } from '../../../build-version';
import { ToastService } from './toast.service';

interface DeployVersion {
  buildId: string;
  builtAt?: string;
}

/**
 * Detects new Firebase/IIS deployments while a tab is still open and reloads
 * before lazy route chunks 404.
 */
@Injectable({ providedIn: 'root' })
export class AppVersionService {
  private readonly destroyRef = inject(DestroyRef);
  private readonly toast = inject(ToastService);
  private readonly clientBuildId = APP_BUILD_ID;
  private checking = false;
  private updateScheduled = false;

  /** Start polling when the shell loads (production only). */
  init(): void {
    if (!environment.production) return;

    merge(
      fromEvent(document, 'visibilitychange').pipe(filter(() => document.visibilityState === 'visible')),
      fromEvent(window, 'focus'),
      interval(5 * 60_000)
    )
      .pipe(
        switchMap(() => this.fetchDeployedVersion()),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((remote) => {
        if (!remote) return;
        if (remote.buildId !== this.clientBuildId) {
          this.scheduleReloadForNewDeploy();
        }
      });
  }

  private async fetchDeployedVersion(): Promise<DeployVersion | null> {
    if (this.checking) return null;
    this.checking = true;
    try {
      const response = await fetch(`/version.json?ts=${Date.now()}`, {
        cache: 'no-store',
        headers: { Accept: 'application/json' }
      });
      if (!response.ok) return null;
      return (await response.json()) as DeployVersion;
    } catch {
      return null;
    } finally {
      this.checking = false;
    }
  }

  private scheduleReloadForNewDeploy(): void {
    if (this.updateScheduled) return;
    this.updateScheduled = true;
    this.toast.showInfo('A new version is available. Refreshing…', 'Update');
    window.setTimeout(() => window.location.reload(), 1500);
  }
}
