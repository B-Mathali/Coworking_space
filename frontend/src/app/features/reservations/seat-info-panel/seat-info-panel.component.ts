import { DatePipe } from '@angular/common';
import { Component, input, output } from '@angular/core';
import { SeatAvailability, Slot } from '../../../core/models/space.model';
import { IconComponent } from '../../../shared/icon/icon.component';

/** Panneau d'informations affiché au clic sur une place, avant confirmation. */
@Component({
  selector: 'app-seat-info-panel',
  standalone: true,
  imports: [DatePipe, IconComponent],
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

        @switch (s.status) {
          @case ('AVAILABLE') {
            @if (inPast()) {
              <div class="alert alert-warn"><app-icon name="alert" [size]="16" /> <span>Ce créneau a déjà commencé : choisissez une heure ultérieure.</span></div>
            } @else {
              <div class="alert alert-success"><app-icon name="check-circle" [size]="16" /> <span>Cette place est libre sur ce créneau.</span></div>
            }
            <button class="btn btn-accent btn-lg btn-block" [disabled]="busy() || inPast()" (click)="reserve.emit()">
              @if (busy()) { Réservation… } @else { <app-icon name="check" [size]="18" [stroke]="2.5" /> Confirmer la réservation }
            </button>
          }
          @case ('MINE') {
            <div class="alert alert-info"><app-icon name="check-circle" [size]="16" /> <span>Vous avez réservé cette place sur ce créneau.</span></div>
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
    `,
  ],
})
export class SeatInfoPanelComponent {
  readonly seat = input<SeatAvailability | null>(null);
  readonly spaceName = input('');
  readonly slot = input<Slot | null>(null);
  readonly busy = input(false);

  readonly reserve = output<void>();
  readonly cancelMine = output<void>();
  readonly closed = output<void>();

  inPast(): boolean {
    const sl = this.slot();
    return !!sl && sl.start.getTime() < Date.now() - 60_000;
  }
}
