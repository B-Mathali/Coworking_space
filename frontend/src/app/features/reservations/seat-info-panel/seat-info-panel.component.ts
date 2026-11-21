import { DatePipe } from '@angular/common';
import { Component, computed, input, output } from '@angular/core';
import { BillingConfig } from '../../../core/models/reservation.model';
import { SeatAvailability, Slot } from '../../../core/models/space.model';
import { IconComponent } from '../../../shared/icon/icon.component';
import { MoneyPipe } from '../../../shared/money/money.pipe';

/** Panneau d'informations affiché au clic sur une place, avant confirmation. */
@Component({
  selector: 'app-seat-info-panel',
  standalone: true,
  imports: [DatePipe, IconComponent, MoneyPipe],
  template: `
    <div class="card panel">
      @if (seat(); as s) {
        <div class="head">
          <div [class]="'big seat-' + s.status.toLowerCase()">{{ s.label }}</div>
          <div class="head-text">
            <span class="xs muted">Place sélectionnée</span>
            <h3>Place {{ s.label }}</h3>
            <span class="muted small truncate">{{ spaceName() }}</span>
          </div>
          <button class="btn btn-ghost btn-sm btn-icon" (click)="closed.emit()" aria-label="Fermer"><app-icon name="x" [size]="16" /></button>
        </div>

        @if (slot(); as sl) {
          <div class="ticket">
            <div class="t-row">
              <app-icon name="calendar" [size]="16" />
              <div><span class="t-k">Date</span><span class="t-v">{{ sl.start | date: 'EEEE d MMMM y' }}</span></div>
            </div>
            <div class="t-row">
              <app-icon name="clock" [size]="16" />
              <div><span class="t-k">Créneau</span><span class="t-v tabular">{{ sl.start | date: 'HH:mm' }} → {{ sl.end | date: 'HH:mm' }}</span></div>
            </div>
          </div>
        }

        @if (s.status === 'AVAILABLE' && quote(); as q) {
          <div class="quote">
            <div><span>{{ q.hours }} h × {{ pricePerHour() | money: q.currency }} HT</span><span>{{ q.ht | money: q.currency }}</span></div>
            <div><span>TVA {{ q.vatPct }} %</span><span>{{ q.vat | money: q.currency }}</span></div>
            <div class="total"><span>Total TTC</span><span>{{ q.ttc | money: q.currency }}</span></div>
          </div>
        }

        @switch (s.status) {
          @case ('AVAILABLE') {
            @if (inPast()) {
              <div class="alert alert-warn"><app-icon name="alert" [size]="16" /> <span>Ce créneau a déjà commencé : choisissez une heure ultérieure.</span></div>
            } @else {
              <div class="alert alert-success"><app-icon name="check-circle" [size]="16" /> <span>Cette place est libre sur ce créneau.</span></div>
            }
            <button class="btn btn-accent btn-lg btn-block" [disabled]="busy() || inPast()" (click)="reserve.emit()">
              @if (busy()) {
                {{ quote() ? 'Redirection vers le paiement…' : 'Réservation…' }}
              } @else if (quote()) {
                <app-icon name="card" [size]="18" /> Payer {{ quote()!.ttc | money: quote()!.currency }}
              } @else {
                <app-icon name="check" [size]="18" [stroke]="2.5" /> Confirmer la réservation
              }
            </button>
            @if (quote()) {
              <p class="xs muted secure"><app-icon name="lock" [size]="12" /> Paiement sécurisé par Stripe · facture PDF après paiement</p>
            }
          }
          @case ('MINE') {
            @if (s.pendingPayment) {
              <div class="alert alert-warn"><app-icon name="clock" [size]="16" /> <span>Place bloquée pour vous : finalisez le paiement pour confirmer la réservation.</span></div>
              <button class="btn btn-accent btn-block" [disabled]="busy()" (click)="pay.emit()">
                <app-icon name="card" [size]="17" /> Finaliser le paiement
              </button>
            } @else {
              <div class="alert alert-info"><app-icon name="check-circle" [size]="16" /> <span>Vous avez réservé cette place sur ce créneau.</span></div>
            }
            <button class="btn btn-danger-soft btn-block" [disabled]="busy()" (click)="cancelMine.emit()">
              <app-icon name="x" [size]="16" /> Annuler ma réservation
            </button>
          }
          @case ('TAKEN') {
            <div class="alert alert-error"><app-icon name="user" [size]="16" /> <span>Cette place est déjà occupée sur ce créneau. Essayez une autre place ou un autre horaire.</span></div>
          }
          @case ('DISABLED') {
            <div class="alert alert-warn"><app-icon name="wrench" [size]="16" /> <span>Place indisponible (maintenance).</span></div>
          }
        }
      } @else {
        <div class="empty-state" style="padding: 2rem .5rem">
          <div class="empty-icon"><app-icon name="pointer" [size]="24" /></div>
          <h3>Choisissez une place</h3>
          <p>Cliquez sur une place <b style="color: var(--success)">libre</b> du plan pour voir ses informations et la réserver.</p>
        </div>
      }
    </div>
  `,
  styles: [
    `
      .head { display: flex; align-items: center; gap: .85rem; margin-bottom: 1.1rem; }
      .head-text { display: flex; flex-direction: column; min-width: 0; flex: 1; }
      .head-text h3 { margin: 0; font-size: 1.15rem; }
      .big { width: 58px; height: 58px; border-radius: 15px; display: grid; place-items: center; font-weight: 800; font-size: 1rem; flex-shrink: 0; }
      .ticket { border: 1px dashed var(--border-strong); border-radius: var(--r); padding: .4rem .9rem; margin-bottom: 1rem; background: var(--bg-elev); }
      .t-row { display: flex; align-items: center; gap: .75rem; padding: .55rem 0; color: var(--text-3); }
      .t-row + .t-row { border-top: 1px dashed var(--border); }
      .t-row div { display: flex; flex-direction: column; line-height: 1.3; }
      .t-k { font-size: .72rem; font-weight: 650; text-transform: uppercase; letter-spacing: .05em; }
      .t-v { font-weight: 700; color: var(--text); text-transform: capitalize; }
      .quote { margin-bottom: 1rem; padding: .35rem .9rem; border-radius: var(--r); background: var(--primary-soft); font-size: .88rem; }
      .quote div { display: flex; justify-content: space-between; gap: 1rem; padding: .35rem 0; color: var(--text-2); }
      .quote .total { border-top: 1px solid color-mix(in srgb, var(--primary) 20%, transparent); font-weight: 750; color: var(--text); font-size: .98rem; }
      .secure { display: flex; align-items: center; justify-content: center; gap: .3rem; margin: .6rem 0 0; text-align: center; }
      .btn-block + .btn-block { margin-top: .5rem; }
    `,
  ],
})
export class SeatInfoPanelComponent {
  readonly seat = input<SeatAvailability | null>(null);
  readonly spaceName = input('');
  readonly slot = input<Slot | null>(null);
  readonly busy = input(false);
  readonly pricePerHour = input(0);
  readonly billing = input<BillingConfig | null>(null);

  readonly reserve = output<void>();
  readonly pay = output<void>();
  readonly cancelMine = output<void>();
  readonly closed = output<void>();

  /** Estimation affichée avant paiement ; même calcul (arrondi au centime) que le backend. */
  readonly quote = computed(() => {
    const price = this.pricePerHour();
    const sl = this.slot();
    const billing = this.billing();
    if (!price || !sl || !billing) return null;
    const round2 = (n: number) => Math.round(n * 100) / 100;
    const hours = round2((sl.end.getTime() - sl.start.getTime()) / 3_600_000);
    const ht = round2(hours * price);
    const vat = round2(ht * billing.vatRate);
    return {
      hours,
      ht,
      vat,
      ttc: round2(ht + vat),
      vatPct: Math.round(billing.vatRate * 100),
      currency: billing.currency,
    };
  });

  inPast(): boolean {
    const sl = this.slot();
    return !!sl && sl.start.getTime() < Date.now() - 60_000;
  }
}
