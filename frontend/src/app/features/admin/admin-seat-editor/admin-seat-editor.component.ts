import { Component, DestroyRef, OnInit, computed, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { SeatAvailability, Slot, Space } from '../../../core/models/space.model';
import { AdminService } from '../../../core/services/admin.service';
import { SeatService } from '../../../core/services/seat.service';
import { SpaceService } from '../../../core/services/space.service';
import { ToastService } from '../../../core/services/toast.service';
import { TimeSlotPickerComponent } from '../../reservations/time-slot-picker/time-slot-picker.component';

const SEAT_SIZE = 56;
const GRID = 10; // aimantation sur une grille de 10 px

interface DragState {
  id: number;
  startX: number;
  startY: number;
  originX: number;
  originY: number;
  moved: boolean;
}

/**
 * Éditeur de plan : l'admin dessine la salle.
 *  - mode « Ajouter » : un clic sur le plan crée une place ;
 *  - glisser-déposer : déplace une place (sauvegardé au relâchement) ;
 *  - clic : sélectionne, renomme, désactive, supprime, ou annule la réservation qui l'occupe.
 */
@Component({
  selector: 'app-admin-seat-editor',
  standalone: true,
  imports: [FormsModule, TimeSlotPickerComponent],
  templateUrl: './admin-seat-editor.component.html',
})
export class AdminSeatEditorComponent implements OnInit {
  private readonly spacesApi = inject(SpaceService);
  private readonly seatsApi = inject(SeatService);
  private readonly adminApi = inject(AdminService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  /** Paramètre optionnel de route :spaceId */
  readonly spaceId = input<string>();

  readonly spaces = signal<Space[]>([]);
  readonly currentId = signal<number | null>(null);
  readonly seats = signal<SeatAvailability[]>([]);
  readonly slot = signal<Slot | null>(null);
  readonly selectedId = signal<number | null>(null);
  readonly adding = signal(false);
  readonly renameValue = signal('');

  bulkRows = 3;
  bulkCols = 5;

  private drag: DragState | null = null;
  readonly draggingId = signal<number | null>(null);

  readonly space = computed(() => this.spaces().find((s) => s.id === this.currentId()) ?? null);
  readonly selected = computed(() => this.seats().find((s) => s.id === this.selectedId()) ?? null);

  ngOnInit() {
    this.spacesApi.list().subscribe({
      next: (list) => {
        this.spaces.set(list);
        const fromRoute = Number(this.spaceId());
        const first = list.find((s) => s.id === fromRoute) ?? list[0];
        if (first) this.currentId.set(first.id);
        this.reload();
      },
      error: (e) => this.toast.fromError(e),
    });
    const timer = setInterval(() => this.reload(), 20_000);
    this.destroyRef.onDestroy(() => clearInterval(timer));
  }

  onSpaceChange(id: number) {
    this.currentId.set(Number(id));
    this.selectedId.set(null);
    this.router.navigate(['/admin/seats', id], { replaceUrl: true });
    this.reload();
  }

  onSlot(slot: Slot) {
    this.slot.set(slot);
    this.reload();
  }

  // ---------- Création ----------

  onPlanClick(ev: MouseEvent) {
    const sp = this.space();
    if (!this.adding() || !sp || ev.target !== ev.currentTarget) return;
    const x = this.snap(ev.offsetX - SEAT_SIZE / 2, sp.planWidth);
    const y = this.snap(ev.offsetY - SEAT_SIZE / 2, sp.planHeight);
    this.seatsApi.create({ spaceId: sp.id, label: this.nextLabel(), posX: x, posY: y }).subscribe({
      next: () => this.reload(),
      error: (e) => this.toast.fromError(e),
    });
  }

  bulkGenerate() {
    const sp = this.space();
    if (!sp) return;
    this.seatsApi.bulkCreate({ spaceId: sp.id, rows: this.bulkRows, cols: this.bulkCols }).subscribe({
      next: () => {
        this.toast.success('Grille générée.');
        this.reload();
      },
      error: (e) => this.toast.fromError(e),
    });
  }

  // ---------- Glisser-déposer ----------

  onDown(ev: PointerEvent, seat: SeatAvailability) {
    if (ev.button !== 0) return;
    (ev.currentTarget as HTMLElement).setPointerCapture(ev.pointerId);
    this.drag = {
      id: seat.id,
      startX: ev.clientX,
      startY: ev.clientY,
      originX: seat.posX,
      originY: seat.posY,
      moved: false,
    };
  }

  onMove(ev: PointerEvent) {
    const d = this.drag;
    const sp = this.space();
    if (!d || !sp) return;
    const dx = ev.clientX - d.startX;
    const dy = ev.clientY - d.startY;
    if (!d.moved && Math.hypot(dx, dy) < 4) return; // seuil : sinon c'est un simple clic
    d.moved = true;
    this.draggingId.set(d.id);
    const x = this.clamp(d.originX + dx, sp.planWidth);
    const y = this.clamp(d.originY + dy, sp.planHeight);
    this.seats.update((l) => l.map((s) => (s.id === d.id ? { ...s, posX: x, posY: y } : s)));
  }

  onUp(ev: PointerEvent) {
    const d = this.drag;
    const sp = this.space();
    this.drag = null;
    this.draggingId.set(null);
    if (!d || !sp) return;

    if (!d.moved) {
      this.selectedId.set(d.id);
      this.renameValue.set(this.seats().find((s) => s.id === d.id)?.label ?? '');
      return;
    }
    const seat = this.seats().find((s) => s.id === d.id);
    if (!seat) return;
    const x = this.snap(seat.posX, sp.planWidth);
    const y = this.snap(seat.posY, sp.planHeight);
    this.seats.update((l) => l.map((s) => (s.id === d.id ? { ...s, posX: x, posY: y } : s)));
    this.seatsApi.update(d.id, { posX: x, posY: y }).subscribe({
      error: (e) => {
        this.toast.fromError(e);
        this.reload(); // on remet la position réelle
      },
    });
    ev.preventDefault();
  }

  // ---------- Actions sur la place sélectionnée ----------

  rename() {
    const seat = this.selected();
    const label = this.renameValue().trim();
    if (!seat || !label || label === seat.label) return;
    this.seatsApi.update(seat.id, { label }).subscribe({
      next: () => {
        this.toast.success('Place renommée.');
        this.reload();
      },
      error: (e) => this.toast.fromError(e),
    });
  }

  toggleActive() {
    const seat = this.selected();
    if (!seat) return;
    this.seatsApi.update(seat.id, { isActive: !seat.isActive }).subscribe({
      next: () => this.reload(),
      error: (e) => this.toast.fromError(e),
    });
  }

  removeSeat() {
    const seat = this.selected();
    if (!seat || !confirm(`Supprimer la place ${seat.label} et ses réservations ?`)) return;
    this.seatsApi.remove(seat.id).subscribe({
      next: () => {
        this.selectedId.set(null);
        this.toast.success('Place supprimée.');
        this.reload();
      },
      error: (e) => this.toast.fromError(e),
    });
  }

  cancelReservation() {
    const seat = this.selected();
    if (!seat?.reservationId || !confirm(`Annuler la réservation de ${seat.reservedBy} ?`)) return;
    this.adminApi.cancelReservation(seat.reservationId).subscribe({
      next: () => {
        this.toast.success('Réservation annulée.');
        this.reload();
      },
      error: (e) => this.toast.fromError(e),
    });
  }

  // ---------- Utilitaires ----------

  reload() {
    const id = this.currentId();
    const slot = this.slot();
    if (id === null || !slot) return;
    if (this.drag?.moved) return; // ne pas écraser une position en cours de glissement
    this.seatsApi.getMap(id, slot).subscribe({
      next: (l) => this.seats.set(l),
      error: (e) => this.toast.fromError(e),
    });
  }

  private nextLabel(): string {
    const used = new Set(this.seats().map((s) => s.label));
    let n = 1;
    while (used.has(`P${n}`)) n++;
    return `P${n}`;
  }

  private clamp(v: number, max: number): number {
    return Math.min(Math.max(0, v), max - SEAT_SIZE);
  }

  private snap(v: number, max: number): number {
    return this.clamp(Math.round(v / GRID) * GRID, max);
  }
}
