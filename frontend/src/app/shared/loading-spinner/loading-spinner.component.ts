import { Component } from '@angular/core';

@Component({
  selector: 'app-loading-spinner',
  standalone: true,
  template: `<div class="wrap"><div class="spin"></div></div>`,
  styles: [
    `
      .wrap { display: flex; justify-content: center; padding: 3rem; }
      .spin { width: 38px; height: 38px; border: 4px solid var(--blue-100); border-top-color: var(--blue); border-radius: 50%; animation: r .8s linear infinite; }
      @keyframes r { to { transform: rotate(360deg); } }
    `,
  ],
})
export class LoadingSpinnerComponent {}
