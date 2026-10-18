import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { Role, User } from '../../../core/models/user.model';
import { AdminService } from '../../../core/services/admin.service';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { LoadingSpinnerComponent } from '../../../shared/loading-spinner/loading-spinner.component';

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [DatePipe, LoadingSpinnerComponent],
  templateUrl: './admin-users.component.html',
})
export class AdminUsersComponent implements OnInit {
  private readonly api = inject(AdminService);
  private readonly toast = inject(ToastService);
  readonly me = inject(AuthService).currentUser;

  readonly users = signal<User[]>([]);
  readonly loading = signal(true);

  ngOnInit() {
    this.load();
  }

  setRole(u: User, ev: Event) {
    const role = (ev.target as HTMLSelectElement).value as Role;
    this.api.updateUser(u.id, { role }).subscribe({
      next: () => {
        this.toast.success(`Rôle de ${u.fullName} mis à jour.`);
        this.load();
      },
      error: (e) => {
        this.toast.fromError(e);
        this.load();
      },
    });
  }

  toggleActive(u: User) {
    this.api.updateUser(u.id, { isActive: !u.isActive }).subscribe({
      next: () => this.load(),
      error: (e) => this.toast.fromError(e),
    });
  }

  remove(u: User) {
    if (!confirm(`Supprimer ${u.fullName} et toutes ses réservations ?`)) return;
    this.api.removeUser(u.id).subscribe({
      next: () => {
        this.toast.success('Utilisateur supprimé.');
        this.load();
      },
      error: (e) => this.toast.fromError(e),
    });
  }

  private load() {
    this.api.users().subscribe({
      next: (l) => {
        this.users.set(l);
        this.loading.set(false);
      },
      error: (e) => {
        this.toast.fromError(e);
        this.loading.set(false);
      },
    });
  }
}
