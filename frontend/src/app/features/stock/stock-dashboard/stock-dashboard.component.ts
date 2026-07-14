import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

interface StockTile {
  label: string;
  description: string;
  icon: string;
  route: string;
  tone: string;
  adminOnly?: boolean;
}

@Component({
  selector: 'app-stock-dashboard',
  imports: [RouterLink],
  templateUrl: './stock-dashboard.component.html',
  styleUrl: './stock-dashboard.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StockDashboardComponent {
  private readonly auth = inject(AuthService);

  private readonly tiles: StockTile[] = [
    {
      label: 'Add Stock',
      description: 'Record inventory stock entries with quantity, rate and amount',
      icon: 'stock',
      route: '/stock/register',
      tone: 'stock'
    },
    {
      label: 'Item Master',
      description: 'Manage items with rates under item groups',
      icon: 'register',
      route: '/stock/item-master',
      tone: 'item',
      adminOnly: true
    },
    {
      label: 'Item Group Master',
      description: 'Organization-wise item groups for inventory',
      icon: 'register',
      route: '/stock/item-group-master',
      tone: 'item-group',
      adminOnly: true
    }
  ];

  readonly visibleTiles = computed(() => {
    const canAccessAdminStock = this.auth.isSansthaAdmin();
    return this.tiles.filter((tile) => !tile.adminOnly || canAccessAdminStock);
  });
}
