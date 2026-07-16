import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { LanguageService, SoftwareLanguageCode } from '../../core/services/language.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-settings',
  imports: [FormsModule],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SettingsComponent {
  private readonly languageService = inject(LanguageService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly selected = signal<SoftwareLanguageCode>('E');

  constructor() {
    const underOrgID = this.auth.currentUser()?.sansthaId ?? 0;
    this.languageService
      .getLanguage(underOrgID)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((code) => {
        this.selected.set(code);
        this.loading.set(false);
      });
  }

  onSelect(code: SoftwareLanguageCode): void {
    this.selected.set(code);
  }

  save(): void {
    const underOrgID = this.auth.currentUser()?.sansthaId ?? 0;
    if (!underOrgID) {
      this.toast.showError('Organization not found for language setting.');
      return;
    }

    this.saving.set(true);
    this.languageService
      .saveLanguage(underOrgID, this.selected())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((r) => {
        this.saving.set(false);
        if (r.ok) this.toast.showSuccess(r.message || 'Language setting saved.');
        else this.toast.showError(r.message || 'Unable to save language setting.');
      });
  }
}
