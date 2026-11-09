import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

export interface MailMessage {
  to: string;
  subject: string;
  title: string;
  lines: string[];
  action?: { label: string; url: string };
  note?: string;
}

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: nodemailer.Transporter | null;
  private readonly from: string;

  constructor(config: ConfigService) {
    const host = config.get<string>('mail.host');
    const user = config.get<string>('mail.user');
    this.from = config.get<string>('mail.from')!;
    this.transporter = host
      ? nodemailer.createTransport({
          host,
          port: config.get<number>('mail.port'),
          secure: config.get<boolean>('mail.secure'),
          auth: user ? { user, pass: config.get<string>('mail.password') } : undefined,
          // Un serveur SMTP muet ne doit pas bloquer les requêtes qui attendent l'envoi.
          connectionTimeout: 10_000,
          greetingTimeout: 10_000,
          socketTimeout: 20_000,
        })
      : null;
    if (!this.transporter) {
      this.logger.warn('SMTP non configuré (SMTP_HOST) : aucun email ne sera envoyé.');
    }
  }

  /** Ne lève jamais : une panne d'email ne doit pas faire échouer une réservation. Renvoie true si l'email est parti. */
  async send(message: MailMessage): Promise<boolean> {
    const text = this.renderText(message);
    if (!this.transporter) {
      // Sans SMTP en développement, le lien de réinitialisation reste accessible dans la console.
      // Jamais en production : ces liens donnent accès aux comptes.
      if (process.env.NODE_ENV !== 'production') {
        this.logger.log(`[email non envoyé] À : ${message.to} — ${message.subject}\n${text}`);
      }
      return false;
    }
    try {
      await this.transporter.sendMail({
        from: this.from,
        to: message.to,
        subject: message.subject,
        text,
        html: this.renderHtml(message),
      });
      return true;
    } catch (e) {
      this.logger.error(`Échec d'envoi de « ${message.subject} » : ${(e as Error).message}`);
      return false;
    }
  }

  private renderText({ title, lines, action, note }: MailMessage) {
    return [title, '', ...lines, ...(action ? ['', `${action.label} : ${action.url}`] : []), ...(note ? ['', note] : [])].join('\n');
  }

  private renderHtml({ title, lines, action, note }: MailMessage) {
    const paragraphs = lines
      .map((l) => `<p style="margin:0 0 12px;color:#3f4652;font-size:15px;line-height:1.55">${escapeHtml(l)}</p>`)
      .join('');
    const button = action
      ? `<p style="margin:24px 0"><a href="${escapeHtml(action.url)}" style="display:inline-block;padding:12px 22px;border-radius:999px;background:#2f5bea;color:#fff;font-weight:700;font-size:15px;text-decoration:none">${escapeHtml(action.label)}</a></p>`
      : '';
    const footer = note
      ? `<p style="margin:20px 0 0;color:#7a8290;font-size:13px;line-height:1.5">${escapeHtml(note)}</p>`
      : '';
    return `<div style="background:#f4f5f7;padding:32px 16px;font-family:Arial,Helvetica,sans-serif">
  <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:16px;padding:32px">
    <h1 style="margin:0 0 16px;color:#14171c;font-size:21px">${escapeHtml(title)}</h1>
    ${paragraphs}${button}${footer}
  </div>
</div>`;
  }
}
