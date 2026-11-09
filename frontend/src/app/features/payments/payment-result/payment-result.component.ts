import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Reservation } from '../../../core/models/reservation.model';
import { PaymentService } from '../../../core/services/payment.service';
import { ReservationService } from '../../../core/services/reservation.service';
import { ToastService } from '../../../core/services/toast.service';
import { IconComponent } from '../../../shared/icon/icon.component';
import { LoadingSpinnerComponent } from '../../../shared/loading-spinner/loading-spinner.component';
import { MoneyPipe } from '../../../shared/money/money.pipe';

type State = 'loading' | 'paid' | 'pending' | 'refunded' | 'cancelled' | 'error';

/**
 * Page de retour de Stripe Checkout.
 *  - /payment/success?session_id=cs_… → le backend vérifie la session auprès de Stripe ;
 *  - /payment/cancel?reservation=42   → l'utilisateur a abandonné : on libère la place.
 */
@Component({
  selector: 'app-payment-result',
  standalone: true,
  imports: [RouterLink, DatePipe, IconComponent, LoadingSpinnerComponent, MoneyPipe],
  template: `
    <div class="container container-narrow">
      @switch (state()) {
        @case ('loading') {
          <app-loading-spinner />
          <p class="center muted">Vérification du paiement…</p>
        }
        @case ('paid') {
          @let r = reservation()!;
          <div class="card result rise">
            <div class="badge-icon ok"><app-icon name="check" [size]="30" [stroke]="2.5" /></div>
            <h1>Paiement confirmé</h1>
            <p class="lead">Votre place est réservée. Une facture est disponible au format PDF.</p>

            <div class="ticket">
              <div><span>Espace</span><b>{{ r.spaceName }}</b></div>
              <div><span>Place</span><b>{{ r.seatLabel }}</b></div>
              <div><span>Date</span><b class="cap">{{ r.startTime | date: 'EEEE d MMMM y' }}</b></div>
              <div><span>Créneau</span><b class="tabular">{{ r.startTime | date: 'HH:mm' }} → {{ r.endTime | date: 'HH:mm' }}</b></div>
              @if (r.payment; as p) {
                <div><span>Montant payé</span><b>{{ p.amountTTC | money: p.currency }}</b></div>
                @if (p.cardLast4) {
                  <div><span>Carte</span><b class="cap">{{ p.cardBrand }} •••• {{ p.cardLast4 }}</b></div>
                }
                <div><span>Facture</span><b>{{ p.invoiceNumber }}</b></div>
              }
            </div>

            <div class="actions">
              <button class="btn btn-primary" [disabled]="downloading()" (click)="download(r)">
                <app-icon name="download" [size]="17" /> Télécharger la facture
              </button>
              <a class="btn btn-outline" routerLink="/my-reservations">Mes réservations</a>
            </div>
          </div>
        }
        @case ('pending') {
          <div class="card result rise">
            <div class="badge-icon warn"><app-icon name="clock" [size]="28" /></div>
            <h1>Paiement en cours de traitement</h1>
            <p class="lead">Stripe n'a pas encore confirmé votre paiement. Revenez dans quelques instants.</p>
            <div class="actions">
              <button class="btn btn-primary" (click)="ngOnInit()"><app-icon name="refresh" [size]="16" /> Réessayer</button>
              <a class="btn btn-outline" routerLink="/my-reservations">Mes réservations</a>
            </div>
          </div>
        }
        @case ('refunded') {
          <div class="card result rise">
            <div class="badge-icon warn"><app-icon name="alert" [size]="28" /></div>
            <h1>Place plus disponible</h1>
            <p class="lead">
              Le délai de paiement était dépassé et la place a été réservée par quelqu'un d'autre.
              Votre paiement a été intégralement remboursé.
            </p>
            <div class="actions"><a class="btn btn-primary" routerLink="/spaces">Choisir une autre place</a></div>
          </div>
        }
        @case ('cancelled') {
          <div class="card result rise">
            <div class="badge-icon muted-ic"><app-icon name="x" [size]="28" /></div>
            <h1>Paiement annulé</h1>
            <p class="lead">Aucun montant n'a été débité et la place a été libérée.</p>
            <div class="actions">
              <a class="btn btn-primary" routerLink="/spaces">Retour aux espaces</a>
              <a class="btn btn-outline" routerLink="/my-reservations">Mes réservations</a>
            </div>
          </div>
        }
        @default {
          <div class="card result rise">
            <div class="badge-icon err"><app-icon name="alert-circle" [size]="28" /></div>
            <h1>Impossible de vérifier le paiement</h1>
            <p class="lead">{{ error() }}</p>
            <div class="actions"><a class="btn btn-outline" routerLink="/my-reservations">Mes réservations</a></div>
          </div>
        }
      }
    </div>
  `,
  styles: [
    `
      .result { text-align: center; padding: 2.25rem 1.75rem; }
      .result h1 { margin: 1rem 0 .4rem; }
      .badge-icon { width: 68px; height: 68px; margin: 0 auto; border-radius: 50%; display: grid; place-items: center; }
      .ok { background: var(--success-soft); color: var(--success); }
      .warn { background: var(--warning-soft); color: var(--warning-ink); }
      .err { background: var(--danger-soft); color: var(--danger); }
      .muted-ic { background: var(--surface-3); color: var(--text-2); }
      .ticket { text-align: left; margin: 1.5rem auto 0; max-width: 420px; border: 1px dashed var(--border-strong); border-radius: var(--r); padding: .3rem 1rem; background: var(--bg-elev); }
      .ticket div { display: flex; justify-content: space-between; gap: 1rem; padding: .55rem 0; }
      .ticket div + div { border-top: 1px dashed var(--border); }
      .ticket span { color: var(--text-3); font-size: .85rem; }
      .ticket b { color: var(--text); text-align: right; }
      .cap { text-transform: capitalize; }
      .actions { display: flex; gap: .6rem; justify-content: center; flex-wrap: wrap; margin-top: 1.5rem; }
      .center { text-align: center; }
    `,
  ],
})
export class PaymentResultComponent implements OnInit {
  private readonly payments = inject(PaymentService);
  private readonly reservations = inject(ReservationService);
  private readonly toast = inject(ToastService);

  /** Paramètres de requête liés par withComponentInputBinding */
  readonly session_id = input<string>();
  readonly reservation_id = input<string | undefined>(undefined, { alias: 'reservation' });

  readonly state = signal<State>('loading');
  readonly reservation = signal<Reservation | null>(null);
  readonly error = signal('');
  readonly downloading = signal(false);

  ngOnInit() {
    this.state.set('loading');
    const sessionId = this.session_id();
    const reservationId = Number(this.reservation_id());

    if (sessionId) {
      this.payments.confirm(sessionId).subscribe({
        next: ({ outcome, reservation }) => {
          this.reservation.set(reservation);
          this.state.set(outcome === 'PAID' ? 'paid' : outcome === 'REFUNDED' ? 'refunded' : 'pending');
        },
        error: (e) => this.fail(e),
      });
    } else if (reservationId) {
      // Abandon sur Stripe : on annule la réservation en attente pour libérer la place tout de suite.
      this.reservations.cancel(reservationId).subscribe({
        next: () => this.state.set('cancelled'),
        error: () => this.state.set('cancelled'),
      });
    } else {
      this.error.set('Lien de paiement invalide.');
      this.state.set('error');
    }
  }

  download(r: Reservation) {
    this.downloading.set(true);
    this.payments.downloadInvoice(r.id, r.payment?.invoiceNumber ?? null).subscribe({
      next: () => this.downloading.set(false),
      error: (e) => {
        this.downloading.set(false);
        this.toast.fromError(e, 'Téléchargement impossible.');
      },
    });
  }

  private fail(e: unknown) {
    this.error.set(this.toast.message(e, 'Erreur inconnue.'));
    this.state.set('error');
  }
}
