import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { UpperCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DonationService } from '../../../core/services/donation.service';
import { DonationReportService } from '../../../core/services/donation-report.service';
import { AuditService } from '../../../core/services/audit.service';
import { MasterService } from '../../../core/services/master.service';
import { ReportPrintService } from '../../../core/services/report-print.service';
import { ToastService } from '../../../core/services/toast.service';
import { HUB_REPORTS, HubReportDefinition } from '../../../core/models/hub-report.model';
import { HubReportFilter } from '../../../core/models/hub-report-filter.model';
import { DonationLookups } from '../../../core/models/donation.model';
import { LedgerHeadOption, OrgOption } from '../../../core/models/audit.model';
import { ItemGroupMasterItem } from '../../../core/models/master.model';

@Component({
  selector: 'app-reports-hub',
  imports: [FormsModule, UpperCasePipe],
  templateUrl: './reports-hub.component.html',
  styleUrl: './reports-hub.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ReportsHubComponent {
  private readonly donation = inject(DonationService);
  private readonly donationReport = inject(DonationReportService);
  private readonly audit = inject(AuditService);
  private readonly master = inject(MasterService);
  private readonly reportPrint = inject(ReportPrintService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  readonly reports = HUB_REPORTS;
  readonly donationReports = computed(() => this.reports.filter((r) => r.category === 'donation'));
  readonly accountReports = computed(() => this.reports.filter((r) => r.category === 'accounts'));
  readonly auditReports = computed(() => this.reports.filter((r) => r.category === 'audit'));
  readonly schoolReports = computed(() => this.reports.filter((r) => r.category === 'school'));
  readonly ioReports = computed(() => this.reports.filter((r) => r.category === 'io'));
  readonly stockReports = computed(() => this.reports.filter((r) => r.category === 'stock'));

  readonly reportCategories = computed(() => [
    { id: 'donation' as const, label: 'Donation', labelMr: 'देणगी', reports: this.donationReports() },
    { id: 'accounts' as const, label: 'Accounts', labelMr: 'लेखा', reports: this.accountReports() },
    { id: 'audit' as const, label: 'Audit', labelMr: 'लेखापरीक्षण', reports: this.auditReports() },
    { id: 'school' as const, label: 'School / College', labelMr: 'शाळा / कॉलेज', reports: this.schoolReports() },
    { id: 'io' as const, label: 'Inward / Outward', labelMr: 'आवक / जावक', reports: this.ioReports() },
    { id: 'stock' as const, label: 'Stock', labelMr: 'स्टॉक', reports: this.stockReports() }
  ]);

  readonly totalReportCount = computed(() => this.reports.length);
  readonly lookupsLoading = signal(true);
  readonly generating = signal(false);
  readonly lookups = signal<DonationLookups | null>(null);
  readonly sansthaOrgs = signal<OrgOption[]>([]);
  readonly ledgerHeads = signal<LedgerHeadOption[]>([]);
  readonly itemGroups = signal<ItemGroupMasterItem[]>([]);
  readonly activeReport = signal<HubReportDefinition>(HUB_REPORTS[0]);
  readonly filter = signal<HubReportFilter>(this.emptyFilter());

  constructor() {
    this.donation.getLookups().pipe(takeUntilDestroyed(this.destroyRef)).subscribe((data) => {
      this.lookupsLoading.set(false);
      this.lookups.set(data);
    });

    this.audit.getSansthaOrgs().pipe(takeUntilDestroyed(this.destroyRef)).subscribe((orgs) => {
      this.sansthaOrgs.set(orgs);
    });
  }

  selectReport(report: HubReportDefinition): void {
    this.activeReport.set(report);
    this.filter.update((f) => ({
      ...f,
      ledgerHeadId: null,
      allLedgerHeads: false,
      sansthaId: null,
      itemGroupId: null
    }));
    this.loadOrgScopedLookups(report, this.filter().orgId);
  }

  updateFilter<K extends keyof HubReportFilter>(key: K, value: HubReportFilter[K]): void {
    this.filter.update((f) => {
      const next = { ...f, [key]: value };
      if (key === 'orgId' && value) {
        next.sansthaId = null;
        next.ledgerHeadId = null;
        next.itemGroupId = null;
      }
      if (key === 'sansthaId' && value) next.orgId = null;
      if (key === 'allLedgerHeads' && value) next.ledgerHeadId = null;
      if (key === 'ledgerHeadId' && value) next.allLedgerHeads = false;
      return next;
    });

    if (key === 'orgId') {
      this.loadOrgScopedLookups(this.activeReport(), value as number | null);
    }
  }

  private loadOrgScopedLookups(report: HubReportDefinition, orgId: number | null): void {
    if (!orgId) {
      this.ledgerHeads.set([]);
      this.itemGroups.set([]);
      return;
    }

    if (report.filterMode === 'ledger-head') {
      this.audit.getLookups(orgId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe((data) => {
        this.ledgerHeads.set(data?.ledgerHeads ?? []);
      });
    }

    if (report.filterMode === 'school-and-item-group') {
      this.master.getItemGroups(orgId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe((groups) => {
        this.itemGroups.set(groups);
      });
    }
  }

  generatePdf(): void {
    const report = this.activeReport();
    const current = this.filter();
    const error = this.validateFilter(report, current);
    if (error) {
      this.toast.showError(error, 'Report');
      return;
    }

    this.generating.set(true);
    this.donationReport.downloadHubPdf(report.endpoint, current, report).pipe(takeUntilDestroyed(this.destroyRef)).subscribe((blob) => {
      this.generating.set(false);
      if (!blob || blob.size === 0) {
        this.toast.showError('No records found for selected filters.', 'Report');
        return;
      }
      this.reportPrint.openPdf(blob, report.titleEn);
      this.toast.showSuccess('Report generated.', 'Report');
    });
  }

  private validateFilter(report: HubReportDefinition, current: HubReportFilter): string | null {
    switch (report.filterMode) {
      case 'school-required':
      case 'school-and-item-group':
        if (!current.orgId) return 'School / Organization is required.';
        break;
      case 'sanstha':
        if (!current.sansthaId) return 'Sanstha is required.';
        break;
      case 'school-or-sanstha':
        if (!current.orgId && !current.sansthaId) return 'School or Sanstha is required.';
        if (current.orgId && current.sansthaId) return 'Specify either School or Sanstha, not both.';
        break;
      case 'ledger-head':
        if (!current.orgId) return 'School / Organization is required.';
        if (!current.allLedgerHeads && !current.ledgerHeadId) return 'Ledger Head is required when not selecting all ledger heads.';
        break;
      case 'date-range':
        if (!current.fromDate || !current.toDate) return 'From Date and To Date are required.';
        break;
      default:
        if (report.requireSchool && !current.orgId) return 'School / Organization is required.';
        break;
    }
    return null;
  }

  private emptyFilter(): HubReportFilter {
    const today = new Date();
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    return {
      orgId: null,
      sansthaId: null,
      drHeadId: null,
      paymentTypeId: null,
      minAmount: null,
      ledgerHeadId: null,
      allLedgerHeads: false,
      itemGroupId: null,
      fromDate: monthStart.toISOString().slice(0, 10),
      toDate: today.toISOString().slice(0, 10)
    };
  }
}
