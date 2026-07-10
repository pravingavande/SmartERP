import { Directive, ElementRef, HostListener, Input, forwardRef, inject } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import {
  filterDecimalTyping,
  filterIntegerTyping,
  normalizeDecimalDigits,
  normalizeIntegerDigits,
  parseDecimalValue
} from '../utils/marathi-numerals';

/**
 * Text input that accepts Marathi (Devanagari) numerals while typing
 * and converts to English digits on blur for database storage.
 *
 * Usage:
 *   <input appMarathiNumber mode="int" [maxLength]="10" [(ngModel)]="form().mobileNo" />
 *   <input appMarathiNumber mode="decimal" [(ngModel)]="form().amount" />
 */
@Directive({
  selector: 'input[appMarathiNumber]',
  standalone: true,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => MarathiNumberInputDirective),
      multi: true
    }
  ]
})
export class MarathiNumberInputDirective implements ControlValueAccessor {
  private readonly el = inject(ElementRef<HTMLInputElement>);

  /** `int` → English digit string; `decimal` → number */
  @Input() mode: 'int' | 'decimal' = 'int';
  @Input() maxLength?: number;

  private onChange: (value: string | number) => void = () => {};
  private onTouched: () => void = () => {};

  constructor() {
    const input = this.el.nativeElement;
    input.type = 'text';
    input.setAttribute('inputmode', 'decimal');
    input.setAttribute('autocomplete', 'off');
  }

  writeValue(value: string | number | null | undefined): void {
    if (value == null || value === '') {
      this.el.nativeElement.value = '';
      return;
    }
    if (this.mode === 'decimal') {
      const n = typeof value === 'number' ? value : parseDecimalValue(String(value));
      this.el.nativeElement.value = n === 0 ? '' : String(n);
      return;
    }
    this.el.nativeElement.value = String(value);
  }

  registerOnChange(fn: (value: string | number) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.el.nativeElement.disabled = isDisabled;
  }

  @HostListener('input')
  onInput(): void {
    const raw = this.el.nativeElement.value;
    const filtered =
      this.mode === 'decimal' ? filterDecimalTyping(raw) : filterIntegerTyping(raw, this.maxLength);
    if (filtered !== raw) {
      this.el.nativeElement.value = filtered;
    }
  }

  @HostListener('blur')
  onBlur(): void {
    const raw = this.el.nativeElement.value;
    if (this.mode === 'decimal') {
      const normalized = normalizeDecimalDigits(raw);
      this.el.nativeElement.value = normalized;
      this.onChange(parseDecimalValue(normalized));
    } else {
      const normalized = normalizeIntegerDigits(raw, this.maxLength);
      this.el.nativeElement.value = normalized;
      this.onChange(normalized);
    }
    this.onTouched();
  }
}
