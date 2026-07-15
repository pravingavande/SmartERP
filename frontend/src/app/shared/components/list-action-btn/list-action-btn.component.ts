import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

export type ListActionType = 'view' | 'edit' | 'delete' | 'deactivate';

@Component({
  selector: 'app-list-action-btn',
  templateUrl: './list-action-btn.component.html',
  styleUrl: './list-action-btn.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ListActionBtnComponent {
  readonly action = input.required<ListActionType>();
  readonly label = input<string>();
  readonly disabled = input(false);

  readonly clicked = output<MouseEvent>();

  readonly tooltip = computed(() => {
    const custom = this.label()?.trim();
    if (custom) return custom;
    switch (this.action()) {
      case 'view':
        return 'View';
      case 'edit':
        return 'Edit';
      case 'delete':
        return 'Delete';
      case 'deactivate':
        return 'Deactivate';
    }
  });

  onClick(event: MouseEvent): void {
    if (this.disabled()) return;
    this.clicked.emit(event);
  }
}
