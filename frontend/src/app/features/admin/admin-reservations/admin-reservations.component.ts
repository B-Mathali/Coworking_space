import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Reservation, ReservationStatus } from '../../../core/models/reservation.model';
import { Space } from '../../../core/models/space.model';
import { AdminService } from '../../../core/services/admin.service';
import { ConfirmService } from '../../../core/services/confirm.service';
import { SpaceService } from '../../../core/services/space.service';
import { ToastService } from '../../../core/services/toast.service';
import { AvatarComponent } from '../../../shared/avatar/avatar.component';
import { IconComponent } from '../../../shared/icon/icon.component';

@Component({
  selector: 'app-admin-reservations',
  standalone: true,
  imports: [FormsModule, DatePipe, IconComponent, AvatarComponent],
  templateUrl: './admin-reservations.component.html',
  styles: [
    `
      .filters .form-row { grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); align-items: end; }
      .filter-actions { display: flex; gap: .35rem; }
      .filter-actions .btn { --btn-h: 42px; }
      .filter-actions .btn-primary { flex: 1; }
    `,
  ],
})
export class AdminReservationsComponent implements OnInit {
  private readonly admin = inject(AdminService);
  private readonly spacesApi = inject(SpaceService);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);

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

  async cancel(r: Reservation) {
    const ok = await this.confirm.ask({
      title: 'Annuler cette réservation ?',
      message: `Réservation de ${r.userName} — place ${r.seatLabel} (${r.spaceName}).`,
      confirmText: 'Oui, annuler',
      cancelText: 'Garder',
      danger: true,
    });
    if (!ok) return;
    this.admin.cancelReservation(r.id).subscribe({
      next: () => {
        this.toast.success('Réservation annulée.');
        this.load();
      },
      error: (e) => this.toast.fromError(e),
    });
  }
}
