export default () => ({
  port: parseInt(process.env.PORT ?? '3000', 10),
  frontendUrl: process.env.FRONTEND_URL ?? 'http://localhost:4200',
  database: {
    host: process.env.DB_HOST ?? '127.0.0.1',
    port: parseInt(process.env.DB_PORT ?? '3306', 10),
    username: process.env.DB_USER ?? 'root',
    password: process.env.DB_PASSWORD ?? '',
    name: process.env.DB_NAME ?? 'coworking',
    synchronize: (process.env.DB_SYNCHRONIZE ?? 'true') === 'true',
  },
  jwt: {
    secret: process.env.JWT_SECRET ?? 'dev-secret',
    expiresIn: process.env.JWT_EXPIRES_IN ?? '8h',
  },
  admin: {
    email: process.env.ADMIN_EMAIL ?? 'admin@coworking.tn',
    password: process.env.ADMIN_PASSWORD ?? 'Admin@12345',
    name: process.env.ADMIN_NAME ?? 'Administrateur',
  },
});
