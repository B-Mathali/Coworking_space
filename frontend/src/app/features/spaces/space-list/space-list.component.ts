import { Component, OnInit, inject, signal } from '@angular/core';
import { Space } from '../../../core/models/space.model';
import { SpaceService } from '../../../core/services/space.service';
import { ToastService } from '../../../core/services/toast.service';
import { LoadingSpinnerComponent } from '../../../shared/loading-spinner/loading-spinner.component';
import { SpaceCardComponent } from '../space-card/space-card.component';

@Component({
  selector: 'app-space-list',
  standalone: true,
  imports: [SpaceCardComponent, LoadingSpinnerComponent],
  templateUrl: './space-list.component.html',
})
export class SpaceListComponent implements OnInit {
  private readonly spaces = inject(SpaceService);
  private readonly toast = inject(ToastService);

  readonly list = signal<Space[]>([]);
  readonly loading = signal(true);

  ngOnInit() {
    this.spaces.list().subscribe({
      next: (l) => {
        this.list.set(l);
        this.loading.set(false);
      },
      error: (e) => {
        this.toast.fromError(e, 'Impossible de charger les espaces.');
        this.loading.set(false);
      },
    });
  }
}
