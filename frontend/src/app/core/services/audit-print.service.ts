import { Injectable } from '@angular/core';
import { Voucher } from '../models/audit.model';
import { Donation } from '../models/donation.model';

@Injectable({ providedIn: 'root' })
export class AuditPrintService {
  printVoucher(voucher: Voucher): void {
    const title = voucher.vType === 'R' || voucher.vType === 'RV' ? 'Receipt Voucher' : 'Payment Voucher';
    const detailRows = voucher.details
      .map(
        (d) => `
        <tr>
          <td>${d.srNo}</td>
          <td>${this.esc(d.ledgerHead ?? '')}</td>
          <td>${this.esc(d.ledgerHeadNarration ?? '')}</td>
          <td class="num">${this.formatAmount(d.amount)}</td>
        </tr>`
      )
      .join('');

    const html = this.wrapReceipt(
      title,
      `
      <div class="meta-grid">
        <div><span class="lbl">Voucher No</span><span class="val">${voucher.vCode}</span></div>
        <div><span class="lbl">Date</span><span class="val">${this.formatDate(voucher.vDate)}</span></div>
        <div><span class="lbl">Org / School</span><span class="val">${this.esc(voucher.organizationName ?? '')}</span></div>
        <div><span class="lbl">Account Register</span><span class="val">${this.esc(voucher.accountRegister ?? '')}</span></div>
        <div><span class="lbl">FY</span><span class="val">${this.esc(voucher.fyName ?? '')}</span></div>
        <div><span class="lbl">Party</span><span class="val">${this.esc(voucher.partyName ?? '—')}</span></div>
        <div><span class="lbl">Payment Type</span><span class="val">${this.esc(voucher.paymentType ?? '')}</span></div>
        ${voucher.transactionNo ? `<div><span class="lbl">Transaction No</span><span class="val">${this.esc(voucher.transactionNo)}</span></div>` : ''}
      </div>
      <table>
        <thead><tr><th>Sr</th><th>Ledger Head</th><th>Narration</th><th>Amount</th></tr></thead>
        <tbody>${detailRows}</tbody>
        <tfoot><tr><td colspan="3" class="total-lbl">Total</td><td class="num total">${this.formatAmount(voucher.totalAmount)}</td></tr></tfoot>
      </table>
      ${voucher.remark ? `<p class="remark"><strong>Remark:</strong> ${this.esc(voucher.remark)}</p>` : ''}
    `
    );
    this.openPrintWindow(html, title);
  }

  printDonation(donation: Donation): void {
    const html = this.wrapReceipt(
      'Donation Receipt',
      `
      <div class="meta-grid">
        <div><span class="lbl">Receipt No (FY)</span><span class="val">${donation.receiptNo ?? '—'}</span></div>
        <div><span class="lbl">Org Receipt No</span><span class="val">${donation.orgIDReceiptNo ?? '—'}</span></div>
        <div><span class="lbl">Date</span><span class="val">${this.formatDate(donation.receiptDate)}</span></div>
        <div><span class="lbl">Org / School</span><span class="val">${this.esc(donation.organizationName ?? '')}</span></div>
        <div><span class="lbl">FY</span><span class="val">${this.esc(donation.fyName ?? '')}</span></div>
        <div><span class="lbl">Donation Head</span><span class="val">${this.esc(donation.drHeadName ?? '')}</span></div>
        <div><span class="lbl">Donor Name</span><span class="val">${this.esc(donation.donorName ?? '')}</span></div>
        <div><span class="lbl">Mobile</span><span class="val">${this.esc(donation.mobileNo ?? '—')}</span></div>
        <div><span class="lbl">PAN</span><span class="val">${this.esc(donation.panNo ?? '—')}</span></div>
        <div><span class="lbl">Aadhar</span><span class="val">${this.esc(donation.aadharNo ?? '—')}</span></div>
        <div><span class="lbl">Payment Type</span><span class="val">${this.esc(donation.paymentType ?? '')}</span></div>
        <div class="full"><span class="lbl">Address</span><span class="val">${this.esc(donation.address ?? '—')}</span></div>
      </div>
      <p class="amount-box">Amount Received: <strong>${this.formatAmount(donation.amount ?? 0)}</strong></p>
      ${donation.remark ? `<p class="remark"><strong>Remark:</strong> ${this.esc(donation.remark)}</p>` : ''}
    `
    );
    this.openPrintWindow(html, 'Donation Receipt');
  }

  private wrapReceipt(title: string, body: string): string {
    return `
      <div class="receipt">
        <header>
          <h1>SmartERP</h1>
          <h2>${this.esc(title)}</h2>
        </header>
        ${body}
        <footer>
          <p>Computer generated receipt — SmartERP</p>
          <p>Printed: ${new Date().toLocaleString('en-IN')}</p>
        </footer>
      </div>
    `;
  }

  private openPrintWindow(bodyHtml: string, title: string): void {
    const win = window.open('', '_blank', 'width=800,height=900');
    if (!win) return;

    win.document.write(`<!DOCTYPE html>
<html><head>
  <meta charset="utf-8">
  <title>${this.esc(title)}</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; margin: 24px; color: #1a2f4d; }
    .receipt { max-width: 720px; margin: 0 auto; }
    header { text-align: center; border-bottom: 2px solid #1a3f6e; padding-bottom: 12px; margin-bottom: 16px; }
    header h1 { margin: 0; color: #e87722; font-size: 1.4rem; }
    header h2 { margin: 6px 0 0; font-size: 1.1rem; }
    .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 16px; margin-bottom: 16px; font-size: 0.9rem; }
    .meta-grid .full { grid-column: 1 / -1; }
    .lbl { display: block; font-size: 0.75rem; color: #5f7088; font-weight: 600; }
    .val { display: block; font-weight: 600; }
    table { width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 0.88rem; }
    th, td { border: 1px solid #c5d0de; padding: 6px 8px; text-align: left; }
    th { background: #e8eef6; }
    .num { text-align: right; }
    .total-lbl { text-align: right; font-weight: 700; }
    .total { font-weight: 700; font-size: 1rem; }
    .amount-box { font-size: 1.1rem; text-align: center; padding: 12px; background: #fff8f2; border: 1px solid #e87722; border-radius: 8px; }
    .remark { margin-top: 12px; font-size: 0.88rem; }
    footer { margin-top: 24px; padding-top: 12px; border-top: 1px dashed #c5d0de; font-size: 0.75rem; color: #5f7088; text-align: center; }
    @media print { body { margin: 12px; } }
  </style>
</head><body>${bodyHtml}</body></html>`);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 300);
  }

  private formatDate(value?: string | null): string {
    if (!value) return '—';
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString('en-IN');
  }

  private formatAmount(value: number): string {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(value ?? 0);
  }

  private esc(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}
