import { Injectable, signal } from '@angular/core';

export type Theme = 'light' | 'dark';
const THEME_KEY = 'cw_theme';

/** Thème clair / sombre. La valeur initiale est posée par le script de index.html. */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly theme = signal<Theme>(
    document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light',
  );

  toggle(): void {
    this.set(this.theme() === 'dark' ? 'light' : 'dark');
  }

  set(t: Theme): void {
    this.theme.set(t);
    document.documentElement.setAttribute('data-theme', t);
    try {
      localStorage.setItem(THEME_KEY, t);
    } catch {
      /* stockage indisponible : le thème reste valable pour la session */
    }
  }
}
