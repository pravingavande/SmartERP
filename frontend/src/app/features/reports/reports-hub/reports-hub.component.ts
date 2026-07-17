import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { DonationService } from '../../../core/services/donation.service';
import { DonationReportService } from '../../../core/services/donation-report.service';
import { ReportPrintService } from '../../../core/services/report-print.service';
import { ToastService } from '../../../core/services/toast.service';
import { HUB_REPORTS, HubReportDefinition } from '../../../core/models/hub-report.model';
import { DonationLookups } from '../../../core/models/donation.model';
import { DonationReportFilter } from '../../../core/models/donation-report.model';

@Component({
  selector: 'app-reports-hub',
  imports: [FormsModule],
  templateUrl: './reports-hub.component.html',
  styleUrl: './reports-hub.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ReportsHubComponent {
  private readonly donation = inject(DonationService);
  private readonly donationReport = inject(DonationReportService);
  private readonly reportPrint = inject(ReportPrintService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  readonly reports = HUB_REPORTS;
  readonly donationReports = computed(() => this.reports.filter((r) => r.category === 'donation'));
  readonly accountReports = computed(() => this.reports.filter((r) => r.category === 'accounts'));
  readonly lookupsLoading = signal(true);
  readonly generating = signal(false);
  readonly lookups = signal<DonationLookups | null>(null);
  readonly activeReport = signal<HubReportDefinition>(HUB_REPORTS[0]);
  readonly filter = signal<DonationReportFilter>(this.emptyFilter());

  constructor() {
    this.donation.getLookups().pipe(takeUntilDestroyed(this.destroyRef)).subscribe((data) => {
      this.lookupsLoading.set(false);
      this.lookups.set(data);
    });
  }

  selectReport(report: HubReportDefinition): void {
    this.activeReport.set(report);
  }

  updateFilter<K extends keyof DonationReportFilter>(key: K, value: DonationReportFilter[K]): void {
    this.filter.update((f) => ({ ...f, [key]: value }));
  }

  generatePdf(): void {
    const report = this.activeReport();
    const current = this.filter();
    if (report.requireSchool && !current.orgId) {
      this.toast.showError('School / Organization is required.', 'Report');
      return;
    }
    if (!current.fromDate || !current.toDate) {
      this.toast.showError('From Date and To Date are required.', 'Report');
      return;
    }

    this.generating.set(true);
    this.donationReport.downloadPdf(report.endpoint, current).pipe(takeUntilDestroyed(this.destroyRef)).subscribe((blob) => {
      this.generating.set(false);
      if (!blob || blob.size === 0) {
        this.toast.showError('No records found for selected filters.', 'Report');
        return;
      }
      this.reportPrint.openPdf(blob, report.titleEn);
      this.toast.showSuccess('Report generated.', 'Report');
    });
  }

  private emptyFilter(): DonationReportFilter {
    const today = new Date();
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    return {
      orgId: null,
      drHeadId: null,
      paymentTypeId: null,
      minAmount: null,
      fromDate: monthStart.toISOString().slice(0, 10),
      toDate: today.toISOString().slice(0, 10)
    };
  }
}
