import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { MailMessage, MailService } from '../src/mail/mail.service';
import { BookingNotificationsService } from '../src/notifications/booking-notifications.service';

/**
 * Nécessite MySQL démarré. Écrit dans la base configurée : utiliser une base dédiée.
 * Lancer : DB_NAME=coworking_test npm run test:e2e
 */
describe('Mot de passe oublié, gestion des utilisateurs, notifications (e2e)', () => {
  let app: INestApplication;
  let http: ReturnType<typeof request>;
  let db: DataSource;
  let adminToken: string;
  let spaceId: number;
  let seatId: number;

  const sent: MailMessage[] = [];
  const suffix = Date.now();
  const auth = (t: string) => ({ Authorization: `Bearer ${t}` });
  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

  /** L'envoi n'est pas attendu par la route publique : on patiente jusqu'à l'arrivée de l'email. */
  const waitForMail = async (to: string, subject: RegExp) => {
    for (let i = 0; i < 40; i++) {
      const found = sent.find((m) => m.to === to && subject.test(m.subject));
      if (found) return found;
      await sleep(25);
    }
    throw new Error(`Aucun email « ${subject} » pour ${to}`);
  };
  const tokenFrom = (m: MailMessage) => new URL(m.action!.url).searchParams.get('token')!;
  const register = async (name: string) => {
    const email = `${name}${suffix}@test.tn`;
    const res = await http.post('/api/auth/register').send({ fullName: name, email, password: 'secret123' }).expect(201);
    return { email, token: res.body.accessToken as string, id: res.body.user.id as number };
  };
  const slot = (offsetH: number, durH = 1) => {
    const s = new Date(Date.now() + offsetH * 3600_000);
    return { startTime: s.toISOString(), endTime: new Date(s.getTime() + durH * 3600_000).toISOString() };
  };
  const notifs = async (token: string) =>
    (await http.get('/api/notifications').set(auth(token)).expect(200)).body;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(MailService)
      .useValue({
        send: async (m: MailMessage) => {
          sent.push(m);
          return true;
        },
      })
      .compile();
    app = mod.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    app.useGlobalFilters(new HttpExceptionFilter());
    await app.init();
    http = request(app.getHttpServer());
    db = app.get(DataSource);

    const admin = await http
      .post('/api/auth/login')
      .send({ email: process.env.ADMIN_EMAIL ?? 'admin@coworking.tn', password: process.env.ADMIN_PASSWORD ?? 'Admin@12345' })
      .expect(201);
    adminToken = admin.body.accessToken;

    const space = await http.post('/api/spaces').set(auth(adminToken)).send({ name: `Notif ${suffix}` }).expect(201);
    spaceId = space.body.id;
    const seat = await http.post('/api/seats').set(auth(adminToken)).send({ spaceId, label: 'N1', posX: 1, posY: 1 }).expect(201);
    seatId = seat.body.id;
  });

  afterAll(async () => {
    await http.delete(`/api/spaces/${spaceId}`).set(auth(adminToken));
    await app.close();
  });

  describe('mot de passe oublié', () => {
    it('répond pareil pour un email inconnu, sans rien envoyer', async () => {
      const u = await register('known');
      const unknown = await http.post('/api/auth/forgot-password').send({ email: `nobody${suffix}@test.tn` }).expect(200);
      const known = await http.post('/api/auth/forgot-password').send({ email: u.email }).expect(200);
      expect(unknown.body).toEqual(known.body);
      await waitForMail(u.email, /Réinitialisation/);
      expect(sent.some((m) => m.to === `nobody${suffix}@test.tn`)).toBe(false);
    });

    it('change le mot de passe, une seule fois, et ferme les sessions ouvertes', async () => {
      const u = await register('reset');
      await sleep(1100); // l'émission du JWT est datée à la seconde
      await http.post('/api/auth/forgot-password').send({ email: u.email }).expect(200);
      const token = tokenFrom(await waitForMail(u.email, /Réinitialisation/));

      await http.post('/api/auth/reset-password').send({ token, password: 'nouveau123' }).expect(200);

      await http.get('/api/auth/me').set(auth(u.token)).expect(401);
      await http.post('/api/auth/login').send({ email: u.email, password: 'secret123' }).expect(401);
      const login = await http.post('/api/auth/login').send({ email: u.email, password: 'nouveau123' }).expect(201);
      await http.get('/api/auth/me').set(auth(login.body.accessToken)).expect(200);
      await http.post('/api/auth/reset-password').send({ token, password: 'encore1234' }).expect(400);
    });

    it('stocke une empreinte du jeton, jamais le jeton lui-même', async () => {
      const u = await register('hashed');
      await http.post('/api/auth/forgot-password').send({ email: u.email }).expect(200);
      const token = tokenFrom(await waitForMail(u.email, /Réinitialisation/));
      const [row] = await db.query('SELECT resetTokenHash FROM users WHERE id = ?', [u.id]);
      expect(row.resetTokenHash).toHaveLength(64);
      expect(row.resetTokenHash).not.toBe(token);
    });

    it('refuse un jeton expiré ou inventé', async () => {
      const u = await register('expired');
      await http.post('/api/auth/forgot-password').send({ email: u.email }).expect(200);
      const token = tokenFrom(await waitForMail(u.email, /Réinitialisation/));
      await db.query('UPDATE users SET resetTokenExpiresAt = ? WHERE id = ?', [new Date(Date.now() - 1000), u.id]);
      await http.post('/api/auth/reset-password').send({ token, password: 'nouveau123' }).expect(400);
      await http.post('/api/auth/reset-password').send({ token: 'a'.repeat(64), password: 'nouveau123' }).expect(400);
      await http.post('/api/auth/reset-password').send({ token: 'court', password: 'nouveau123' }).expect(400);
    });

    it("limite les envois répétés et n'envoie rien à un compte désactivé", async () => {
      const u = await register('cooldown');
      await http.post('/api/auth/forgot-password').send({ email: u.email }).expect(200);
      await waitForMail(u.email, /Réinitialisation/);
      await http.post('/api/auth/forgot-password').send({ email: u.email }).expect(200);
      await sleep(200);
      expect(sent.filter((m) => m.to === u.email)).toHaveLength(1);

      const off = await register('disabled');
      await http.patch(`/api/admin/users/${off.id}`).set(auth(adminToken)).send({ isActive: false }).expect(200);
      await http.post('/api/auth/forgot-password').send({ email: off.email }).expect(200);
      await sleep(200);
      expect(sent.some((m) => m.to === off.email)).toBe(false);
    });
  });

  describe('gestion des utilisateurs', () => {
    it('réserve les nouvelles routes aux admins', async () => {
      const u = await register('plain');
      await http.post('/api/admin/users').set(auth(u.token)).send({ fullName: 'X Y', email: `x${suffix}@test.tn` }).expect(403);
      await http.post(`/api/admin/users/${u.id}/send-password-reset`).set(auth(u.token)).expect(403);
    });

    it("crée un compte par invitation : il s'active avec le lien reçu", async () => {
      const email = `invited${suffix}@test.tn`;
      const res = await http.post('/api/admin/users').set(auth(adminToken)).send({ fullName: 'Invité', email, role: 'USER' }).expect(201);
      expect(res.body.emailSent).toBe(true);
      expect(res.body.user).not.toHaveProperty('password');

      const token = tokenFrom(await waitForMail(email, /compte/));
      await http.post('/api/auth/reset-password').send({ token, password: 'choisi123' }).expect(200);
      await http.post('/api/auth/login').send({ email, password: 'choisi123' }).expect(201);
    });

    it('refuse un email déjà utilisé et un champ mot de passe imposé par un admin', async () => {
      const u = await register('dup');
      await http.post('/api/admin/users').set(auth(adminToken)).send({ fullName: 'Dup', email: u.email }).expect(409);
      await http
        .post('/api/admin/users')
        .set(auth(adminToken))
        .send({ fullName: 'Pw', email: `pw${suffix}@test.tn`, password: 'imposé123' })
        .expect(400);
      const other = await register('dup2');
      await http.patch(`/api/admin/users/${other.id}`).set(auth(adminToken)).send({ email: u.email }).expect(409);
    });

    it("changer l'email invalide le lien envoyé à l'ancienne adresse", async () => {
      const u = await register('moved');
      await http.post(`/api/admin/users/${u.id}/send-password-reset`).set(auth(adminToken)).expect(200);
      const token = tokenFrom(await waitForMail(u.email, /Réinitialisation/));

      const newEmail = `MOVED-new${suffix}@test.tn`;
      const res = await http.patch(`/api/admin/users/${u.id}`).set(auth(adminToken)).send({ email: newEmail }).expect(200);
      expect(res.body.email).toBe(newEmail.toLowerCase());
      await http.post('/api/auth/reset-password').send({ token, password: 'nouveau123' }).expect(400);
      await http.post('/api/auth/login').send({ email: newEmail, password: 'secret123' }).expect(201);
    });

    it('la liste compte les réservations et ne divulgue aucun secret', async () => {
      const res = await http.get('/api/admin/users').set(auth(adminToken)).expect(200);
      for (const field of ['password', 'resetTokenHash', 'resetTokenExpiresAt', 'resetTokenIssuedAt', 'passwordChangedAt']) {
        expect(res.body[0]).not.toHaveProperty(field);
      }
      expect(typeof res.body[0].reservationCount).toBe('number');
    });
  });

  describe('notifications de réservation', () => {
    it("confirme à l'utilisateur et prévient les admins, puis notifie une annulation par l'admin", async () => {
      const u = await register('booker');
      const r = await http.post('/api/reservations').set(auth(u.token)).send({ seatId, ...slot(48) }).expect(201);

      const mine = await notifs(u.token);
      expect(mine.unreadCount).toBe(1);
      expect(mine.items[0]).toMatchObject({ type: 'BOOKING_CONFIRMED', reservationId: r.body.id, readAt: null });
      await waitForMail(u.email, /confirmée/);
      const adminView = await notifs(adminToken);
      expect(adminView.items.some((n: any) => n.type === 'ADMIN_BOOKING_CREATED' && n.reservationId === r.body.id)).toBe(true);

      await http.delete(`/api/admin/reservations/${r.body.id}`).set(auth(adminToken)).expect(200);
      const after = await notifs(u.token);
      expect(after.items[0].type).toBe('BOOKING_CANCELLED');
      expect(after.items[0].message).toContain('par un administrateur');
      await waitForMail(u.email, /annulée/);

      // Annuler deux fois ne renotifie pas
      await http.delete(`/api/admin/reservations/${r.body.id}`).set(auth(adminToken)).expect(200);
      expect((await notifs(u.token)).items).toHaveLength(2);
    });

    it("prévient les admins quand l'utilisateur annule lui-même", async () => {
      const u = await register('selfcancel');
      const r = await http.post('/api/reservations').set(auth(u.token)).send({ seatId, ...slot(72) }).expect(201);
      await http.delete(`/api/reservations/${r.body.id}`).set(auth(u.token)).expect(200);
      const adminView = await notifs(adminToken);
      expect(adminView.items.some((n: any) => n.type === 'ADMIN_BOOKING_CANCELLED' && n.reservationId === r.body.id)).toBe(true);
    });

    it("marque comme lu, sans pouvoir toucher aux notifications d'un autre", async () => {
      const a = await register('owner');
      const b = await register('intruder');
      await http.post('/api/reservations').set(auth(a.token)).send({ seatId, ...slot(96) }).expect(201);
      const [n] = (await notifs(a.token)).items;

      await http.patch(`/api/notifications/${n.id}/read`).set(auth(b.token)).expect(404);
      await http.patch('/api/notifications/read-all').set(auth(b.token)).expect(204);
      expect((await notifs(a.token)).unreadCount).toBe(1);

      await http.patch(`/api/notifications/${n.id}/read`).set(auth(a.token)).expect(204);
      expect((await notifs(a.token)).unreadCount).toBe(0);
      await http.get('/api/notifications').expect(401);
    });

    it("envoie le rappel une seule fois, et pas pour une réservation faite à la dernière minute", async () => {
      const notifier = app.get(BookingNotificationsService);
      const early = await register('early');
      const late = await register('late');
      const r1 = await http.post('/api/reservations').set(auth(early.token)).send({ seatId, ...slot(0.5, 0.1) }).expect(201);
      await http.post('/api/reservations').set(auth(late.token)).send({ seatId, ...slot(0.75, 0.1) }).expect(201);
      await db.query('UPDATE reservations SET createdAt = ? WHERE id = ?', [new Date(Date.now() - 86_400_000), r1.body.id]);

      await notifier.sendReminders();
      await notifier.sendReminders();

      const reminders = (await notifs(early.token)).items.filter((n: any) => n.type === 'BOOKING_REMINDER');
      expect(reminders).toHaveLength(1);
      await waitForMail(early.email, /Rappel/);
      expect((await notifs(late.token)).items.some((n: any) => n.type === 'BOOKING_REMINDER')).toBe(false);
    });
  });
});
