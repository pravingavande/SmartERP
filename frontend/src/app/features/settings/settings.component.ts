import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { LanguageService, SoftwareLanguageCode } from '../../core/services/language.service';
import { SettingsService } from '../../core/services/settings.service';
import { ToastService } from '../../core/services/toast.service';
import { MarathiNumberInputDirective } from '../../core/directives/marathi-number-input.directive';
import { coerceEnglishIntegerString } from '../../core/utils/marathi-numerals';

@Component({
  selector: 'app-settings',
  imports: [FormsModule, MarathiNumberInputDirective],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SettingsComponent {
  private readonly languageService = inject(LanguageService);
  private readonly settingsService = inject(SettingsService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  readonly loading = signal(true);
  readonly savingLanguage = signal(false);
  readonly savingAuditDays = signal(false);
  readonly selected = signal<SoftwareLanguageCode>('E');
  readonly newEntryDays = signal('0');
  readonly editEntryDays = signal('0');

  constructor() {
    const underOrgID = this.auth.currentUser()?.sansthaId ?? 0;
    if (!underOrgID) {
      this.loading.set(false);
      return;
    }

    forkJoin({
      language: this.languageService.getLanguage(underOrgID),
      auditDays: this.settingsService.getAuditEntryDays(underOrgID)
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(({ language, auditDays }) => {
        this.selected.set(language);
        this.newEntryDays.set(String(auditDays.newEntryNoOfPreviousDayAllowed));
        this.editEntryDays.set(String(auditDays.editEntryNoOfPreviousDayAllowed));
        this.loading.set(false);
      });
  }

  onSelect(code: SoftwareLanguageCode): void {
    this.selected.set(code);
  }

  saveLanguage(): void {
    const underOrgID = this.auth.currentUser()?.sansthaId ?? 0;
    if (!underOrgID) {
      this.toast.showError('Organization not found for language setting.');
      return;
    }

    this.savingLanguage.set(true);
    this.languageService
      .saveLanguage(underOrgID, this.selected())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((r) => {
        this.savingLanguage.set(false);
        if (r.ok) this.toast.showSuccess(r.message || 'Language setting saved.');
        else this.toast.showError(r.message || 'Unable to save language setting.');
      });
  }

  saveAuditDays(): void {
    const underOrgID = this.auth.currentUser()?.sansthaId ?? 0;
    if (!underOrgID) {
      this.toast.showError('Organization not found for audit settings.');
      return;
    }

    const newDays = this.parseDayCount(this.newEntryDays());
    const editDays = this.parseDayCount(this.editEntryDays());
    if (newDays === null || editDays === null) {
      this.toast.showError('Please enter valid non-negative day counts.');
      return;
    }

    this.savingAuditDays.set(true);
    this.settingsService
      .saveAuditEntryDays(underOrgID, newDays, editDays)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((r) => {
        this.savingAuditDays.set(false);
        if (!r.ok) {
          this.toast.showError(r.message || 'Unable to save audit entry day settings.');
          return;
        }
        if (r.data) {
          this.newEntryDays.set(String(r.data.newEntryNoOfPreviousDayAllowed));
          this.editEntryDays.set(String(r.data.editEntryNoOfPreviousDayAllowed));
        }
        this.toast.showSuccess(r.message || 'Audit entry day settings saved.');
      });
  }

  private parseDayCount(value: string): number | null {
    const normalized = coerceEnglishIntegerString(value, 3).trim();
    if (!normalized) return 0;
    const n = Number(normalized);
    if (!Number.isFinite(n) || n < 0) return null;
    return Math.floor(n);
  }
}
