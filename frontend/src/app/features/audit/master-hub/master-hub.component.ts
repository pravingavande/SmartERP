import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

interface MasterTile {
  label: string;
  description: string;
  icon: string;
  route: string;
  tone: string;
}

@Component({
  selector: 'app-master-hub',
  imports: [RouterLink],
  templateUrl: './master-hub.component.html',
  styleUrl: './master-hub.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MasterHubComponent {
  readonly tiles: MasterTile[] = [
    {
      label: 'Party Master',
      description: 'Manage parties for vouchers and transactions',
      icon: 'party',
      route: '/audit/party-master',
      tone: 'party'
    },
    {
      label: 'Ledger Head Master',
      description: 'Sanstha-wise ledger heads for voucher entries',
      icon: 'register',
      route: '/audit/ledger-head-master',
      tone: 'ledger'
    },
    {
      label: 'Account Register Define',
      description: 'Map account registers to each school',
      icon: 'register',
      route: '/audit/account-register-define',
      tone: 'account'
    },
    {
      label: 'Donation Head Define',
      description: 'Map donation heads to each school',
      icon: 'donation-head',
      route: '/audit/donation-head-define',
      tone: 'donation'
    }
  ];
}
