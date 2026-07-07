import { ChangeDetectionStrategy, Component } from '@angular/core';
import { VoucherEntryComponent } from '../voucher-entry/voucher-entry.component';

@Component({
  selector: 'app-payment-voucher',
  imports: [VoucherEntryComponent],
  template: `<app-voucher-entry vType="P" title="Payment Voucher" />`,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PaymentVoucherComponent {}
