import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="admin-shell">
      <aside class="side">
        <div class="side-title">Administration</div>
        <a routerLink="dashboard" routerLinkActive="active">📊 Tableau de bord</a>
        <a routerLink="spaces" routerLinkActive="active">🏢 Espaces</a>
        <a routerLink="seats" routerLinkActive="active">🪑 Plan des places</a>
        <a routerLink="reservations" routerLinkActive="active">📅 Réservations</a>
        <a routerLink="users" routerLinkActive="active">👥 Utilisateurs</a>
      </aside>
      <section class="content"><router-outlet /></section>
    </div>
  `,
  styles: [
    `
      .admin-shell { display: grid; grid-template-columns: 230px minmax(0, 1fr); max-width: 1400px; margin: 0 auto; min-height: calc(100vh - 130px); }
      .side { background: #fff; border-right: 1px solid var(--gray-200); padding: 1.25rem .75rem; display: flex; flex-direction: column; gap: .25rem; }
      .side-title { font-size: .72rem; text-transform: uppercase; letter-spacing: .08em; color: var(--gray-500); font-weight: 800; padding: 0 .75rem .5rem; }
      .side a { padding: .55rem .75rem; border-radius: 8px; color: var(--gray-700); font-weight: 600; font-size: .92rem; text-decoration: none !important; }
      .side a:hover { background: var(--gray-100); }
      .side a.active { background: var(--blue-50); color: var(--blue-dark); box-shadow: inset 3px 0 0 var(--blue); }
      .content { min-width: 0; }
      @media (max-width: 860px) {
        .admin-shell { grid-template-columns: 1fr; }
        .side { flex-direction: row; flex-wrap: wrap; border-right: 0; border-bottom: 1px solid var(--gray-200); }
        .side-title { display: none; }
      }
    `,
  ],
})
export class AdminLayoutComponent {}
