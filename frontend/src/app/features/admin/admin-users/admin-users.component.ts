import { DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Role, User } from '../../../core/models/user.model';
import { AdminService } from '../../../core/services/admin.service';
import { AuthService } from '../../../core/services/auth.service';
import { ConfirmService } from '../../../core/services/confirm.service';
import { ToastService } from '../../../core/services/toast.service';
import { AvatarComponent } from '../../../shared/avatar/avatar.component';
import { IconComponent } from '../../../shared/icon/icon.component';

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [DatePipe, IconComponent, AvatarComponent],
  templateUrl: './admin-users.component.html',
  styles: [
    `
      .search { width: 280px; max-width: 100%; }
      .role-select { width: 118px; height: 32px; font-size: .82rem; font-weight: 650; border-radius: 999px; padding-left: .8rem; }
      .role-select.admin { background-color: var(--accent-soft); color: var(--accent-ink); border-color: transparent; }
      tr.inactive .user-cell { opacity: .55; }
      .del:hover:not(:disabled) { background: var(--danger-soft); color: var(--danger); }
    `,
  ],
})
export class AdminUsersComponent implements OnInit {
  private readonly api = inject(AdminService);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);
  readonly me = inject(AuthService).currentUser;

  readonly users = signal<User[]>([]);
  readonly loading = signal(true);
  readonly query = signal('');

  readonly filtered = computed(() => {
    const q = this.query().trim().toLowerCase();
    if (!q) return this.users();
    return this.users().filter((u) => `${u.fullName} ${u.email}`.toLowerCase().includes(q));
  });

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

  async remove(u: User) {
    const ok = await this.confirm.ask({
      title: `Supprimer ${u.fullName} ?`,
      message: 'Le compte et toutes ses réservations seront définitivement supprimés.',
      confirmText: 'Supprimer',
      danger: true,
    });
    if (!ok) return;
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
