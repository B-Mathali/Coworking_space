import { DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Reservation } from '../../../core/models/reservation.model';
import { ReservationService } from '../../../core/services/reservation.service';
import { ToastService } from '../../../core/services/toast.service';
import { LoadingSpinnerComponent } from '../../../shared/loading-spinner/loading-spinner.component';

type Tab = 'upcoming' | 'past' | 'cancelled';

@Component({
  selector: 'app-my-reservations',
  standalone: true,
  imports: [DatePipe, RouterLink, LoadingSpinnerComponent],
  templateUrl: './my-reservations.component.html',
})
export class MyReservationsComponent implements OnInit {
  private readonly api = inject(ReservationService);
  private readonly toast = inject(ToastService);

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

  cancel(r: Reservation) {
    if (!confirm(`Annuler la réservation de la place ${r.seatLabel} ?`)) return;
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
