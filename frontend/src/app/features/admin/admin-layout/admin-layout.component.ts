import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { IconComponent } from '../../../shared/icon/icon.component';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, IconComponent],
  template: `
    <div class="admin-shell">
      <aside class="side">
        <div class="side-head">
          <span class="side-badge"><app-icon name="shield" [size]="16" /></span>
          <div>
            <b>Administration</b>
            <span>Gestion du coworking</span>
          </div>
        </div>
        <nav class="side-nav">
          <span class="side-title">Vue d'ensemble</span>
          <a routerLink="dashboard" routerLinkActive="active"><app-icon name="dashboard" [size]="18" /> Tableau de bord</a>
          <span class="side-title">Gestion</span>
          <a routerLink="spaces" routerLinkActive="active"><app-icon name="building" [size]="18" /> Espaces</a>
          <a routerLink="seats" routerLinkActive="active"><app-icon name="grid" [size]="18" /> Plan des places</a>
          <a routerLink="reservations" routerLinkActive="active"><app-icon name="calendar" [size]="18" /> Réservations</a>
          <a routerLink="users" routerLinkActive="active"><app-icon name="users" [size]="18" /> Utilisateurs</a>
        </nav>
      </aside>
      <section class="content"><router-outlet /></section>
    </div>
  `,
  styles: [
    `
      .admin-shell { display: grid; grid-template-columns: 252px minmax(0, 1fr); max-width: 1480px; margin: 0 auto; min-height: calc(100vh - var(--nav-h) - 60px); }
      .side { position: sticky; top: var(--nav-h); align-self: start; height: calc(100vh - var(--nav-h)); padding: 1.5rem 1rem; border-right: 1px solid var(--border); display: flex; flex-direction: column; gap: 1.25rem; }
      .side-head { display: flex; align-items: center; gap: .7rem; padding: 0 .5rem; }
      .side-head div { display: flex; flex-direction: column; line-height: 1.25; }
      .side-head b { font-size: .92rem; }
      .side-head span:not(.side-badge) { font-size: .75rem; color: var(--text-3); }
      .side-badge { width: 34px; height: 34px; border-radius: 10px; display: grid; place-items: center; background: var(--accent-soft); color: var(--accent); }
      .side-nav { display: flex; flex-direction: column; gap: .15rem; }
      .side-title { font-size: .68rem; text-transform: uppercase; letter-spacing: .09em; color: var(--text-3); font-weight: 750; padding: .9rem .75rem .35rem; }
      .side-title:first-child { padding-top: 0; }
      .side a {
        display: flex; align-items: center; gap: .7rem; height: 40px; padding: 0 .75rem; border-radius: 10px;
        color: var(--text-2); font-weight: 600; font-size: .9rem; text-decoration: none !important; transition: background .15s, color .15s;
      }
      .side a app-icon { color: var(--text-3); transition: color .15s; }
      .side a:hover { background: var(--surface-2); color: var(--text); }
      .side a.active { background: var(--surface); color: var(--text); box-shadow: var(--shadow-sm), inset 0 0 0 1px var(--border); }
      .side a.active app-icon { color: var(--primary); }
      .content { min-width: 0; }
      @media (max-width: 920px) {
        .admin-shell { grid-template-columns: 1fr; }
        .side { position: sticky; top: var(--nav-h); z-index: 10; height: auto; padding: .6rem 1rem; border-right: 0; border-bottom: 1px solid var(--border); background: var(--bg); }
        .side-head, .side-title { display: none; }
        .side-nav { flex-direction: row; overflow-x: auto; scrollbar-width: none; }
        .side a { flex-shrink: 0; height: 36px; font-size: .85rem; }
      }
    `,
  ],
})
export class AdminLayoutComponent {}
