import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  input,
  output,
  signal
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Subject, of, switchMap, debounceTime, distinctUntilChanged } from 'rxjs';
import { AuditService } from '../../../core/services/audit.service';

@Component({
  selector: 'app-ledger-narration-input',
  imports: [FormsModule],
  templateUrl: './ledger-narration-input.component.html',
  styleUrl: './ledger-narration-input.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LedgerNarrationInputComponent {
  readonly orgId = input<number | null>(null);
  readonly ledgerHeadId = input<number | null>(null);
  readonly value = input('');
  readonly disabled = input(false);
  readonly placeholder = input('Type or search narration');

  readonly valueChange = output<string>();

  private readonly audit = inject(AuditService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly search$ = new Subject<{ orgId: number; ledgerHeadId: number; search: string }>();

  readonly suggestions = signal<string[]>([]);
  readonly showSuggestions = signal(false);
  readonly loading = signal(false);

  constructor() {
    this.search$
      .pipe(
        debounceTime(250),
        distinctUntilChanged(
          (a, b) => a.orgId === b.orgId && a.ledgerHeadId === b.ledgerHeadId && a.search === b.search
        ),
        switchMap(({ orgId, ledgerHeadId, search }) => {
          this.loading.set(true);
          return this.audit.getLedgerNarrations(orgId, ledgerHeadId, search);
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((list) => {
        this.loading.set(false);
        this.suggestions.set(list);
        this.showSuggestions.set(list.length > 0);
      });

    this.destroyRef.onDestroy(() => this.search$.complete());
  }

  onInput(value: string): void {
    this.valueChange.emit(value);
    this.queueSearch(value);
  }

  onFocus(): void {
    this.queueSearch(this.value());
  }

  onBlur(): void {
    window.setTimeout(() => this.showSuggestions.set(false), 150);
  }

  pickSuggestion(item: string): void {
    this.valueChange.emit(item);
    this.showSuggestions.set(false);
  }

  private queueSearch(search: string): void {
    const orgId = this.orgId();
    const ledgerHeadId = this.ledgerHeadId();
    if (!orgId || !ledgerHeadId) {
      this.suggestions.set([]);
      this.showSuggestions.set(false);
      return;
    }
    this.search$.next({ orgId, ledgerHeadId, search: search ?? '' });
  }
}
