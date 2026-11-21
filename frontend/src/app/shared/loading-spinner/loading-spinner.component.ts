import { Component } from '@angular/core';

@Component({
  selector: 'app-loading-spinner',
  standalone: true,
  template: `<div class="wrap" role="status" aria-label="Chargement"><div class="spin"></div></div>`,
  styles: [
    `
      .wrap { display: flex; justify-content: center; padding: 4rem 1rem; }
      .spin { width: 34px; height: 34px; border-radius: 50%; border: 3px solid var(--surface-3); border-top-color: var(--primary); animation: r .7s linear infinite; }
      @keyframes r { to { transform: rotate(360deg); } }
    `,
  ],
})
export class LoadingSpinnerComponent {}
