import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, signal } from '@angular/core';

export interface Toast {
  id: number;
  text: string;
  type: 'success' | 'error';
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private nextId = 1;
  readonly toasts = signal<Toast[]>([]);

  success(text: string) {
    this.push(text, 'success');
  }

  error(text: string) {
    this.push(text, 'error');
  }

  /** Extrait le message renvoyé par l'API (filtre d'exceptions NestJS). */
  fromError(err: unknown, fallback = 'Une erreur est survenue.') {
    this.error(this.message(err, fallback));
  }

  message(err: unknown, fallback = 'Une erreur est survenue.'): string {
    if (err instanceof HttpErrorResponse) {
      const m = err.error?.message;
      if (Array.isArray(m)) return m.join(' · ');
      if (typeof m === 'string') return m;
      if (err.status === 0) return 'Serveur injoignable.';
    }
    return fallback;
  }

  dismiss(id: number) {
    this.toasts.update((t) => t.filter((x) => x.id !== id));
  }

  private push(text: string, type: Toast['type']) {
    const id = this.nextId++;
    this.toasts.update((t) => [...t, { id, text, type }]);
    setTimeout(() => this.dismiss(id), 4500);
  }
}
