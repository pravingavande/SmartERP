import { NgClass } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SchoolOrgSelectOption } from '../../../core/utils/org-access.util';

/**
 * Shared Org / School dropdown — same label/options pattern as Receipt Voucher.
 * Parent supplies already-filtered orgs and handles side effects on change.
 */
@Component({
  selector: 'app-org-school-select',
  imports: [FormsModule, NgClass],
  templateUrl: './org-school-select.component.html',
  styleUrl: './org-school-select.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class OrgSchoolSelectComponent {
  readonly orgs = input.required<SchoolOrgSelectOption[]>();
  readonly value = input<number | null>(null);
  readonly label = input('Org / School');
  readonly nullLabel = input('-- Select School --');
  readonly name = input('orgSchool');
  readonly disabled = input(false);
  readonly required = input(false);
  readonly invalid = input(false);
  readonly fieldClass = input('');
  readonly error = input<string | null>(null);

  readonly valueChange = output<number | null>();

  onChange(raw: number | string | null): void {
    if (raw === null || raw === '' || raw === undefined) {
      this.valueChange.emit(null);
      return;
    }
    this.valueChange.emit(+raw);
  }
}
