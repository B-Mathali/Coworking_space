import { Component, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { IconComponent } from '../../../shared/icon/icon.component';
import { AuthShellComponent } from '../auth-shell/auth-shell.component';

function samePassword(group: AbstractControl): ValidationErrors | null {
  return group.get('password')?.value === group.get('confirm')?.value ? null : { mismatch: true };
}

/** Ouverte depuis le lien reçu par email (mot de passe oublié ou invitation créée par un admin). */
@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, AuthShellComponent, IconComponent],
  templateUrl: './reset-password.component.html',
})
export class ResetPasswordComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  readonly token = inject(ActivatedRoute).snapshot.queryParamMap.get('token');
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly showPwd = signal(false);

  readonly form = inject(FormBuilder).nonNullable.group(
    {
      password: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(64)]],
      confirm: ['', Validators.required],
    },
    { validators: samePassword },
  );

  submit() {
    if (this.form.invalid || !this.token) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    this.error.set(null);
    this.auth.resetPassword(this.token, this.form.getRawValue().password).subscribe({
      next: () => {
        // Les sessions ouvertes avant le changement ne sont plus valides : on repart de la connexion.
        this.auth.logout(false);
        this.toast.success('Mot de passe enregistré. Vous pouvez vous connecter.');
        this.router.navigateByUrl('/login');
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(this.toast.message(err, 'Modification impossible.'));
      },
    });
  }
}
