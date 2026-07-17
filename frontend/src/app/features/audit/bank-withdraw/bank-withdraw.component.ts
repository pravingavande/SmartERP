import { ChangeDetectionStrategy, Component } from '@angular/core';
import { BankVoucherEntryComponent } from '../bank-voucher-entry/bank-voucher-entry.component';

@Component({
  selector: 'app-bank-withdraw',
  imports: [BankVoucherEntryComponent],
  template: `<app-bank-voucher-entry vType="BW" title="Bank Withdraw" />`,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BankWithdrawComponent {}
