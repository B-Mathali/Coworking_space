import { Component, OnInit, computed, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Slot } from '../../../core/models/space.model';

const pad = (n: number) => String(n).padStart(2, '0');
const toDateStr = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const toTimeStr = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

/** Choix de la date et du créneau horaire. Émet un Slot à chaque modification valide. */
@Component({
  selector: 'app-time-slot-picker',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="form-row">
      <div class="form-group" style="margin: 0">
        <label for="slot-date">Date</label>
        <input id="slot-date" type="date" [min]="today" [ngModel]="date()" (ngModelChange)="onDate($event)" />
      </div>
      <div class="form-group" style="margin: 0">
        <label for="slot-start">De</label>
        <input id="slot-start" type="time" step="900" [ngModel]="startT()" (ngModelChange)="onStart($event)" />
      </div>
      <div class="form-group" style="margin: 0">
        <label for="slot-end">À</label>
        <input id="slot-end" type="time" step="900" [ngModel]="endT()" (ngModelChange)="onEnd($event)" />
      </div>
    </div>

    <div class="row" style="margin-top: .75rem">
      <span class="muted small">Raccourcis :</span>
      @for (d of durations; track d) {
        <button type="button" class="btn btn-outline btn-sm" (click)="duration(d)">{{ d }} h</button>
      }
      <button type="button" class="btn btn-outline btn-sm" (click)="preset('09:00', '12:00')">Matin</button>
      <button type="button" class="btn btn-outline btn-sm" (click)="preset('14:00', '18:00')">Après-midi</button>
      <button type="button" class="btn btn-outline btn-sm" (click)="preset('09:00', '18:00')">Journée</button>
    </div>

    @if (!valid()) {
      <div class="field-error" style="margin-top: .5rem">L'heure de fin doit être après l'heure de début.</div>
    }
  `,
})
export class TimeSlotPickerComponent implements OnInit {
  readonly slotChange = output<Slot>();

  readonly durations = [1, 2, 4];
  readonly today = toDateStr(new Date());

  readonly date = signal(this.today);
  readonly startT = signal('09:00');
  readonly endT = signal('12:00');
  readonly valid = computed(() => this.endT() > this.startT());

  ngOnInit() {
    // Par défaut : prochaine heure pleine, pour 2 h (ou demain 9h–12h si on est tard)
    const now = new Date();
    const next = new Date(now);
    next.setMinutes(0, 0, 0);
    next.setHours(now.getHours() + 1);
    if (next.getHours() >= 21 || next.getDate() !== now.getDate()) {
      const tomorrow = new Date(now);
      tomorrow.setDate(now.getDate() + 1);
      this.date.set(toDateStr(tomorrow));
      this.startT.set('09:00');
      this.endT.set('12:00');
    } else {
      this.startT.set(toTimeStr(next));
      this.endT.set(toTimeStr(new Date(next.getTime() + 2 * 3600_000)));
    }
    this.emit();
  }

  onDate(v: string) {
    if (!v) return;
    this.date.set(v);
    this.emit();
  }
  onStart(v: string) {
    if (!v) return;
    this.startT.set(v);
    this.emit();
  }
  onEnd(v: string) {
    if (!v) return;
    this.endT.set(v);
    this.emit();
  }

  duration(hours: number) {
    const start = new Date(`${this.date()}T${this.startT()}`);
    const end = new Date(start.getTime() + hours * 3600_000);
    // On reste sur la même journée
    this.endT.set(end.getDate() === start.getDate() ? toTimeStr(end) : '23:45');
    this.emit();
  }

  preset(start: string, end: string) {
    this.startT.set(start);
    this.endT.set(end);
    this.emit();
  }

  private emit() {
    if (!this.valid()) return;
    this.slotChange.emit({
      start: new Date(`${this.date()}T${this.startT()}`),
      end: new Date(`${this.date()}T${this.endT()}`),
    });
  }
}
