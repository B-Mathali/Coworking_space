import { DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AdminStats } from '../../../core/models/reservation.model';
import { AdminService } from '../../../core/services/admin.service';
import { ToastService } from '../../../core/services/toast.service';
import { IconComponent } from '../../../shared/icon/icon.component';

const RING_C = 2 * Math.PI * 50;

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [RouterLink, DatePipe, IconComponent],
  templateUrl: './admin-dashboard.component.html',
  styles: [
    `
      .dash-grid { display: grid; grid-template-columns: 320px minmax(0, 1fr); gap: 1.25rem; }
      .dash-grid > .card { margin: 0; }
      @media (max-width: 900px) { .dash-grid { grid-template-columns: 1fr; } }

      .occ { display: flex; flex-direction: column; }
      .ring-wrap { position: relative; width: 180px; height: 180px; margin: .5rem auto 1.25rem; }
      .ring { width: 100%; height: 100%; transform: rotate(-90deg); }
      .ring circle { fill: none; stroke-width: 12; }
      .ring-track { stroke: var(--surface-2); }
      .ring-value { stroke: var(--primary); stroke-linecap: round; transition: stroke-dasharray .8s var(--ease); }
      .ring-label { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; }
      .ring-label b { font-size: 2.1rem; font-weight: 800; letter-spacing: -.03em; line-height: 1; }
      .ring-label span { font-size: .8rem; color: var(--text-3); font-weight: 600; }
      .occ-foot { display: grid; grid-template-columns: 1fr 1fr; gap: .6rem; margin-top: auto; }
      .occ-foot div { display: flex; flex-direction: column; padding: .7rem .85rem; border-radius: var(--r); background: var(--bg-elev); border: 1px solid var(--border); }
      .occ-foot b { font-size: 1.2rem; font-weight: 800; }
      .occ-foot span { font-size: .76rem; color: var(--text-3); }

      .chart { position: relative; height: 240px; margin-top: .5rem; }
      .gridlines { position: absolute; inset: 0 0 26px 28px; display: flex; flex-direction: column-reverse; justify-content: space-between; }
      .gl { position: relative; border-top: 1px dashed var(--border); height: 0; }
      .gl:first-child { border-top-style: solid; border-color: var(--border-strong); }
      .gl span { position: absolute; left: -28px; top: -8px; font-size: .7rem; color: var(--text-3); font-variant-numeric: tabular-nums; width: 22px; text-align: right; }
      .bars { position: absolute; inset: 0 0 0 28px; display: flex; gap: 2px; }
      .bar-col { flex: 1; display: flex; flex-direction: column; align-items: center; outline: none; }
      .bar-area { position: relative; flex: 1; width: 100%; display: flex; align-items: flex-end; justify-content: center; border-radius: 8px; transition: background .15s; }
      .bar-col:hover .bar-area, .bar-col:focus-visible .bar-area { background: var(--surface-2); }
      .bar { width: 56%; max-width: 44px; min-height: 3px; background: color-mix(in srgb, var(--primary) 55%, var(--surface)); border-radius: 4px 4px 0 0; transition: height .6s var(--ease), background .15s; }
      .bar.today, .bar-col:hover .bar { background: var(--primary); }
      .bar-label { height: 26px; display: flex; align-items: center; font-size: .74rem; color: var(--text-3); text-transform: capitalize; white-space: nowrap; }
      .bar-label.strong { color: var(--text); }
      .tip {
        position: absolute; bottom: calc(100% + 6px); left: 50%; transform: translate(-50%, 4px); opacity: 0; pointer-events: none;
        background: var(--text); color: var(--bg); padding: .35rem .6rem; border-radius: 8px; font-size: .8rem; font-weight: 750;
        white-space: nowrap; display: flex; flex-direction: column; align-items: center; line-height: 1.25; transition: opacity .15s, transform .15s; z-index: 2;
      }
      .tip small { font-weight: 550; opacity: .75; font-size: .7rem; text-transform: capitalize; }
      .bar-col:hover .tip, .bar-col:focus-visible .tip { opacity: 1; transform: translate(-50%, 0); }
      .bar-area .tip { bottom: auto; top: -6px; transform: translate(-50%, -96%); }
      .bar-col:hover .bar-area .tip, .bar-col:focus-visible .bar-area .tip { transform: translate(-50%, -100%); }
    `,
  ],
})
export class AdminDashboardComponent implements OnInit {
  private readonly api = inject(AdminService);
  private readonly toast = inject(ToastService);

  readonly today = new Date();
  readonly stats = signal<AdminStats | null>(null);

  /** Pas de graduation « propre » (1, 2, 5, 10…) visant ~4-5 graduations. */
  private readonly axisStep = computed(() => {
    const max = Math.max(1, ...(this.stats()?.last7Days.map((d) => d.count) ?? [1]));
    const raw = max / 4;
    const mag = 10 ** Math.floor(Math.log10(raw));
    return Math.max(1, [1, 2, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? 10 * mag);
  });
  readonly axisMax = computed(() => {
    const max = Math.max(1, ...(this.stats()?.last7Days.map((d) => d.count) ?? [1]));
    return Math.ceil(max / this.axisStep()) * this.axisStep();
  });
  readonly gridSteps = computed(() =>
    Array.from({ length: this.axisMax() / this.axisStep() + 1 }, (_, i) => i * this.axisStep()),
  );
  readonly weekTotal = computed(() => this.stats()?.last7Days.reduce((a, d) => a + d.count, 0) ?? 0);

  ngOnInit() {
    this.api.stats().subscribe({
      next: (s) => this.stats.set(s),
      error: (e) => this.toast.fromError(e, 'Impossible de charger les statistiques.'),
    });
  }

  height(count: number): number {
    return (count / this.axisMax()) * 100;
  }

  ringDash(rate: number): string {
    const v = (Math.min(Math.max(rate, 0), 100) / 100) * RING_C;
    return `${v} ${RING_C}`;
  }
}
