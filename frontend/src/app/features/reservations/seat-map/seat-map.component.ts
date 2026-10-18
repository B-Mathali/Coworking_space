import { Component, DestroyRef, OnInit, computed, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SeatAvailability, Slot, Space } from '../../../core/models/space.model';
import { ReservationService } from '../../../core/services/reservation.service';
import { SeatService } from '../../../core/services/seat.service';
import { SpaceService } from '../../../core/services/space.service';
import { ToastService } from '../../../core/services/toast.service';
import { LoadingSpinnerComponent } from '../../../shared/loading-spinner/loading-spinner.component';
import { SeatInfoPanelComponent } from '../seat-info-panel/seat-info-panel.component';
import { TimeSlotPickerComponent } from '../time-slot-picker/time-slot-picker.component';

const REFRESH_MS = 15_000;

/** Page de réservation : plan dynamique de l'espace + panneau d'informations. */
@Component({
  selector: 'app-seat-map',
  standalone: true,
  imports: [RouterLink, LoadingSpinnerComponent, TimeSlotPickerComponent, SeatInfoPanelComponent],
  templateUrl: './seat-map.component.html',
  styleUrl: './seat-map.component.css',
})
export class SeatMapComponent implements OnInit {
  private readonly spacesApi = inject(SpaceService);
  private readonly seatsApi = inject(SeatService);
  private readonly reservationsApi = inject(ReservationService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  /** Paramètre de route :id */
  readonly id = input.required<string>();

  readonly space = signal<Space | null>(null);
  readonly seats = signal<SeatAvailability[]>([]);
  readonly slot = signal<Slot | null>(null);
  readonly selectedId = signal<number | null>(null);
  readonly loading = signal(true);
  readonly busy = signal(false);

  readonly selected = computed(() => this.seats().find((s) => s.id === this.selectedId()) ?? null);
  readonly freeCount = computed(() => this.seats().filter((s) => s.status === 'AVAILABLE').length);
  readonly mineCount = computed(() => this.seats().filter((s) => s.status === 'MINE').length);

  ngOnInit() {
    this.spacesApi.get(Number(this.id())).subscribe({
      next: (s) => {
        this.space.set(s);
        this.loading.set(false);
      },
      error: (e) => {
        this.toast.fromError(e, 'Espace introuvable.');
        this.loading.set(false);
      },
    });

    // Rafraîchissement automatique : le plan reflète les réservations des autres utilisateurs.
    const timer = setInterval(() => this.loadSeats(), REFRESH_MS);
    this.destroyRef.onDestroy(() => clearInterval(timer));
  }

  onSlot(slot: Slot) {
    this.slot.set(slot);
    this.loadSeats();
  }

  select(seat: SeatAvailability) {
    this.selectedId.set(seat.id);
  }

  reserve() {
    const seat = this.selected();
    const slot = this.slot();
    if (!seat || !slot) return;

    this.busy.set(true);
    this.reservationsApi
      .create({
        seatId: seat.id,
        startTime: slot.start.toISOString(),
        endTime: slot.end.toISOString(),
      })
      .subscribe({
        next: () => {
          this.busy.set(false);
          this.toast.success(`Place ${seat.label} réservée !`);
          this.loadSeats();
        },
        error: (e) => {
          this.busy.set(false);
          this.toast.fromError(e, 'Réservation impossible.');
          this.loadSeats(); // quelqu'un a peut-être pris la place entre-temps
        },
      });
  }

  cancelMine() {
    const seat = this.selected();
    if (!seat?.reservationId) return;
    this.busy.set(true);
    this.reservationsApi.cancel(seat.reservationId).subscribe({
      next: () => {
        this.busy.set(false);
        this.toast.success('Réservation annulée.');
        this.loadSeats();
      },
      error: (e) => {
        this.busy.set(false);
        this.toast.fromError(e);
      },
    });
  }

  private loadSeats() {
    const slot = this.slot();
    const space = this.space();
    if (!slot || !space) {
      // L'espace n'est peut-être pas encore chargé : on réessaiera au prochain événement.
      if (slot && !space) setTimeout(() => this.loadSeats(), 150);
      return;
    }
    this.seatsApi.getMap(space.id, slot).subscribe({
      next: (list) => this.seats.set(list),
      error: (e) => this.toast.fromError(e, 'Impossible de charger le plan.'),
    });
  }
}
