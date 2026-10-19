import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Space } from '../../../core/models/space.model';
import { AuthService } from '../../../core/services/auth.service';
import { SpaceService } from '../../../core/services/space.service';
import { ToastService } from '../../../core/services/toast.service';
import { IconComponent } from '../../../shared/icon/icon.component';
import { SpaceCardComponent } from '../space-card/space-card.component';

@Component({
  selector: 'app-space-list',
  standalone: true,
  imports: [SpaceCardComponent, IconComponent],
  templateUrl: './space-list.component.html',
  styles: [
    `
      .list-page { max-width: 1080px; padding-top: 3.5rem; }
      .intro { margin-bottom: 2.25rem; }
      .kicker { display: block; font-size: .76rem; font-weight: 800; letter-spacing: .12em; text-transform: uppercase; color: var(--primary); margin-bottom: .8rem; }
      .intro h1 { font-size: clamp(2rem, 1.3rem + 2.6vw, 3.3rem); line-height: 1.05; letter-spacing: -.045em; max-width: 16ch; margin-bottom: .9rem; }
      .lead { color: var(--text-2); font-size: 1.05rem; margin: 0; }
      .filter-bar {
        display: flex; align-items: center; gap: 1rem; padding: .7rem; margin-bottom: 2rem;
        background: var(--surface); border: 1px solid var(--border); border-radius: 18px; box-shadow: var(--shadow-xs);
      }
      .search { flex: 1; }
      .search input { height: 46px; border-radius: 12px; border-color: transparent; background: var(--surface-2); }
      .search input:hover:not(:disabled) { border-color: var(--border-strong); }
      .count { padding: 0 .75rem; font-size: .88rem; font-weight: 600; color: var(--text-2); white-space: nowrap; }
      @media (max-width: 640px) {
        .list-page { padding-top: 2rem; }
        .filter-bar { flex-direction: column; align-items: stretch; gap: .5rem; }
        .count { padding: 0 .25rem .2rem; }
      }
    `,
  ],
})
export class SpaceListComponent implements OnInit {
  private readonly spaces = inject(SpaceService);
  private readonly toast = inject(ToastService);
  private readonly auth = inject(AuthService);

  readonly list = signal<Space[]>([]);
  readonly loading = signal(true);
  readonly query = signal('');

  readonly filtered = computed(() => {
    const q = this.query().trim().toLowerCase();
    if (!q) return this.list();
    return this.list().filter((s) => `${s.name} ${s.location ?? ''} ${s.description ?? ''}`.toLowerCase().includes(q));
  });
  readonly totalSeats = computed(() => this.list().reduce((n, s) => n + (s.seatCount ?? 0), 0));
  readonly greeting = computed(() => {
    const first = this.auth.currentUser()?.fullName.split(' ')[0];
    const h = new Date().getHours();
    const hello = h < 5 || h >= 18 ? 'Bonsoir' : 'Bonjour';
    return first ? `${hello}, ${first}` : hello;
  });

  ngOnInit() {
    this.spaces.list().subscribe({
      next: (l) => {
        this.list.set(l);
        this.loading.set(false);
      },
      error: (e) => {
        this.toast.fromError(e, 'Impossible de charger les espaces.');
        this.loading.set(false);
      },
    });
  }
}
