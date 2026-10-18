import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthResponse, LoginPayload, RegisterPayload, User } from '../models/user.model';

export const TOKEN_KEY = 'cw_token';
const USER_KEY = 'cw_user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly api = `${environment.apiUrl}/auth`;

  private readonly _user = signal<User | null>(this.readStoredUser());

  readonly currentUser = this._user.asReadonly();
  readonly isLoggedIn = computed(() => this._user() !== null);
  readonly isAdmin = computed(() => this._user()?.role === 'ADMIN');

  get token(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  login(payload: LoginPayload): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.api}/login`, payload).pipe(tap((r) => this.store(r)));
  }

  register(payload: RegisterPayload): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.api}/register`, payload).pipe(tap((r) => this.store(r)));
  }

  /** Resynchronise le rôle/statut avec le serveur (ex. un admin a changé mon rôle). */
  refresh(): void {
    if (!this.token) return;
    this.http.get<User>(`${this.api}/me`).subscribe({
      next: (u) => {
        this._user.set(u);
        localStorage.setItem(USER_KEY, JSON.stringify(u));
      },
      error: () => undefined, // 401 géré par l'intercepteur
    });
  }

  logout(redirect = true): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    this._user.set(null);
    if (redirect) this.router.navigate(['/login']);
  }

  private store(r: AuthResponse): void {
    localStorage.setItem(TOKEN_KEY, r.accessToken);
    localStorage.setItem(USER_KEY, JSON.stringify(r.user));
    this._user.set(r.user);
  }

  private readStoredUser(): User | null {
    try {
      const raw = localStorage.getItem(USER_KEY);
      return raw && localStorage.getItem(TOKEN_KEY) ? (JSON.parse(raw) as User) : null;
    } catch {
      return null;
    }
  }
}
