import { DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AdminStats } from '../../../core/models/reservation.model';
import { AdminService } from '../../../core/services/admin.service';
import { ToastService } from '../../../core/services/toast.service';
import { LoadingSpinnerComponent } from '../../../shared/loading-spinner/loading-spinner.component';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [RouterLink, DatePipe, LoadingSpinnerComponent],
  templateUrl: './admin-dashboard.component.html',
})
export class AdminDashboardComponent implements OnInit {
  private readonly api = inject(AdminService);
  private readonly toast = inject(ToastService);

  readonly stats = signal<AdminStats | null>(null);
  readonly maxDay = computed(() => Math.max(1, ...(this.stats()?.last7Days.map((d) => d.count) ?? [1])));

  ngOnInit() {
    this.api.stats().subscribe({
      next: (s) => this.stats.set(s),
      error: (e) => this.toast.fromError(e, 'Impossible de charger les statistiques.'),
    });
  }

  height(count: number): number {
    return Math.max(4, Math.round((count / this.maxDay()) * 100));
  }
}
