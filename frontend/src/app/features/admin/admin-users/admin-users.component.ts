import { DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Role, User } from '../../../core/models/user.model';
import { AdminService } from '../../../core/services/admin.service';
import { AuthService } from '../../../core/services/auth.service';
import { ConfirmService } from '../../../core/services/confirm.service';
import { ToastService } from '../../../core/services/toast.service';
import { AvatarComponent } from '../../../shared/avatar/avatar.component';
import { IconComponent } from '../../../shared/icon/icon.component';

type UserFilter = 'all' | 'members' | 'admins' | 'inactive';

const FILTERS: Record<UserFilter, (u: User) => boolean> = {
  all: () => true,
  members: (u) => u.role === 'USER',
  admins: (u) => u.role === 'ADMIN',
  inactive: (u) => !u.isActive,
};

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [DatePipe, ReactiveFormsModule, RouterLink, IconComponent, AvatarComponent],
  templateUrl: './admin-users.component.html',
  styles: [
    `
      .toolbar { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: .75rem; margin-bottom: 1rem; }
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
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);
  readonly me = this.auth.currentUser;

  readonly users = signal<User[]>([]);
  readonly loading = signal(true);
  readonly query = signal('');
  readonly filter = signal<UserFilter>('all');

  /** null : modale fermée */
  readonly editing = signal<User | 'new' | null>(null);
  readonly saving = signal(false);
  readonly formError = signal<string | null>(null);

  readonly form = inject(FormBuilder).nonNullable.group({
    fullName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(80)]],
    email: ['', [Validators.required, Validators.email]],
    role: ['USER' as Role],
  });

  readonly filters: { key: UserFilter; label: string }[] = [
    { key: 'all', label: 'Tous' },
    { key: 'members', label: 'Membres' },
    { key: 'admins', label: 'Admins' },
    { key: 'inactive', label: 'Désactivés' },
  ];

  readonly filtered = computed(() => {
    const q = this.query().trim().toLowerCase();
    return this.users()
      .filter(FILTERS[this.filter()])
      .filter((u) => !q || `${u.fullName} ${u.email}`.toLowerCase().includes(q));
  });

  ngOnInit() {
    this.load();
  }

  count(key: UserFilter) {
    return this.users().filter(FILTERS[key]).length;
  }

  openNew() {
    this.form.reset({ fullName: '', email: '', role: 'USER' });
    this.formError.set(null);
    this.editing.set('new');
  }

  openEdit(u: User) {
    this.form.reset({ fullName: u.fullName, email: u.email, role: u.role });
    this.formError.set(null);
    this.editing.set(u);
  }

  closeForm() {
    if (!this.saving()) this.editing.set(null);
  }

  save() {
    const target = this.editing();
    if (this.form.invalid || target === null) {
      this.form.markAllAsTouched();
      return;
    }
    const { fullName, email, role } = this.form.getRawValue();
    this.saving.set(true);
    this.formError.set(null);

    const fail = (e: unknown) => {
      this.saving.set(false);
      this.formError.set(this.toast.message(e, 'Enregistrement impossible.'));
    };
    const done = () => {
      this.saving.set(false);
      this.editing.set(null);
      this.load();
    };

    if (target === 'new') {
      this.api.createUser({ fullName, email, role }).subscribe({
        next: ({ emailSent }) => {
          if (emailSent) this.toast.success(`Compte créé. Invitation envoyée à ${email}.`);
          else this.toast.error("Compte créé, mais l'invitation n'a pas pu être envoyée. Vérifiez la configuration SMTP.");
          done();
        },
        error: fail,
      });
    } else {
      this.api.updateUser(target.id, { fullName, email }).subscribe({
        next: () => {
          this.toast.success('Utilisateur mis à jour.');
          if (target.id === this.me()?.id) this.auth.refresh();
          done();
        },
        error: fail,
      });
    }
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

  async sendReset(u: User) {
    const ok = await this.confirm.ask({
      title: `Envoyer un lien à ${u.fullName} ?`,
      message: `Un lien de réinitialisation du mot de passe, valable 1 heure, sera envoyé à ${u.email}. Tout lien envoyé précédemment ne fonctionnera plus.`,
      confirmText: 'Envoyer',
    });
    if (!ok) return;
    this.api.sendPasswordReset(u.id).subscribe({
      next: ({ emailSent }) => {
        if (emailSent) this.toast.success(`Lien envoyé à ${u.email}.`);
        else this.toast.error("Le lien n'a pas pu être envoyé. Vérifiez la configuration SMTP.");
      },
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
