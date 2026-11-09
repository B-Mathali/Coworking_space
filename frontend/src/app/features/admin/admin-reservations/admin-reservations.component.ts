import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { PaymentStatus, Reservation, ReservationStatus } from '../../../core/models/reservation.model';
import { Space } from '../../../core/models/space.model';
import { AdminService } from '../../../core/services/admin.service';
import { ConfirmService } from '../../../core/services/confirm.service';
import { PaymentService } from '../../../core/services/payment.service';
import { SpaceService } from '../../../core/services/space.service';
import { ToastService } from '../../../core/services/toast.service';
import { AvatarComponent } from '../../../shared/avatar/avatar.component';
import { IconComponent } from '../../../shared/icon/icon.component';
import { MoneyPipe } from '../../../shared/money/money.pipe';

@Component({
  selector: 'app-admin-reservations',
  standalone: true,
  imports: [FormsModule, DatePipe, IconComponent, AvatarComponent, MoneyPipe],
  templateUrl: './admin-reservations.component.html',
  styles: [
    `
      .filters .form-row { grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); align-items: end; }
      .filter-actions { display: flex; gap: .35rem; }
      .filter-actions .btn { --btn-h: 42px; }
      .filter-actions .btn-primary { flex: 1; }
      .text-success { color: var(--success-ink); font-weight: 650; }
      .text-danger { color: var(--danger-ink); font-weight: 650; }
    `,
  ],
})
export class AdminReservationsComponent implements OnInit {
  private readonly admin = inject(AdminService);
  private readonly spacesApi = inject(SpaceService);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);
  private readonly payments = inject(PaymentService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly statusLabel: Record<ReservationStatus, string> = {
    CONFIRMED: 'Confirmée',
    PENDING_PAYMENT: 'En attente',
    CANCELLED: 'Annulée',
  };
  readonly paymentLabel: Record<PaymentStatus, string> = {
    PENDING: 'Non payé',
    PAID: 'Payé',
    EXPIRED: 'Délai expiré',
    CANCELLED: 'Non payé',
    REFUNDED: 'Remboursé',
  };
  readonly paymentClass: Record<PaymentStatus, string> = {
    PENDING: 'muted',
    PAID: 'text-success',
    EXPIRED: 'muted',
    CANCELLED: 'muted',
    REFUNDED: 'text-danger',
  };

  readonly rows = signal<Reservation[]>([]);
  readonly spaces = signal<Space[]>([]);
  readonly loading = signal(true);

  /** Renseigné en venant de la page Utilisateurs */
  readonly userFilter = signal<{ id: number; name: string } | null>(null);

  spaceId: number | null = null;
  status: ReservationStatus | '' = '';
  from = '';
  to = '';

  ngOnInit() {
    const params = this.route.snapshot.queryParamMap;
    const userId = Number(params.get('userId'));
    if (userId > 0) this.userFilter.set({ id: userId, name: params.get('name') ?? `#${userId}` });
    this.spacesApi.list().subscribe((l) => this.spaces.set(l));
    this.load();
  }

  clearUserFilter() {
    this.userFilter.set(null);
    this.router.navigate([], { queryParams: {} });
    this.load();
  }

  load() {
    this.loading.set(true);
    this.admin
      .reservations({
        spaceId: this.spaceId,
        userId: this.userFilter()?.id ?? null,
        status: this.status,
        from: this.from,
        to: this.to,
      })
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
    this.clearUserFilter();
  }

  invoice(r: Reservation) {
    this.payments.downloadInvoice(r.id, r.payment?.invoiceNumber ?? null).subscribe({
      error: (e) => this.toast.fromError(e, 'Téléchargement impossible.'),
    });
  }

  async cancel(r: Reservation) {
    const refund = r.payment?.status === 'PAID';
    const ok = await this.confirm.ask({
      title: 'Annuler cette réservation ?',
      message:
        `Réservation de ${r.userName} — place ${r.seatLabel} (${r.spaceName}).` +
        (refund ? ' Le paiement sera intégralement remboursé sur la carte du client.' : ''),
      confirmText: 'Oui, annuler',
      cancelText: 'Garder',
      danger: true,
    });
    if (!ok) return;
    this.admin.cancelReservation(r.id).subscribe({
      next: () => {
        this.toast.success(refund ? 'Réservation annulée et remboursée.' : 'Réservation annulée.');
        this.load();
      },
      error: (e) => this.toast.fromError(e),
    });
  }
}
