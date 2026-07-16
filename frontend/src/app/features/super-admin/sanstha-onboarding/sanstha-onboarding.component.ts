import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import {
  CreateSansthaWithOwnerRequest,
  SansthaOwnerListItem,
  SuperAdminSchoolCategory,
  SuperAdminService
} from '../../../core/services/super-admin.service';
import { ToastService } from '../../../core/services/toast.service';
import { MarathiNumberInputDirective } from '../../../core/directives/marathi-number-input.directive';
import { FieldErrors, hasFieldErrors } from '../../../core/utils/form-field-errors';

@Component({
  selector: 'app-sanstha-onboarding',
  imports: [FormsModule, MarathiNumberInputDirective],
  templateUrl: './sanstha-onboarding.component.html',
  styleUrl: './sanstha-onboarding.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SansthaOnboardingComponent {
  private readonly superAdmin = inject(SuperAdminService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  readonly loading = signal(false);
  readonly listLoading = signal(true);
  readonly categories = signal<SuperAdminSchoolCategory[]>([]);
  readonly items = signal<SansthaOwnerListItem[]>([]);
  readonly fieldErrors = signal<FieldErrors>({});
  readonly formVisible = signal(false);
  readonly form = signal<CreateSansthaWithOwnerRequest>(this.emptyForm());

  constructor() {
    this.reload();
  }

  reload(): void {
    this.listLoading.set(true);
    this.superAdmin
      .getSchoolCategories()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((cats) => {
        this.categories.set(cats);
        if (!this.form().schoolCategoryID && cats.length) {
          this.form.update((f) => ({ ...f, schoolCategoryID: cats[0].schoolCategoryID }));
        }
      });

    this.superAdmin
      .getSansthaOwners()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((rows) => {
        this.listLoading.set(false);
        this.items.set(rows);
      });
  }

  newSanstha(): void {
    const firstCat = this.categories()[0]?.schoolCategoryID ?? null;
    this.form.set({ ...this.emptyForm(), schoolCategoryID: firstCat });
    this.fieldErrors.set({});
    this.formVisible.set(true);
  }

  cancel(): void {
    this.formVisible.set(false);
    this.fieldErrors.set({});
  }

  updateForm<K extends keyof CreateSansthaWithOwnerRequest>(key: K, value: CreateSansthaWithOwnerRequest[K]): void {
    this.form.update((f) => ({ ...f, [key]: value }));
  }

  fieldError(key: string): string | null {
    return this.fieldErrors()[key] ?? null;
  }

  save(): void {
    const f = this.form();
    const errors: FieldErrors = {};
    if (!f.sansthaName.trim()) errors['sansthaName'] = 'Sanstha name is required.';
    if (!f.ownerFirstName.trim()) errors['ownerFirstName'] = 'Owner first name is required.';
    if (!f.ownerLastName.trim()) errors['ownerLastName'] = 'Owner last name is required.';
    if (!/^\d{10}$/.test(f.ownerMobile.trim())) errors['ownerMobile'] = 'Owner mobile must be exactly 10 digits.';
    if (!f.ownerPassword.trim()) errors['ownerPassword'] = 'Owner password is required.';
    if (!f.schoolCategoryID) errors['schoolCategoryID'] = 'School category is required.';

    if (hasFieldErrors(errors)) {
      this.fieldErrors.set(errors);
      return;
    }

    this.loading.set(true);
    this.fieldErrors.set({});
    this.superAdmin
      .createSansthaWithOwner({
        ...f,
        sansthaName: f.sansthaName.trim(),
        ownerFirstName: f.ownerFirstName.trim(),
        ownerMiddleName: f.ownerMiddleName.trim(),
        ownerLastName: f.ownerLastName.trim(),
        ownerMobile: f.ownerMobile.trim(),
        ownerPassword: f.ownerPassword.trim()
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(({ data, message }) => {
        this.loading.set(false);
        if (!data) {
          this.toast.showError(message || 'Unable to create Sanstha and Owner.');
          return;
        }
        this.toast.showSuccess(
          `Sanstha "${data.sansthaName}" created. Owner login: ${data.ownerUserName}`,
          'Created'
        );
        this.formVisible.set(false);
        this.reload();
      });
  }

  private emptyForm(): CreateSansthaWithOwnerRequest {
    return {
      sansthaName: '',
      schoolCategoryID: null,
      ownerFirstName: '',
      ownerMiddleName: '',
      ownerLastName: '',
      ownerMobile: '',
      ownerPassword: ''
    };
  }
}
