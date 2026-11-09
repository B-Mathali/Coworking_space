import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AuthService, TOKEN_KEY } from '../services/auth.service';

/** Ajoute le JWT à chaque requête ; déconnecte si le serveur répond 401 (token expiré, compte désactivé). */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  // inject() n'est utilisable qu'ici : plus du tout dans le catchError, exécuté plus tard.
  const auth = inject(AuthService);
  const token = localStorage.getItem(TOKEN_KEY);
  const authReq = token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;

  return next(authReq).pipe(
    catchError((err: unknown) => {
      const isAuthCall = req.url.includes('/auth/login') || req.url.includes('/auth/register');
      if (err instanceof HttpErrorResponse && err.status === 401 && !isAuthCall) {
        auth.logout();
      }
      return throwError(() => err);
    }),
  );
};
