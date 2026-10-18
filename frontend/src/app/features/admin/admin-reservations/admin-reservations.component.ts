import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Reservation, ReservationStatus } from '../../../core/models/reservation.model';
import { Space } from '../../../core/models/space.model';
import { AdminService } from '../../../core/services/admin.service';
import { SpaceService } from '../../../core/services/space.service';
import { ToastService } from '../../../core/services/toast.service';
import { LoadingSpinnerComponent } from '../../../shared/loading-spinner/loading-spinner.component';

@Component({
  selector: 'app-admin-reservations',
  standalone: true,
  imports: [FormsModule, DatePipe, LoadingSpinnerComponent],
  templateUrl: './admin-reservations.component.html',
})
export class AdminReservationsComponent implements OnInit {
  private readonly admin = inject(AdminService);
  private readonly spacesApi = inject(SpaceService);
  private readonly toast = inject(ToastService);

  readonly rows = signal<Reservation[]>([]);
  readonly spaces = signal<Space[]>([]);
  readonly loading = signal(true);

  spaceId: number | null = null;
  status: ReservationStatus | '' = '';
  from = '';
  to = '';

  ngOnInit() {
    this.spacesApi.list().subscribe((l) => this.spaces.set(l));
    this.load();
  }

  load() {
    this.loading.set(true);
    this.admin
      .reservations({ spaceId: this.spaceId, status: this.status, from: this.from, to: this.to })
      .subscribe({
        next: (l) => {
          this.rows.set(l);
          this.loading.set(false);
        },
        error: (e) => {
          this.toast.fromError(e);
          this.loading.set(false);
        },
      });
  }

  reset() {
    this.spaceId = null;
    this.status = '';
    this.from = '';
    this.to = '';
    this.load();
  }

  cancel(r: Reservation) {
    if (!confirm(`Annuler la réservation de ${r.userName} (place ${r.seatLabel}) ?`)) return;
    this.admin.cancelReservation(r.id).subscribe({
      next: () => {
        this.toast.success('Réservation annulée.');
        this.load();
      },
      error: (e) => this.toast.fromError(e),
    });
  }
}
