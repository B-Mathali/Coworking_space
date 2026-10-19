
import {
  Component,
  OnInit,
  OnDestroy,
  inject,
  signal,
} from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { RouterLink } from '@angular/router';

import { Space } from '../../../core/models/space.model';
import { SpaceService } from '../../../core/services/space.service';
import { ToastService } from '../../../core/services/toast.service';
import { LoadingSpinnerComponent } from '../../../shared/loading-spinner/loading-spinner.component';

@Component({
  selector: 'app-admin-spaces',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    LoadingSpinnerComponent,
  ],
  templateUrl: './admin-spaces.component.html',
})
export class AdminSpacesComponent implements OnInit, OnDestroy {
  readonly api = inject(SpaceService);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(FormBuilder);

  readonly spaces = signal<Space[]>([]);
  readonly loading = signal(true);
  readonly saving = signal(false);

  /** null = modal fermé ; 'new' = création ; Space = édition */
  readonly editing = signal<Space | 'new' | null>(null);

  selectedImage: File | null = null;

  readonly imagePreview = signal<string | null>(null);
  readonly currentImageUrl = signal<string | null>(null);
  readonly imageError = signal<string | null>(null);

  private previewObjectUrl: string | null = null;

  readonly form = this.fb.nonNullable.group({
    name: [
      '',
      [
        Validators.required,
        Validators.minLength(2),
        Validators.maxLength(100),
      ],
    ],
    location: [''],
    description: [''],
    planWidth: [
      800,
      [
        Validators.required,
        Validators.min(300),
        Validators.max(2000),
      ],
    ],
    planHeight: [
      500,
      [
        Validators.required,
        Validators.min(200),
        Validators.max(1500),
      ],
    ],
    isActive: [true],
  });

  ngOnInit(): void {
    this.load();
  }

  ngOnDestroy(): void {
    this.clearImagePreview();
  }

  openNew(): void {
    this.clearSelectedImage();
    this.currentImageUrl.set(null);
    this.form.reset({
      name: '',
      location: '',
      description: '',
      planWidth: 800,
      planHeight: 500,
      isActive: true,
    });

    this.editing.set('new');
  }

  openEdit(space: Space): void {
    this.clearSelectedImage();
    this.currentImageUrl.set(space.imageUrl ?? null);
    this.form.reset({
      name: space.name,
      location: space.location ?? '',
      description: space.description ?? '',
      planWidth: space.planWidth,
      planHeight: space.planHeight,
      isActive: space.isActive,
    });

    this.editing.set(space);
  }

  close(): void {
    if (this.saving()) {
      return;
    }

    this.clearSelectedImage();
    this.editing.set(null);
    this.form.reset();
  }

  onImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    this.imageError.set(null);

    if (!file) {
      this.clearSelectedImage();
      return;
    }

    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/webp',
    ];

    if (!allowedTypes.includes(file.type)) {
      this.clearSelectedImage(input);
      this.imageError.set(
        'Format invalide. Choisissez une image JPG, PNG ou WebP.',
      );
      return;
    }

    const maxSize = 5 * 1024 * 1024;

    if (file.size > maxSize) {
      this.clearSelectedImage(input);
      this.imageError.set(
        'La taille de l’image ne doit pas dépasser 5 Mo.',
      );
      return;
    }

    this.clearImagePreview();

    this.selectedImage = file;
    this.previewObjectUrl = URL.createObjectURL(file);
    this.imagePreview.set(this.previewObjectUrl);
  }

  clearSelectedImage(input?: HTMLInputElement): void {
    this.selectedImage = null;
    this.clearImagePreview();
    this.imageError.set(null);

    if (input) {
      input.value = '';
    }
  }

  private clearImagePreview(): void {
    if (this.previewObjectUrl) {
      URL.revokeObjectURL(this.previewObjectUrl);
      this.previewObjectUrl = null;
    }

    this.imagePreview.set(null);
  }

  save(): void {
    if (this.saving()) {
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const target = this.editing();

    if (target === null) {
      return;
    }

    const value = this.form.getRawValue();
    const name = value.name.trim();

    if (name.length < 2 || name.length > 100) {
      this.form.controls.name.setErrors({ invalidLength: true });
      this.form.controls.name.markAsTouched();
      return;
    }

    const payload = {
      ...value,
      name,
      location: value.location.trim() || undefined,
      description: value.description.trim() || undefined,
    };

    this.saving.set(true);

    const request =
  target === 'new'
    ? this.api.create(this.buildFormData(payload))
    : this.selectedImage
      ? this.api.update(target.id, this.buildFormData(payload))
      : this.api.update(target.id, payload);

    request.subscribe({
      next: () => {
        this.toast.success(
          target === 'new'
            ? 'Espace créé.'
            : 'Espace modifié.',
        );

        this.saving.set(false);
        this.clearSelectedImage();
        this.editing.set(null);
        this.load();
      },
      error: (error) => {
        this.saving.set(false);
        this.toast.fromError(error);
      },
    });
  }

  private buildFormData(payload: {
    name: string;
    location: string | undefined;
    description: string | undefined;
    planWidth: number;
    planHeight: number;
    isActive: boolean;
  }): FormData {
    const data = new FormData();

    // Text fields must be sent as strings in multipart/form-data.
    data.append('name', payload.name);
    data.append('planWidth', String(payload.planWidth));
    data.append('planHeight', String(payload.planHeight));
    data.append('isActive', String(payload.isActive));

    if (payload.location) {
      data.append('location', payload.location);
    }

    if (payload.description) {
      data.append('description', payload.description);
    }

    if (this.selectedImage) {
      data.append('image', this.selectedImage, this.selectedImage.name);
    }

    return data;
  }

  toggle(space: Space): void {
    this.api.update(space.id, {
      isActive: !space.isActive,
    }).subscribe({
      next: () => {
        this.toast.success(
          space.isActive ? 'Espace fermé.' : 'Espace ouvert.',
        );
        this.load();
      },
      error: (error) => this.toast.fromError(error),
    });
  }

  remove(space: Space): void {
    if (
      !confirm(
        `Supprimer « ${space.name} » ? Ses places et leurs réservations seront supprimées.`,
      )
    ) {
      return;
    }

    this.api.remove(space.id).subscribe({
      next: () => {
        this.toast.success('Espace supprimé.');
        this.load();
      },
      error: (error) => this.toast.fromError(error),
    });
  }

  private load(): void {
    this.api.list().subscribe({
      next: (spaces) => {
        this.spaces.set(spaces);
        this.loading.set(false);
      },
      error: (error) => {
        this.toast.fromError(error);
        this.loading.set(false);
      },
    });
  }
}
