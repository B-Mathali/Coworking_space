import { DatePipe } from '@angular/common';
import { Component, input, output } from '@angular/core';
import { SeatAvailability, Slot } from '../../../core/models/space.model';

/** Panneau d'informations affiché au clic sur une place, avant confirmation. */
@Component({
  selector: 'app-seat-info-panel',
  standalone: true,
  imports: [DatePipe],
  template: `
    <div class="card panel">
      @if (seat(); as s) {
        <div class="row">
          <div class="big-label" [class]="'big-label seat-' + s.status.toLowerCase()">{{ s.label }}</div>
          <div>
            <h3 style="margin: 0">Place {{ s.label }}</h3>
            <span class="muted small">{{ spaceName() }}</span>
          </div>
        </div>

        @if (slot(); as sl) {
          <dl>
            <dt>Date</dt>
            <dd>{{ sl.start | date: 'EEEE d MMMM y' }}</dd>
            <dt>Créneau</dt>
            <dd>{{ sl.start | date: 'HH:mm' }} → {{ sl.end | date: 'HH:mm' }}</dd>
          </dl>
        }

        @switch (s.status) {
          @case ('AVAILABLE') {
            <div class="alert alert-info">Cette place est libre sur ce créneau.</div>
            @if (inPast()) {
              <div class="alert alert-warn">Ce créneau est déjà commencé : choisissez une heure ultérieure.</div>
            }
            <button class="btn btn-accent btn-block" [disabled]="busy() || inPast()" (click)="reserve.emit()">
              {{ busy() ? 'Réservation…' : 'Confirmer la réservation' }}
            </button>
          }
          @case ('MINE') {
            <div class="alert alert-info">✔ Vous avez réservé cette place sur ce créneau.</div>
            <button class="btn btn-danger btn-block" [disabled]="busy()" (click)="cancelMine.emit()">
              Annuler ma réservation
            </button>
          }
          @case ('TAKEN') {
            <div class="alert alert-error">Cette place est déjà occupée sur ce créneau.</div>
          }
          @case ('DISABLED') {
            <div class="alert alert-warn">Place indisponible (maintenance).</div>
          }
        }

        <button class="btn btn-ghost btn-block" style="margin-top: .5rem" (click)="closed.emit()">Fermer</button>
      } @else {
        <div class="empty">
          <div style="font-size: 2rem">👆</div>
          <p>Cliquez sur une place du plan pour voir ses informations et la réserver.</p>
        </div>
      }
    </div>
  `,
  styles: [
    `
      .panel { position: sticky; top: 76px; }
      .big-label { width: 52px; height: 52px; border-radius: 12px; display: grid; place-items: center; font-weight: 800; border: 2px solid; }
      dl { display: grid; grid-template-columns: auto 1fr; gap: .25rem 1rem; margin: 1rem 0; font-size: .92rem; }
      dt { color: var(--gray-500); font-weight: 600; }
      dd { margin: 0; text-transform: capitalize; }
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
