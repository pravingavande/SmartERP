import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-coming-soon',
  template: `
    <div class="coming-soon">
      <div class="icon-wrap" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M12 8v4l3 3" />
          <circle cx="12" cy="12" r="9" />
        </svg>
      </div>
      <h1>{{ title }}</h1>
      <p>This module is under development and will be available soon.</p>
    </div>
  `,
  styles: `
    .coming-soon {
      background: #fff;
      border: 1px solid var(--epr-border);
      border-radius: var(--epr-radius);
      padding: 3rem 2rem;
      text-align: center;
      box-shadow: var(--epr-shadow);
    }
    .icon-wrap {
      width: 56px;
      height: 56px;
      margin: 0 auto 1rem;
      color: var(--epr-navy);
      opacity: 0.85;
    }
    svg { width: 100%; height: 100%; }
    h1 { margin: 0 0 0.5rem; color: var(--epr-navy); font-size: 1.35rem; }
    p { margin: 0; color: var(--epr-muted); }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ComingSoonComponent {
  private readonly route = inject(ActivatedRoute);
  readonly title = this.route.snapshot.data['title'] as string ?? 'Module';
}
