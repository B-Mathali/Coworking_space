import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { IconComponent } from '../../../shared/icon/icon.component';
import { AuthShellComponent } from '../auth-shell/auth-shell.component';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, AuthShellComponent, IconComponent],
  templateUrl: './forgot-password.component.html',
})
export class ForgotPasswordComponent {
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly sentMessage = signal<string | null>(null);

  readonly form = inject(FormBuilder).nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
  });

  submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    this.error.set(null);
    this.auth.forgotPassword(this.form.getRawValue().email).subscribe({
      next: (r) => {
        this.loading.set(false);
        this.sentMessage.set(r.message);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(this.toast.message(err, 'Envoi impossible.'));
      },
    });
  }
}
