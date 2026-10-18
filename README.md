# CoworkSpace — Réservation de places de coworking

Angular 18 (standalone) · NestJS 10 · MySQL / MariaDB (XAMPP) via TypeORM · JWT

## Fonctionnement

- **Utilisateur** : choisit un espace, sélectionne un créneau, clique sur une place libre du plan, confirme. Le plan se rafraîchit toutes les 15 s.
- **Administrateur** (`/admin`) : tableau de bord, gestion des espaces, éditeur de plan (ajout, glisser-déposer, désactivation, suppression des places), toutes les réservations (filtres + annulation), gestion des utilisateurs (rôle, activation, suppression).
- Un compte admin est créé automatiquement au premier démarrage du backend (identifiants dans `backend/.env`).

## Lancer en local

### 1. Base de données (XAMPP)

1. Ouvrir le **XAMPP Control Panel** et cliquer sur **Start** à côté de **MySQL**.
2. Cliquer sur **Admin** (à côté de MySQL) : phpMyAdmin s'ouvre dans le navigateur.
3. Cliquer sur **Nouvelle base de données**, nom `coworking`, interclassement `utf8mb4_general_ci`, puis **Créer**.

Les tables sont créées automatiquement par le backend (aucun SQL à écrire).
Par défaut XAMPP : utilisateur `root`, sans mot de passe, port `3306` (déjà réglé dans `backend/.env`).

### 2. Backend (port 3000)

```bash
cd backend
npm install
npm run start:dev
```

- API : http://localhost:3000/api
- Swagger : http://localhost:3000/api/docs
- Admin par défaut : `admin@coworking.tn` / `Admin@12345` (à changer dans `.env` avant la mise en production)

### 3. Frontend (port 4200)

```bash
cd frontend
npm install
npm start
```

Ouvrir http://localhost:4200

### Premier parcours

1. Connectez-vous en admin → **Espaces** → « Nouvel espace ».
2. **Plan des places** → générez une grille (ex. 3 × 5) ou cliquez sur le plan en mode ajout ; glissez pour repositionner.
3. Créez un compte utilisateur normal, ouvrez l'espace, choisissez un créneau et cliquez sur une place.

## Tests

```bash
cd backend
npm run test:e2e     # nécessite MySQL démarré et la base "coworking" créée
```

## Structure

```
backend/src
├── auth/          JWT, guards (JwtAuthGuard, RolesGuard), @Roles, @CurrentUser
├── users/         entité User, service, seed du compte admin
├── spaces/        salles (CRUD, admin pour écrire)
├── seats/         places + plan avec statut calculé par créneau
├── reservations/  création transactionnelle (verrou + anti-chevauchement)
├── admin/         stats, utilisateurs, réservations (ADMIN uniquement)
└── common/        filtre d'erreurs, exceptions métier

frontend/src/app
├── core/          services, intercepteur JWT, guards, modèles
├── shared/        navbar, footer, spinner
└── features/      auth, spaces, reservations (seat-map…), admin (layout, dashboard, spaces, seat-editor, reservations, users)
```

## Docker (plus tard)

`backend/Dockerfile` et `frontend/Dockerfile` (build multi-stage → Nginx) sont prêts.
Le Nginx du frontend redirige `/api` vers un service nommé `backend:3000`.
