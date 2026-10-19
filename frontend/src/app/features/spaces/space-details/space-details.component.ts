import { Component, OnInit, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Space } from '../../../core/models/space.model';
import { SpaceService } from '../../../core/services/space.service';
import { ToastService } from '../../../core/services/toast.service';
import { IconComponent } from '../../../shared/icon/icon.component';
import { LoadingSpinnerComponent } from '../../../shared/loading-spinner/loading-spinner.component';

@Component({
  selector: 'app-space-details',
  standalone: true,
  imports: [RouterLink, LoadingSpinnerComponent, IconComponent],
  templateUrl: './space-details.component.html',
  styles: [
    `
      .hero {
        height: 190px; display: grid; place-items: center; overflow: hidden;
        background:
          radial-gradient(80% 120% at 100% 0%, rgb(255 122 69 / 45%), transparent 60%),
          linear-gradient(135deg, #5b4cf5, #3aa8f0);
      }
      .hero-grid { display: grid; grid-template-columns: repeat(12, 1fr); gap: 6px; width: min(70%, 460px); transform: perspective(600px) rotateX(30deg); }
      .hero-grid span { aspect-ratio: 1; border-radius: 5px; background: rgb(255 255 255 / 20%); }
      .hero-grid span.on { background: rgb(255 255 255 / 90%); }
      .content { padding: 1.75rem; }
      .loc { display: flex; align-items: center; gap: .35rem; color: var(--text-3); font-weight: 550; margin: .4rem 0 0; }
      .facts { display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: .75rem; margin: 1.5rem 0 1.75rem; }
      .fact { display: flex; align-items: center; gap: .75rem; padding: .85rem 1rem; border-radius: var(--r); background: var(--bg-elev); border: 1px solid var(--border); }
      .fact div { display: flex; flex-direction: column; line-height: 1.25; }
      .fact b { font-weight: 750; color: var(--text); }
      .fact span:not(.fi) { font-size: .78rem; color: var(--text-3); }
      .fi { width: 38px; height: 38px; border-radius: 10px; display: grid; place-items: center; background: var(--primary-soft); color: var(--primary); }
      .cta { display: flex; align-items: center; justify-content: space-between; gap: 1rem; flex-wrap: wrap; margin-top: 1.75rem; padding: 1.1rem 1.25rem; border-radius: var(--r-lg); background: var(--primary-soft); }
      @media (max-width: 600px) { .content { padding: 1.25rem; } .cta .btn { width: 100%; } }
    `,
  ],
})
export class SpaceDetailsComponent implements OnInit {
  private readonly spaces = inject(SpaceService);
  private readonly toast = inject(ToastService);

  /** Lié au paramètre :id de la route (withComponentInputBinding) */
  readonly id = input.required<string>();

  readonly space = signal<Space | null>(null);
  readonly loading = signal(true);
  readonly heroCells = Array.from({ length: 36 }, (_, i) => i);

  ngOnInit() {
    this.spaces.get(Number(this.id())).subscribe({
      next: (s) => {
        this.space.set(s);
        this.loading.set(false);
      },
      error: (e) => {
        this.toast.fromError(e, 'Espace introuvable.');
        this.loading.set(false);
      },
    });
  }
}
