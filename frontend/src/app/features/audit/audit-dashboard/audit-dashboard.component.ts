import { CurrencyPipe, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { AuditService } from '../../../core/services/audit.service';
import { AuditDashboardRow } from '../../../core/models/audit.model';

@Component({
  selector: 'app-audit-dashboard',
  imports: [RouterLink, DatePipe, CurrencyPipe],
  templateUrl: './audit-dashboard.component.html',
  styleUrl: './audit-dashboard.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AuditDashboardComponent {
  private readonly audit = inject(AuditService);
  private readonly destroyRef = inject(DestroyRef);

  readonly loading = signal(true);
  readonly rows = signal<AuditDashboardRow[]>([]);

  constructor() {
    this.audit
      .getDashboard()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((data) => {
        this.rows.set(data);
        this.loading.set(false);
      });
  }
}
