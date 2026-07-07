import { ChangeDetectionStrategy, Component } from '@angular/core';
import { VoucherEntryComponent } from '../voucher-entry/voucher-entry.component';

@Component({
  selector: 'app-receipt-voucher',
  imports: [VoucherEntryComponent],
  template: `<app-voucher-entry vType="R" title="Receipt Voucher" />`,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ReceiptVoucherComponent {}
