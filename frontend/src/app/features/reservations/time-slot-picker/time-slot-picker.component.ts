import { Component, OnInit, computed, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Slot } from '../../../core/models/space.model';
import { IconComponent } from '../../../shared/icon/icon.component';

const pad = (n: number) => String(n).padStart(2, '0');
const toDateStr = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const toTimeStr = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

/** Choix de la date et du créneau horaire. Émet un Slot à chaque modification valide. */
@Component({
  selector: 'app-time-slot-picker',
  standalone: true,
  imports: [FormsModule, IconComponent],
  template: `
    <div class="fields">
      <div class="f f-date">
        <label for="slot-date"><app-icon name="calendar" [size]="14" /> Date</label>
        <input id="slot-date" type="date" [min]="today" [ngModel]="date()" (ngModelChange)="onDate($event)" />
      </div>
      <div class="f">
        <label for="slot-start"><app-icon name="clock" [size]="14" /> De</label>
        <input id="slot-start" type="time" step="900" [ngModel]="startT()" (ngModelChange)="onStart($event)" [class.is-invalid]="!valid()" />
      </div>
      <span class="arrow" aria-hidden="true"><app-icon name="arrow-right" [size]="16" /></span>
      <div class="f">
        <label for="slot-end">À</label>
        <input id="slot-end" type="time" step="900" [ngModel]="endT()" (ngModelChange)="onEnd($event)" [class.is-invalid]="!valid()" />
      </div>
      @if (valid()) {
        <span class="dur badge badge-blue tabular"><app-icon name="clock" [size]="12" /> {{ durationLabel() }}</span>
      }
    </div>

    <div class="chip-row presets">
      @for (d of durations; track d) {
        <button type="button" class="chip" [class.active]="hours() === d" (click)="duration(d)">{{ d }} h</button>
      }
      <span class="sep" aria-hidden="true"></span>
      <button type="button" class="chip" [class.active]="isPreset('09:00', '12:00')" (click)="preset('09:00', '12:00')">Matin</button>
      <button type="button" class="chip" [class.active]="isPreset('14:00', '18:00')" (click)="preset('14:00', '18:00')">Après-midi</button>
      <button type="button" class="chip" [class.active]="isPreset('09:00', '18:00')" (click)="preset('09:00', '18:00')">Journée</button>
    </div>

    @if (!valid()) {
      <div class="field-error"><app-icon name="alert-circle" [size]="13" /> L'heure de fin doit être après l'heure de début.</div>
    }
  `,
  styles: [
    `
      .fields { display: flex; align-items: flex-end; gap: .65rem; flex-wrap: wrap; }
      .f { display: flex; flex-direction: column; min-width: 110px; flex: 1; }
      .f-date { flex: 1.6; min-width: 170px; }
      .f label { display: inline-flex; align-items: center; gap: .3rem; font-size: .78rem; font-weight: 650; color: var(--text-2); margin-bottom: .35rem; }
      .arrow { color: var(--text-3); height: 42px; display: grid; place-items: center; }
      .dur { height: 42px; padding: 0 .85rem; border-radius: var(--r-sm); }
      .presets { margin-top: .9rem; }
      .sep { width: 1px; height: 20px; background: var(--border-strong); margin: 0 .2rem; }
      @media (max-width: 560px) { .arrow { display: none; } .dur { width: 100%; justify-content: center; } }
    `,
  ],
})
export class TimeSlotPickerComponent implements OnInit {
  readonly slotChange = output<Slot>();

  readonly durations = [1, 2, 4];
  readonly today = toDateStr(new Date());

  readonly date = signal(this.today);
  readonly startT = signal('09:00');
  readonly endT = signal('12:00');
  readonly valid = computed(() => this.endT() > this.startT());

  /** Durée du créneau en heures (décimales possibles). */
  readonly hours = computed(() => {
    const [sh, sm] = this.startT().split(':').map(Number);
    const [eh, em] = this.endT().split(':').map(Number);
    return (eh * 60 + em - (sh * 60 + sm)) / 60;
  });
  readonly durationLabel = computed(() => {
    const mins = Math.round(this.hours() * 60);
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m ? `${h} h ${pad(m)}` : `${h} h`;
  });

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

  isPreset(start: string, end: string): boolean {
    return this.startT() === start && this.endT() === end;
  }

  private emit() {
    if (!this.valid()) return;
    this.slotChange.emit({
      start: new Date(`${this.date()}T${this.startT()}`),
      end: new Date(`${this.date()}T${this.endT()}`),
    });
  }
}
