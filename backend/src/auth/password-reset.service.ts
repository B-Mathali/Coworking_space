import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MailService } from '../mail/mail.service';
import { User } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';

const RESET_TTL_MS = 60 * 60 * 1000; // 1 h
const INVITATION_TTL_MS = 72 * 60 * 60 * 1000; // 3 jours
const REQUEST_COOLDOWN_MS = 60 * 1000; // évite d'inonder une boîte mail depuis le formulaire public

@Injectable()
export class PasswordResetService {
  private readonly logger = new Logger(PasswordResetService.name);

  constructor(
    private readonly users: UsersService,
    private readonly mail: MailService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Formulaire public. Le contrôleur n'attend pas ce traitement : la réponse est la même, et
   * aussi rapide, que le compte existe ou non. Elle ne révèle donc pas quels emails sont inscrits.
   */
  async requestReset(email: string): Promise<void> {
    try {
      const user = await this.users.findForPasswordReset(email);
      if (!user?.isActive) return;
      const issuedAt = user.resetTokenIssuedAt;
      if (issuedAt && Date.now() - new Date(issuedAt).getTime() < REQUEST_COOLDOWN_MS) return;
      await this.sendResetLink(user);
    } catch (e) {
      this.logger.error(`Demande de réinitialisation : ${(e as Error).message}`);
    }
  }

  async sendResetLink(user: User): Promise<boolean> {
    const url = await this.buildLink(user, RESET_TTL_MS);
    return this.mail.send({
      to: user.email,
      subject: 'Réinitialisation de votre mot de passe',
      title: 'Réinitialisez votre mot de passe',
      lines: [
        `Bonjour ${user.fullName},`,
        'Une demande de réinitialisation a été faite pour votre compte. Ce lien est valable 1 heure et ne fonctionne qu’une seule fois.',
      ],
      action: { label: 'Choisir un nouveau mot de passe', url },
      note: 'Si vous n’êtes pas à l’origine de cette demande, ignorez cet email : votre mot de passe reste inchangé.',
    });
  }

  /** Compte créé par un admin : l'utilisateur choisit lui-même son mot de passe. */
  async sendInvitation(user: User): Promise<boolean> {
    const url = await this.buildLink(user, INVITATION_TTL_MS);
    return this.mail.send({
      to: user.email,
      subject: 'Votre compte CoworkSpace est prêt',
      title: 'Bienvenue sur CoworkSpace',
      lines: [
        `Bonjour ${user.fullName},`,
        'Un administrateur a créé votre compte. Choisissez votre mot de passe pour l’activer. Ce lien est valable 3 jours.',
      ],
      action: { label: 'Choisir mon mot de passe', url },
    });
  }

  async reset(token: string, password: string): Promise<void> {
    if (!(await this.users.consumeResetToken(token, password))) {
      throw new BadRequestException('Ce lien est invalide ou a expiré. Merci de refaire une demande.');
    }
  }

  private async buildLink(user: User, ttlMs: number) {
    const token = await this.users.issueResetToken(user.id, ttlMs);
    return `${this.config.get<string>('frontendUrl')}/reset-password?token=${token}`;
  }
}
