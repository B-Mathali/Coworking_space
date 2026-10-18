import { Component } from '@angular/core';

@Component({
  selector: 'app-footer',
  standalone: true,
  template: `<footer>© {{ year }} CoworkSpace — Projet Cloud TEK-UP</footer>`,
  styles: [
    `
      footer { text-align: center; padding: 1.25rem; font-size: .82rem; color: var(--gray-500); border-top: 1px solid var(--gray-200); background: #fff; }
    `,
  ],
})
export class FooterComponent {
  readonly year = new Date().getFullYear();
}
