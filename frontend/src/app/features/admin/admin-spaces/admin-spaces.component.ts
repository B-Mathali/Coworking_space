import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Space } from '../../../core/models/space.model';
import { SpaceService } from '../../../core/services/space.service';
import { ToastService } from '../../../core/services/toast.service';
import { LoadingSpinnerComponent } from '../../../shared/loading-spinner/loading-spinner.component';

@Component({
  selector: 'app-admin-spaces',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, LoadingSpinnerComponent],
  templateUrl: './admin-spaces.component.html',
})
export class AdminSpacesComponent implements OnInit {
  private readonly api = inject(SpaceService);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(FormBuilder);

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

  remove(s: Space) {
    if (!confirm(`Supprimer « ${s.name} » ? Ses places et leurs réservations seront supprimées.`)) return;
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
