import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

interface MasterTile {
  label: string;
  description: string;
  icon: string;
  route: string;
  tone: string;
  adminOnly?: boolean;
}

@Component({
  selector: 'app-master-hub',
  imports: [RouterLink],
  templateUrl: './master-hub.component.html',
  styleUrl: './master-hub.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MasterHubComponent {
  private readonly auth = inject(AuthService);

  private readonly tiles: MasterTile[] = [
    {
      label: 'Organization Master',
      description: 'Manage sansthas, schools and organization documents',
      icon: 'register',
      route: '/schools',
      tone: 'account',
      adminOnly: true
    },
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
      tone: 'ledger',
      adminOnly: true
    },
    {
      label: 'Account Register Define',
      description: 'Map account registers to each school',
      icon: 'register',
      route: '/audit/account-register-define',
      tone: 'account',
      adminOnly: true
    },
    {
      label: 'Donation Head Define',
      description: 'Map donation heads to each school',
      icon: 'donation-head',
      route: '/audit/donation-head-define',
      tone: 'donation',
      adminOnly: true
    },
    {
      label: 'Leave Type Master',
      description: 'Define leave types for employee leave applications',
      icon: 'attendance',
      route: '/audit/leave-type-master',
      tone: 'leave',
      adminOnly: true
    },
    {
      label: 'Class Master',
      description: 'Manage classes for academic schedule',
      icon: 'register',
      route: '/audit/class-master',
      tone: 'class',
      adminOnly: true
    },
    {
      label: 'Event Types Master',
      description: 'Sanstha-wise event type definitions',
      icon: 'event-calendar',
      route: '/audit/event-types-master',
      tone: 'schedule',
      adminOnly: true
    },
    {
      label: 'Subject Master',
      description: 'Manage subjects for academic schedule',
      icon: 'register',
      route: '/audit/subject-master',
      tone: 'subject',
      adminOnly: true
    }
  ];

  readonly visibleTiles = computed(() => {
    const canAccessAdminMasters = this.auth.isSansthaAdmin();
    return this.tiles.filter((tile) => !tile.adminOnly || canAccessAdminMasters);
  });
}
