import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Space } from '../../../core/models/space.model';
import { ConfirmService } from '../../../core/services/confirm.service';
import { SpaceService } from '../../../core/services/space.service';
import { ToastService } from '../../../core/services/toast.service';
import { IconComponent } from '../../../shared/icon/icon.component';

@Component({
  selector: 'app-admin-spaces',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, IconComponent],
  templateUrl: './admin-spaces.component.html',
  styles: [
    `
      .sp-icon { width: 36px; height: 36px; border-radius: 10px; display: grid; place-items: center; background: var(--primary-soft); color: var(--primary); flex-shrink: 0; }
      .status-btn { border: 0; background: none; padding: 0; cursor: pointer; border-radius: 999px; }
      .del:hover:not(:disabled) { background: var(--danger-soft); color: var(--danger); }
      .toggle-row { align-items: flex-start; padding: .85rem 1rem; border-radius: var(--r); border: 1px solid var(--border); background: var(--bg-elev); }
      .toggle-row div { display: flex; flex-direction: column; line-height: 1.35; }
      .toggle-row b { color: var(--text); font-size: .9rem; }
    `,
  ],
})
export class AdminSpacesComponent implements OnInit {
  private readonly api = inject(SpaceService);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(FormBuilder);
  private readonly confirm = inject(ConfirmService);

  readonly spaces = signal<Space[]>([]);
  readonly loading = signal(true);
  /** null = modal fermé ; 'new' = création ; Space = édition */
  readonly editing = signal<Space | 'new' | null>(null);

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    location: [''],
    description: [''],
    planWidth: [800, [Validators.required, Validators.min(300), Validators.max(2000)]],
    planHeight: [500, [Validators.required, Validators.min(200), Validators.max(1500)]],
    isActive: [true],
  });

  ngOnInit() {
    this.load();
  }

  openNew() {
    this.form.reset({ name: '', location: '', description: '', planWidth: 800, planHeight: 500, isActive: true });
    this.editing.set('new');
  }

  openEdit(s: Space) {
    this.form.reset({
      name: s.name,
      location: s.location ?? '',
      description: s.description ?? '',
      planWidth: s.planWidth,
      planHeight: s.planHeight,
      isActive: s.isActive,
    });
    this.editing.set(s);
  }

  close() {
    this.editing.set(null);
  }

  save() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const payload = {
      ...v,
      location: v.location || undefined,
      description: v.description || undefined,
    };
    const target = this.editing();
    const req = target && target !== 'new' ? this.api.update(target.id, payload) : this.api.create(payload);
    req.subscribe({
      next: () => {
        this.toast.success(target === 'new' ? 'Espace créé.' : 'Espace modifié.');
        this.close();
        this.load();
      },
      error: (e) => this.toast.fromError(e),
    });
  }

  toggle(s: Space) {
    this.api.update(s.id, { isActive: !s.isActive }).subscribe({
      next: () => this.load(),
      error: (e) => this.toast.fromError(e),
    });
  }

  async remove(s: Space) {
    const ok = await this.confirm.ask({
      title: `Supprimer « ${s.name} » ?`,
      message: 'Ses places et toutes leurs réservations seront définitivement supprimées.',
      confirmText: 'Supprimer',
      danger: true,
    });
    if (!ok) return;
    this.api.remove(s.id).subscribe({
      next: () => {
        this.toast.success('Espace supprimé.');
        this.load();
      },
      error: (e) => this.toast.fromError(e),
    });
  }

  private load() {
    this.api.list().subscribe({
      next: (l) => {
        this.spaces.set(l);
        this.loading.set(false);
      },
      error: (e) => {
        this.toast.fromError(e);
        this.loading.set(false);
      },
    });
  }
}
