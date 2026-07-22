import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { APP_BADGE, APP_NAME } from '../../../core/constants/app-brand';
import { getDefaultHomeRoute } from '../../../core/utils/org-access.util';
import { environment } from '../../../../environments/environment';

export type LoginPortal = 'school' | 'sanstha' | 'default';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  readonly loading = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly showPassword = signal(false);
  readonly showDevDefaults = !environment.production && !!environment.devLogin;
  readonly appName = APP_NAME;
  readonly appBadge = APP_BADGE;
  readonly schoolWebsiteUrl = environment.schoolWebsiteUrl?.trim() || null;
  readonly portal = signal<LoginPortal>('default');

  readonly portalTitle = computed(() => {
    switch (this.portal()) {
      case 'school': return 'School Login';
      case 'sanstha': return 'Sanstha Login';
      default: return 'User Login';
    }
  });

  readonly portalSubtitle = computed(() => {
    switch (this.portal()) {
      case 'school': return `Sign in to your school ${APP_NAME} workspace`;
      case 'sanstha': return 'Sign in to sanstha administration dashboard';
      default: return 'Sign in with your registered app credentials';
    }
  });

  readonly form = this.fb.nonNullable.group({
    userName: [environment.devLogin?.userName ?? '', [Validators.required, Validators.maxLength(100)]],
    password: [environment.devLogin?.password ?? '', [Validators.required, Validators.maxLength(128)]]
  });

  constructor() {
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const portal = params.get('portal');
      if (portal === 'school' || portal === 'sanstha') {
        this.portal.set(portal);
      } else {
        this.portal.set('default');
      }
    });
  }

  setPortal(portal: LoginPortal): void {
    this.portal.set(portal);
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: portal === 'default' ? { portal: null } : { portal },
      queryParamsHandling: 'merge',
      replaceUrl: true
    });
  }

  togglePassword(): void {
    this.showPassword.update((v) => !v);
  }

  onSubmit(): void {
    this.errorMessage.set(null);

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);

    this.auth
      .login(this.form.getRawValue())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((response) => {
        this.loading.set(false);

        if (response.success) {
          const home = getDefaultHomeRoute(response.data?.userRoleId);
          void this.router.navigate([home]);
          return;
        }

        this.errorMessage.set(response.message ?? 'Login failed. Please try again.');
      });
  }
}
