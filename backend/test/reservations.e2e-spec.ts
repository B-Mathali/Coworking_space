import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';

/**
 * Nécessite PostgreSQL démarré avec les variables du fichier .env.
 * Lancer : npm run test:e2e
 */
describe('Réservations & espace admin (e2e)', () => {
  let app: INestApplication;
  let http: ReturnType<typeof request>;
  let adminToken: string;
  let userToken: string;
  let seatId: number;
  let spaceId: number;

  const suffix = Date.now();
  const auth = (t: string) => ({ Authorization: `Bearer ${t}` });
  const slot = (offsetH: number, durH = 2) => {
    const s = new Date(Date.now() + offsetH * 3600_000);
    return { startTime: s.toISOString(), endTime: new Date(s.getTime() + durH * 3600_000).toISOString() };
  };

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = mod.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    app.useGlobalFilters(new HttpExceptionFilter());
    await app.init();
    http = request(app.getHttpServer());

    const admin = await http
      .post('/api/auth/login')
      .send({ email: process.env.ADMIN_EMAIL ?? 'admin@coworking.tn', password: process.env.ADMIN_PASSWORD ?? 'Admin@12345' });
    adminToken = admin.body.accessToken;

    const reg = await http
      .post('/api/auth/register')
      .send({ fullName: 'Test User', email: `user${suffix}@test.tn`, password: 'secret123' });
    userToken = reg.body.accessToken;

    const space = await http.post('/api/spaces').set(auth(adminToken)).send({ name: `Salle ${suffix}` });
    spaceId = space.body.id;
    const seat = await http
      .post('/api/seats')
      .set(auth(adminToken))
      .send({ spaceId, label: 'A1', posX: 10, posY: 10 });
    seatId = seat.body.id;
  });

  afterAll(async () => {
    await http.delete(`/api/spaces/${spaceId}`).set(auth(adminToken));
    await app.close();
  });

  it('un utilisateur simple est refusé sur /admin/stats (403)', async () => {
    await http.get('/api/admin/stats').set(auth(userToken)).expect(403);
  });

  it("l'admin accède à /admin/stats (200)", async () => {
    const res = await http.get('/api/admin/stats').set(auth(adminToken)).expect(200);
    expect(res.body).toHaveProperty('occupancyRate');
  });

  it('un utilisateur réserve une place libre, puis le plan la montre MINE', async () => {
    const t = slot(24);
    await http.post('/api/reservations').set(auth(userToken)).send({ seatId, ...t }).expect(201);
    const map = await http
      .get(`/api/spaces/${spaceId}/seats`)
      .query({ start: t.startTime, end: t.endTime })
      .set(auth(userToken))
      .expect(200);
    expect(map.body[0].status).toBe('MINE');
  });

  it('une réservation qui chevauche la précédente est refusée (409)', async () => {
    const other = await http
      .post('/api/auth/register')
      .send({ fullName: 'Autre', email: `other${suffix}@test.tn`, password: 'secret123' });
    const t = slot(25, 2); // chevauche 24h→26h
    await http.post('/api/reservations').set(auth(other.body.accessToken)).send({ seatId, ...t }).expect(409);
  });

  it("l'admin voit et annule la réservation", async () => {
    const list = await http.get('/api/admin/reservations').query({ spaceId }).set(auth(adminToken)).expect(200);
    expect(list.body.length).toBeGreaterThan(0);
    await http.delete(`/api/admin/reservations/${list.body[0].id}`).set(auth(adminToken)).expect(200);
  });
});
