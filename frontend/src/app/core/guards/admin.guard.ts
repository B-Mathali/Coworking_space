import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/** Confort d'interface uniquement : la vraie protection est le RolesGuard côté NestJS. */
export const adminGuard: CanActivateFn = () => {
  if (inject(AuthService).isAdmin()) return true;
  return inject(Router).createUrlTree(['/spaces']);
};
