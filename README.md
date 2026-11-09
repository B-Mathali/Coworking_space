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

## Paiement en ligne (Stripe) et factures PDF

- L'admin fixe un **tarif horaire HT** par espace (0 = gratuit, réservation confirmée immédiatement).
- Sur un espace payant, la réservation passe en **« en attente de paiement »** : la place est bloquée 30 min
  et l'utilisateur est redirigé vers **Stripe Checkout**. Total = heures × tarif + TVA (19 % par défaut).
- Au retour, le backend vérifie la session auprès de Stripe puis confirme la réservation et attribue un
  numéro de facture (`FAC-2026-000042`). La **facture PDF** se télécharge depuis « Mes réservations »,
  la page de confirmation ou la liste admin des réservations.
- Délai dépassé ou paiement abandonné : la place est libérée automatiquement.
- Annulation d'une réservation payée : **remboursement Stripe intégral** (l'utilisateur peut annuler jusqu'au début du créneau, l'admin à tout moment).

### Configuration

1. Créer un compte Stripe, passer en **mode test** et copier la clé secrète (`sk_test_…`).
2. Dans `backend/.env` (voir `backend/.env.example`) : `STRIPE_SECRET_KEY=sk_test_…`
   et éventuellement `PAYMENT_CURRENCY`, `VAT_RATE` et les infos société (`COMPANY_*`) imprimées sur la facture.
3. Carte de test : `4242 4242 4242 4242`, date future quelconque, CVC quelconque.

Webhook (optionnel en local, recommandé en production : confirme le paiement même si l'utilisateur ferme l'onglet) :

```bash
stripe listen --forward-to localhost:3000/api/payments/webhook
# copier le secret whsec_… affiché dans STRIPE_WEBHOOK_SECRET
```

En production, déclarer l'URL `https://<domaine>/api/payments/webhook` dans le tableau de bord Stripe avec les
événements `checkout.session.completed`, `checkout.session.async_payment_succeeded` et `checkout.session.expired`.

## Comptes et notifications

- **Mot de passe oublié** : lien « Mot de passe oublié ? » sur la page de connexion. Le lien reçu par email est valable 1 h et ne fonctionne qu'une fois. La réponse ne révèle jamais si un email est inscrit, et changer son mot de passe ferme les sessions déjà ouvertes.
- **Gestion des utilisateurs** (admin) : création d'un compte par invitation (l'utilisateur choisit son mot de passe, lien valable 3 jours), modification du nom et de l'email, rôle, activation, envoi d'un lien de réinitialisation, filtres et accès aux réservations de chaque utilisateur.
- **Notifications de réservation** : cloche dans la barre de navigation (actualisée toutes les 30 s) et email pour une réservation confirmée, annulée, remboursée ou expirée, plus un rappel 1 h avant le début. Les admins voient les nouvelles réservations et les annulations dans la cloche uniquement.

### Configuration des emails

Renseigner `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD` et `MAIL_FROM` dans `backend/.env`.

Sans `SMTP_HOST`, aucun email ne part : en développement, leur contenu (liens de réinitialisation compris) s'affiche dans la console du backend. Avec `NODE_ENV=production`, ce contenu n'est jamais écrit dans les journaux.

## Tests

Les tests écrivent dans la base configurée : utilisez une base dédiée, créée au préalable.

```bash
cd backend
DB_NAME=coworking_test npm run test:e2e     # nécessite MySQL démarré
```

## Structure

```
backend/src
├── auth/          JWT, guards (JwtAuthGuard, RolesGuard), @Roles, @CurrentUser
├── users/         entité User, service, seed du compte admin
├── spaces/        salles (CRUD, admin pour écrire)
├── seats/         places + plan avec statut calculé par créneau
├── reservations/  création transactionnelle (verrou + anti-chevauchement)
├── payments/      Stripe Checkout, webhook, remboursements, factures PDF (pdfkit)
├── notifications/ cloche in-app, emails et rappels de réservation
├── mail/          envoi d'emails (SMTP via nodemailer)
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
