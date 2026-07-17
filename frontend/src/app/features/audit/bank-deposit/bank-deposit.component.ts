import { ChangeDetectionStrategy, Component } from '@angular/core';
import { BankVoucherEntryComponent } from '../bank-voucher-entry/bank-voucher-entry.component';

@Component({
  selector: 'app-bank-deposit',
  imports: [BankVoucherEntryComponent],
  template: `<app-bank-voucher-entry vType="BD" title="Bank Deposit" />`,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BankDepositComponent {}
