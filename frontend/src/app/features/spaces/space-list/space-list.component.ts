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
      .summary { display: flex; gap: .5rem; }
      .summary > div { display: flex; flex-direction: column; padding: .6rem 1rem; border-radius: var(--r); background: var(--surface); border: 1px solid var(--border); min-width: 92px; }
      .summary b { font-size: 1.35rem; font-weight: 800; letter-spacing: -.02em; line-height: 1.1; }
      .summary span { font-size: .75rem; color: var(--text-3); font-weight: 600; }
      .toolbar { display: flex; align-items: center; gap: 1rem; margin-bottom: 1.25rem; flex-wrap: wrap; }
      .search { flex: 1; max-width: 420px; min-width: 220px; }
      .search input { height: 44px; border-radius: var(--r); background: var(--surface); }
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
