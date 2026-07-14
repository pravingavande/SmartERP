import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-io-dashboard',
  imports: [RouterLink],
  templateUrl: './io-dashboard.component.html',
  styleUrl: './io-dashboard.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class IoDashboardComponent {
  readonly tiles = [
    {
      label: 'Inward Register',
      description: 'Record incoming letters and official correspondence',
      icon: 'register',
      route: '/io/inward',
      tone: 'inward'
    },
    {
      label: 'Outward Register',
      description: 'Record outgoing letters and dispatch details',
      icon: 'register',
      route: '/io/outward',
      tone: 'outward'
    }
  ];
}
