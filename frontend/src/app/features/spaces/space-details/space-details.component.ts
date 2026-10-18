import { Component, OnInit, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Space } from '../../../core/models/space.model';
import { SpaceService } from '../../../core/services/space.service';
import { ToastService } from '../../../core/services/toast.service';
import { LoadingSpinnerComponent } from '../../../shared/loading-spinner/loading-spinner.component';

@Component({
  selector: 'app-space-details',
  standalone: true,
  imports: [RouterLink, LoadingSpinnerComponent],
  templateUrl: './space-details.component.html',
})
export class SpaceDetailsComponent implements OnInit {
  private readonly spaces = inject(SpaceService);
  private readonly toast = inject(ToastService);

  /** Lié au paramètre :id de la route (withComponentInputBinding) */
  readonly id = input.required<string>();

  readonly space = signal<Space | null>(null);
  readonly loading = signal(true);

  ngOnInit() {
    this.spaces.get(Number(this.id())).subscribe({
      next: (s) => {
        this.space.set(s);
        this.loading.set(false);
      },
      error: (e) => {
        this.toast.fromError(e, 'Espace introuvable.');
        this.loading.set(false);
      },
    });
  }
}
