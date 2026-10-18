import { Routes } from '@angular/router';
import { adminGuard } from './core/guards/admin.guard';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'spaces' },

  // --- Public ---
  {
    path: 'login',
    title: 'Connexion',
    loadComponent: () => import('./features/auth/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'register',
    title: 'Inscription',
    loadComponent: () =>
      import('./features/auth/register/register.component').then((m) => m.RegisterComponent),
  },

  // --- Utilisateur connecté ---
  {
    path: 'spaces',
    title: 'Espaces',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/spaces/space-list/space-list.component').then((m) => m.SpaceListComponent),
  },
  {
    path: 'spaces/:id',
    title: "Détails de l'espace",
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/spaces/space-details/space-details.component').then(
        (m) => m.SpaceDetailsComponent,
      ),
  },
  {
    path: 'spaces/:id/book',
    title: 'Réserver une place',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/reservations/seat-map/seat-map.component').then((m) => m.SeatMapComponent),
  },
  {
    path: 'my-reservations',
    title: 'Mes réservations',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/reservations/my-reservations/my-reservations.component').then(
        (m) => m.MyReservationsComponent,
      ),
  },

  // --- Espace administrateur (chargé uniquement pour les admins) ---
  {
    path: 'admin',
    canActivate: [authGuard, adminGuard],
    loadComponent: () =>
      import('./features/admin/admin-layout/admin-layout.component').then(
        (m) => m.AdminLayoutComponent,
      ),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      {
        path: 'dashboard',
        title: 'Admin — Tableau de bord',
        loadComponent: () =>
          import('./features/admin/admin-dashboard/admin-dashboard.component').then(
            (m) => m.AdminDashboardComponent,
          ),
      },
      {
        path: 'spaces',
        title: 'Admin — Espaces',
        loadComponent: () =>
          import('./features/admin/admin-spaces/admin-spaces.component').then(
            (m) => m.AdminSpacesComponent,
          ),
      },
      {
        path: 'seats',
        title: 'Admin — Plan des places',
        loadComponent: () =>
          import('./features/admin/admin-seat-editor/admin-seat-editor.component').then(
            (m) => m.AdminSeatEditorComponent,
          ),
      },
      {
        path: 'seats/:spaceId',
        title: 'Admin — Plan des places',
        loadComponent: () =>
          import('./features/admin/admin-seat-editor/admin-seat-editor.component').then(
            (m) => m.AdminSeatEditorComponent,
          ),
      },
      {
        path: 'reservations',
        title: 'Admin — Réservations',
        loadComponent: () =>
          import('./features/admin/admin-reservations/admin-reservations.component').then(
            (m) => m.AdminReservationsComponent,
          ),
      },
      {
        path: 'users',
        title: 'Admin — Utilisateurs',
        loadComponent: () =>
          import('./features/admin/admin-users/admin-users.component').then(
            (m) => m.AdminUsersComponent,
          ),
      },
    ],
  },

  { path: '**', redirectTo: 'spaces' },
];
