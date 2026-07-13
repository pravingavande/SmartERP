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
    },
    {
      label: 'Leave Type Master',
      description: 'Define leave types for employee leave applications',
      icon: 'attendance',
      route: '/audit/leave-type-master',
      tone: 'leave'
    },
    {
      label: 'Class Master',
      description: 'Manage classes for academic schedule',
      icon: 'register',
      route: '/audit/class-master',
      tone: 'class'
    },
    {
      label: 'Event Types Master',
      description: 'Sanstha-wise event type definitions',
      icon: 'event-calendar',
      route: '/audit/event-types-master',
      tone: 'schedule'
    },
    {
      label: 'Subject Master',
      description: 'Manage subjects for academic schedule',
      icon: 'register',
      route: '/audit/subject-master',
      tone: 'subject'
    },
    {
      label: 'Academic Schedule',
      description: 'Plan class-wise academic topics and attachments',
      icon: 'register',
      route: '/audit/academic-schedule',
      tone: 'schedule'
    },
    {
      label: 'Item Group Master',
      description: 'Organization-wise item groups for inventory',
      icon: 'register',
      route: '/audit/item-group-master',
      tone: 'item-group'
    },
    {
      label: 'Item Master',
      description: 'Items with rates under item groups',
      icon: 'register',
      route: '/audit/item-master',
      tone: 'item'
    },
    {
      label: 'Stock Register',
      description: 'Stock entries with auto-calculated amount',
      icon: 'register',
      route: '/audit/stock-register',
      tone: 'stock'
    }
  ];
}
