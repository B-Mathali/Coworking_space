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
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY ?? '',
    /** Optionnel en local : sans lui, le paiement est validé au retour de Stripe (/payments/confirm). */
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET ?? '',
  },
  mail: {
    /** Vide : aucun email n'est envoyé (en développement, leur contenu est écrit dans la console). */
    host: process.env.SMTP_HOST ?? '',
    port: parseInt(process.env.SMTP_PORT ?? '587', 10),
    secure: (process.env.SMTP_SECURE ?? 'false') === 'true',
    user: process.env.SMTP_USER ?? '',
    password: process.env.SMTP_PASSWORD ?? '',
    from: process.env.MAIL_FROM ?? 'CoworkSpace <no-reply@coworking.tn>',
  },
  billing: {
    currency: (process.env.PAYMENT_CURRENCY ?? 'tnd').toLowerCase(),
    vatRate: parseFloat(process.env.VAT_RATE ?? '0.19'),
    timezone: process.env.APP_TIMEZONE ?? 'Africa/Tunis',
    company: {
      name: process.env.COMPANY_NAME ?? 'CoworkSpace',
      address: process.env.COMPANY_ADDRESS ?? 'Tunis, Tunisie',
      email: process.env.COMPANY_EMAIL ?? 'contact@coworking.tn',
      taxId: process.env.COMPANY_TAX_ID ?? '',
    },
  },
});
