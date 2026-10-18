import { Component } from '@angular/core';

@Component({
  selector: 'app-footer',
  standalone: true,
  template: `
    <footer>
      <div class="inner">
        <span><b>CoworkSpace</b> · Réservez votre place en quelques secondes.</span>
        <span>© {{ year }} — Projet Cloud TEK-UP</span>
      </div>
    </footer>
  `,
  styles: [
    `
      footer { border-top: 1px solid var(--border); font-size: .82rem; color: var(--text-3); }
      .inner { max-width: 1240px; margin: 0 auto; padding: 1.25rem 1.5rem; display: flex; justify-content: space-between; gap: .5rem 1rem; flex-wrap: wrap; }
      b { color: var(--text-2); }
    `,
  ],
})
export class FooterComponent {
  readonly year = new Date().getFullYear();
}
