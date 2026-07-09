import { CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { forkJoin, map, of, switchMap } from 'rxjs';
import { AuditService } from '../../../core/services/audit.service';
import { DonationService } from '../../../core/services/donation.service';
import {
  AuditDashboardRow,
  AuditDashboardSummary,
  AuditLookups,
  FyOption,
  OrgOption
} from '../../../core/models/audit.model';

interface SummaryCard {
  title: string;
  count: number;
  amount: number;
  route: string;
  tone: 'receipt' | 'payment' | 'donation';
  color: string;
  sharePercent: number;
}

interface DonutSegment {
  label: string;
  value: number;
  color: string;
  percent: number;
  dashArray: string;
  dashOffset: number;
}

interface BarMetric {
  label: string;
  count: number;
  amount: number;
  color: string;
  amountPercent: number;
  countPercent: number;
}

@Component({
  selector: 'app-audit-dashboard',
  imports: [RouterLink, DatePipe, CurrencyPipe, DecimalPipe, FormsModule],
  templateUrl: './audit-dashboard.component.html',
  styleUrl: './audit-dashboard.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AuditDashboardComponent {
  private readonly audit = inject(AuditService);
  private readonly donation = inject(DonationService);
  private readonly destroyRef = inject(DestroyRef);

  readonly loading = signal(true);
  readonly summaryLoading = signal(false);
  readonly rows = signal<AuditDashboardRow[]>([]);
  readonly summary = signal<AuditDashboardSummary | null>(null);
  readonly fyList = signal<FyOption[]>([]);
  readonly orgs = signal<OrgOption[]>([]);
  readonly selectedFyID = signal<number | null>(null);

  readonly donutRadius = 78;
  readonly donutCircumference = 2 * Math.PI * 78;

  readonly visuals = computed(() => {
    const s = this.summary();
    if (!s) return null;
    return this.buildVisuals(s);
  });

  constructor() {
    forkJoin({
      lookups: this.audit.getLookups(),
      dashboard: this.audit.getDashboard()
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(({ lookups, dashboard }) => {
        const fyOptions = lookups?.fyList ?? [];
        const orgOptions = lookups?.orgs ?? [];
        this.fyList.set(fyOptions);
        this.orgs.set(orgOptions);
        const fyId = dashboard.summary.fyID ?? fyOptions[0]?.fyID ?? null;
        this.selectedFyID.set(fyId);
        this.rows.set(dashboard.rows);

        if (dashboard.summary.fyID != null) {
          this.summary.set(dashboard.summary);
          this.loading.set(false);
        } else {
          this.loadClientSummary(fyId, fyOptions, orgOptions, () => this.loading.set(false));
        }
      });
  }

  onFyChange(fyId: number | null): void {
    this.selectedFyID.set(fyId);
    this.summaryLoading.set(true);
    this.audit
      .getDashboard(fyId)
      .pipe(
        switchMap((dashboard) => {
          if (dashboard.summary.fyID != null) {
            return of(dashboard.summary);
          }
          return this.buildClientSummary(fyId, this.fyList(), this.orgs());
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((summary) => {
        this.summary.set(summary);
        this.summaryLoading.set(false);
      });
  }

  private loadClientSummary(
    fyId: number | null,
    fyList: FyOption[],
    orgs: OrgOption[],
    onDone?: () => void
  ): void {
    this.summaryLoading.set(true);
    this.buildClientSummary(fyId, fyList, orgs)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((summary) => {
        this.summary.set(summary);
        this.summaryLoading.set(false);
        onDone?.();
      });
  }

  private buildClientSummary(fyId: number | null, fyList: FyOption[], orgs: OrgOption[]) {
    if (!fyId || !orgs.length) {
      return of(this.emptySummary(fyId, fyList));
    }

    const receiptCalls = orgs.map((o) => this.audit.getVouchers(o.orgID, 'R', fyId));
    const paymentCalls = orgs.map((o) => this.audit.getVouchers(o.orgID, 'P', fyId));

    return forkJoin({
      receipts: forkJoin(receiptCalls),
      payments: forkJoin(paymentCalls),
      donations: this.donation.getList(null, fyId)
    }).pipe(
      map(({ receipts, payments, donations }) => {
        const receiptItems = receipts.flat();
        const paymentItems = payments.flat();
        return {
          fyID: fyId,
          fyName: fyList.find((fy) => fy.fyID === fyId)?.fyName ?? '',
          receiptVoucherCount: receiptItems.length,
          receiptVoucherAmount: receiptItems.reduce((sum, v) => sum + (v.totalAmount ?? 0), 0),
          paymentVoucherCount: paymentItems.length,
          paymentVoucherAmount: paymentItems.reduce((sum, v) => sum + (v.totalAmount ?? 0), 0),
          donationCount: donations.length,
          donationAmount: donations.reduce((sum, d) => sum + (d.amount ?? 0), 0)
        } satisfies AuditDashboardSummary;
      })
    );
  }

  private emptySummary(fyId: number | null, fyList: FyOption[]): AuditDashboardSummary {
    return {
      fyID: fyId,
      fyName: fyList.find((fy) => fy.fyID === fyId)?.fyName ?? '',
      receiptVoucherCount: 0,
      receiptVoucherAmount: 0,
      paymentVoucherCount: 0,
      paymentVoucherAmount: 0,
      donationCount: 0,
      donationAmount: 0
    };
  }

  summaryCards(summary: AuditDashboardSummary): SummaryCard[] {
    const totalAmount =
      summary.receiptVoucherAmount + summary.paymentVoucherAmount + summary.donationAmount;
    const share = (amount: number) => (totalAmount > 0 ? Math.round((amount / totalAmount) * 100) : 0);

    return [
      {
        title: 'Receipt Vouchers',
        count: summary.receiptVoucherCount,
        amount: summary.receiptVoucherAmount,
        route: '/audit/receipt-voucher',
        tone: 'receipt',
        color: '#2e7d32',
        sharePercent: share(summary.receiptVoucherAmount)
      },
      {
        title: 'Payment Vouchers',
        count: summary.paymentVoucherCount,
        amount: summary.paymentVoucherAmount,
        route: '/audit/payment-voucher',
        tone: 'payment',
        color: '#e65100',
        sharePercent: share(summary.paymentVoucherAmount)
      },
      {
        title: 'Donations',
        count: summary.donationCount,
        amount: summary.donationAmount,
        route: '/audit/donation',
        tone: 'donation',
        color: '#1565c0',
        sharePercent: share(summary.donationAmount)
      }
    ];
  }

  formatCompact(amount: number): string {
    if (amount >= 10000000) return `${(amount / 10000000).toFixed(1)}Cr`;
    if (amount >= 100000) return `${(amount / 100000).toFixed(1)}L`;
    if (amount >= 1000) return `${(amount / 1000).toFixed(1)}K`;
    return amount.toFixed(0);
  }

  private buildVisuals(summary: AuditDashboardSummary) {
    const inflow = summary.receiptVoucherAmount + summary.donationAmount;
    const outflow = summary.paymentVoucherAmount;
    const net = inflow - outflow;
    const totalAmount = inflow + outflow;
    const totalCount =
      summary.receiptVoucherCount + summary.paymentVoucherCount + summary.donationCount;

    const segments: { label: string; value: number; color: string }[] = [
      { label: 'Receipts', value: summary.receiptVoucherAmount, color: '#2e7d32' },
      { label: 'Payments', value: summary.paymentVoucherAmount, color: '#e65100' },
      { label: 'Donations', value: summary.donationAmount, color: '#1565c0' }
    ];

    let offset = 0;
    const donut: DonutSegment[] = segments.map((seg) => {
      const percent = totalAmount > 0 ? (seg.value / totalAmount) * 100 : 0;
      const length = totalAmount > 0 ? (seg.value / totalAmount) * this.donutCircumference : 0;
      const item: DonutSegment = {
        label: seg.label,
        value: seg.value,
        color: seg.color,
        percent,
        dashArray: `${length} ${this.donutCircumference}`,
        dashOffset: -offset
      };
      offset += length;
      return item;
    });

    const maxAmount = Math.max(
      summary.receiptVoucherAmount,
      summary.paymentVoucherAmount,
      summary.donationAmount,
      1
    );
    const maxCount = Math.max(
      summary.receiptVoucherCount,
      summary.paymentVoucherCount,
      summary.donationCount,
      1
    );

    const bars: BarMetric[] = [
      {
        label: 'Receipt Vouchers',
        count: summary.receiptVoucherCount,
        amount: summary.receiptVoucherAmount,
        color: '#2e7d32',
        amountPercent: (summary.receiptVoucherAmount / maxAmount) * 100,
        countPercent: (summary.receiptVoucherCount / maxCount) * 100
      },
      {
        label: 'Payment Vouchers',
        count: summary.paymentVoucherCount,
        amount: summary.paymentVoucherAmount,
        color: '#e65100',
        amountPercent: (summary.paymentVoucherAmount / maxAmount) * 100,
        countPercent: (summary.paymentVoucherCount / maxCount) * 100
      },
      {
        label: 'Donations',
        count: summary.donationCount,
        amount: summary.donationAmount,
        color: '#1565c0',
        amountPercent: (summary.donationAmount / maxAmount) * 100,
        countPercent: (summary.donationCount / maxCount) * 100
      }
    ];

    return {
      totalAmount,
      totalCount,
      inflow,
      outflow,
      net,
      donut,
      bars,
      hasData: totalAmount > 0 || totalCount > 0
    };
  }
}
