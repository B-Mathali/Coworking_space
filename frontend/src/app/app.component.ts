import { Component, OnInit, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthService } from './core/services/auth.service';
import { ToastService } from './core/services/toast.service';
import { FooterComponent } from './shared/footer/footer.component';
import { NavbarComponent } from './shared/navbar/navbar.component';

/** Shell racine : navbar + contenu routé + footer + notifications. */
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, NavbarComponent, FooterComponent],
  template: `
    <app-navbar />
    <main class="main"><router-outlet /></main>
    <app-footer />

    <div class="toasts">
      @for (t of toast.toasts(); track t.id) {
        <div class="toast" [class.error]="t.type === 'error'">{{ t.text }}</div>
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
