import { Component, OnInit, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthService } from './core/services/auth.service';
import { ToastService } from './core/services/toast.service';
import { ConfirmDialogComponent } from './shared/confirm-dialog/confirm-dialog.component';
import { FooterComponent } from './shared/footer/footer.component';
import { IconComponent } from './shared/icon/icon.component';
import { NavbarComponent } from './shared/navbar/navbar.component';

/** Shell racine : navbar + contenu routé + footer + notifications. */
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, NavbarComponent, FooterComponent, ConfirmDialogComponent, IconComponent],
  template: `
    <app-navbar />
    <main class="main"><router-outlet /></main>
    <app-footer />
    <app-confirm-dialog />

    <div class="toasts" aria-live="polite">
      @for (t of toast.toasts(); track t.id) {
        <div class="toast" [class.error]="t.type === 'error'" role="status">
          <span class="t-icon"><app-icon [name]="t.type === 'error' ? 'alert-circle' : 'check'" [size]="16" [stroke]="2.5" /></span>
          <span class="t-text">{{ t.text }}</span>
          <button class="t-close" (click)="toast.dismiss(t.id)" aria-label="Fermer"><app-icon name="x" [size]="15" /></button>
        </div>
      }
    </div>
  `,
  styles: [
    `
      :host { display: flex; flex-direction: column; min-height: 100vh; }
      .main { flex: 1; }
    `,
  ],
})
export class AppComponent implements OnInit {
  private readonly auth = inject(AuthService);
  readonly toast = inject(ToastService);

  ngOnInit() {
    this.auth.refresh();
  }
}
