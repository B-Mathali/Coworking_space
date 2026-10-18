import { DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Reservation } from '../../../core/models/reservation.model';
import { ConfirmService } from '../../../core/services/confirm.service';
import { ReservationService } from '../../../core/services/reservation.service';
import { ToastService } from '../../../core/services/toast.service';
import { IconComponent } from '../../../shared/icon/icon.component';

type Tab = 'upcoming' | 'past' | 'cancelled';

@Component({
  selector: 'app-my-reservations',
  standalone: true,
  imports: [DatePipe, RouterLink, IconComponent],
  templateUrl: './my-reservations.component.html',
  styles: [
    `
      .next {
        position: relative; overflow: hidden; display: flex; align-items: center; justify-content: space-between; gap: 1.5rem;
        padding: 1.5rem 1.75rem; margin-bottom: 1.75rem; border-radius: var(--r-xl); color: #fff;
        background:
          radial-gradient(70% 140% at 100% 0%, rgb(255 122 69 / 50%), transparent 60%),
          linear-gradient(135deg, #2a46ff, #4b2fd0);
        box-shadow: 0 18px 40px rgb(42 70 255 / 25%);
      }
      .next h2 { color: #fff; font-size: 1.5rem; margin: .5rem 0 .8rem; }
      .next-tag { display: inline-flex; align-items: center; gap: .45rem; font-size: .76rem; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; padding: .3rem .7rem; border-radius: 999px; background: rgb(255 255 255 / 16%); }
      .live { width: 8px; height: 8px; border-radius: 50%; background: #7dffb3; box-shadow: 0 0 0 0 rgb(125 255 179 / 70%); animation: pulse 1.6s infinite; }
      @keyframes pulse { 70% { box-shadow: 0 0 0 8px rgb(125 255 179 / 0%); } 100% { box-shadow: 0 0 0 0 rgb(125 255 179 / 0%); } }
      .next-meta { display: flex; flex-wrap: wrap; gap: .5rem 1.25rem; font-size: .92rem; font-weight: 600; opacity: .95; }
      .next-meta span { display: inline-flex; align-items: center; gap: .4rem; text-transform: capitalize; }
      .next-seat { width: 88px; height: 88px; flex-shrink: 0; border-radius: 22px; display: grid; place-items: center; font-size: 1.6rem; font-weight: 800; background: rgb(255 255 255 / 16%); border: 1px solid rgb(255 255 255 / 25%); }

      .res { display: flex; align-items: center; gap: 1.1rem; padding: 1rem 1.1rem; margin: 0 !important; transition: border-color .15s, box-shadow .15s; }
      .res:hover { border-color: var(--border-strong); box-shadow: var(--shadow-sm); }
      .res.dim .date-block { background: var(--surface-2); color: var(--text-2); }
      .res.dim .d-day { color: var(--text-2); }
      .date-block { width: 62px; flex-shrink: 0; padding: .45rem 0; border-radius: var(--r); background: var(--primary-soft); color: var(--primary-ink); display: flex; flex-direction: column; align-items: center; line-height: 1.1; }
      .d-month, .d-week { font-size: .68rem; font-weight: 750; text-transform: uppercase; letter-spacing: .06em; }
      .d-day { font-size: 1.5rem; font-weight: 800; color: var(--primary); letter-spacing: -.02em; }
      .res-main { flex: 1; min-width: 0; }
      .res-title { display: flex; align-items: center; gap: .6rem; flex-wrap: wrap; }
      .res-title h3 { margin: 0; }
      .res-meta { display: flex; flex-wrap: wrap; gap: .3rem 1.1rem; margin-top: .35rem; font-size: .86rem; color: var(--text-2); }
      .res-meta span { display: inline-flex; align-items: center; gap: .35rem; }
      .res-meta b { color: var(--text); }
      @media (max-width: 600px) {
        .next { padding: 1.25rem; }
        .next-seat { display: none; }
        .res { flex-wrap: wrap; }
        .res .btn { width: 100%; }
      }
    `,
  ],
})
export class MyReservationsComponent implements OnInit {
  private readonly api = inject(ReservationService);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);

  readonly all = signal<Reservation[]>([]);
  readonly loading = signal(true);
  readonly tab = signal<Tab>('upcoming');

  readonly upcoming = computed(() =>
    this.all()
      .filter((r) => r.status === 'CONFIRMED' && new Date(r.endTime).getTime() > Date.now())
      .sort((a, b) => +new Date(a.startTime) - +new Date(b.startTime)),
  );
  readonly past = computed(() =>
    this.all().filter((r) => r.status === 'CONFIRMED' && new Date(r.endTime).getTime() <= Date.now()),
  );
  readonly cancelled = computed(() => this.all().filter((r) => r.status === 'CANCELLED'));

  readonly shown = computed(() => {
    switch (this.tab()) {
      case 'upcoming':
        return this.upcoming();
      case 'past':
        return this.past();
      default:
        return this.cancelled();
    }
  });

  ngOnInit() {
    this.load();
  }

  isOngoing(r: Reservation): boolean {
    const now = Date.now();
    return new Date(r.startTime).getTime() <= now && new Date(r.endTime).getTime() > now;
  }

  /** « dans 3 h », « demain », « dans 4 jours »… */
  relative(r: Reservation): string {
    const start = new Date(r.startTime);
    const mins = Math.round((start.getTime() - Date.now()) / 60_000);
    if (mins < 60) return `dans ${Math.max(mins, 1)} min`;
    const today = new Date();
    const dayDiff = Math.round(
      (new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime() -
        new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()) /
        86_400_000,
    );
    if (dayDiff === 0) return `dans ${Math.round(mins / 60)} h`;
    if (dayDiff === 1) return 'demain';
    return `dans ${dayDiff} jours`;
  }

  duration(r: Reservation): string {
    const mins = Math.round((+new Date(r.endTime) - +new Date(r.startTime)) / 60_000);
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m ? `${h} h ${String(m).padStart(2, '0')}` : `${h} h`;
  }

  async cancel(r: Reservation) {
    const ok = await this.confirm.ask({
      title: 'Annuler cette réservation ?',
      message: `La place ${r.seatLabel} (${r.spaceName}) sera libérée pour les autres membres.`,
      confirmText: 'Oui, annuler',
      cancelText: 'Garder',
      danger: true,
    });
    if (!ok) return;
    this.api.cancel(r.id).subscribe({
      next: () => {
        this.toast.success('Réservation annulée.');
        this.load();
      },
      error: (e) => this.toast.fromError(e),
    });
  }

  private load() {
    this.api.mine().subscribe({
      next: (l) => {
        this.all.set(l);
        this.loading.set(false);
      },
      error: (e) => {
        this.toast.fromError(e, 'Impossible de charger vos réservations.');
        this.loading.set(false);
      },
    });
  }
}
