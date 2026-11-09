import { ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { createHash, randomBytes } from 'crypto';
import { MoreThan, Repository } from 'typeorm';
import { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';
import { ResourceNotFoundException } from '../common/exceptions/resource-not-found.exception';
import { Role, User } from './entities/user.entity';

const NO_RESET_TOKEN = { resetTokenHash: null, resetTokenExpiresAt: null, resetTokenIssuedAt: null };

const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');

export interface CreateUserInput {
  fullName: string;
  email: string;
  password: string; // en clair : haché ici
  role?: Role;
}

@Injectable()
export class UsersService {
  constructor(@InjectRepository(User) private readonly repo: Repository<User>) {}

  async create(input: CreateUserInput): Promise<User> {
    const email = input.email.toLowerCase().trim();
    if (await this.repo.findOne({ where: { email } })) {
      throw new ConflictException('Un compte existe déjà avec cet email.');
    }
    const saved = await this.repo.save(
      this.repo.create({
        fullName: input.fullName,
        email,
        password: await bcrypt.hash(input.password, 10),
        role: input.role ?? Role.USER,
      }),
    );
    return this.findById(saved.id);
  }

  findByEmail(email: string) {
    return this.repo.findOne({ where: { email: email.toLowerCase().trim() } });
  }

  /** Version avec le hash du mot de passe — réservée à la connexion */
  findByEmailWithPassword(email: string) {
    return this.repo
      .createQueryBuilder('u')
      .addSelect('u.password')
      .where('u.email = :email', { email: email.toLowerCase().trim() })
      .getOne();
  }

  async findById(id: number): Promise<User> {
    const user = await this.repo.findOne({ where: { id } });
    if (!user) throw new ResourceNotFoundException('Utilisateur');
    return user;
  }

  findAll() {
    return this.repo.find({ order: { createdAt: 'DESC' } });
  }

  async update(id: number, patch: Partial<Pick<User, 'fullName' | 'email' | 'role' | 'isActive'>>) {
    const user = await this.findById(id);
    const { email, ...rest } = patch;
    const changes: QueryDeepPartialEntity<User> = { ...rest };
    if (email !== undefined) {
      const normalized = email.toLowerCase().trim();
      if (normalized !== user.email) {
        if (await this.repo.findOne({ where: { email: normalized } })) {
          throw new ConflictException('Un compte existe déjà avec cet email.');
        }
        // Un lien déjà envoyé à l'ancienne adresse ne doit plus donner accès au compte.
        Object.assign(changes, { email: normalized, ...NO_RESET_TOKEN });
      }
    }
    if (Object.keys(changes).length > 0) await this.repo.update(id, changes);
    return this.findById(id);
  }

  /** Utilisé à chaque requête authentifiée : inclut la date de changement du mot de passe. */
  findForAuth(id: number) {
    return this.repo
      .createQueryBuilder('u')
      .addSelect('u.passwordChangedAt')
      .where('u.id = :id', { id })
      .getOne();
  }

  findForPasswordReset(email: string) {
    return this.repo
      .createQueryBuilder('u')
      .addSelect('u.resetTokenIssuedAt')
      .where('u.email = :email', { email: email.toLowerCase().trim() })
      .getOne();
  }

  /** Crée un jeton à usage unique (l'éventuel jeton précédent est remplacé) et renvoie sa valeur en clair. */
  async issueResetToken(id: number, ttlMs: number): Promise<string> {
    const token = randomBytes(32).toString('hex');
    const now = new Date();
    await this.repo.update(id, {
      resetTokenHash: hashToken(token),
      resetTokenIssuedAt: now,
      resetTokenExpiresAt: new Date(now.getTime() + ttlMs),
    });
    return token;
  }

  /**
   * La condition et l'écriture tiennent en un seul UPDATE : deux requêtes simultanées
   * avec le même jeton ne peuvent pas réussir toutes les deux. Renvoie false si le jeton est invalide.
   */
  async consumeResetToken(token: string, newPassword: string): Promise<boolean> {
    const password = await bcrypt.hash(newPassword, 10);
    const now = new Date();
    const result = await this.repo.update(
      { resetTokenHash: hashToken(token), resetTokenExpiresAt: MoreThan(now), isActive: true },
      { password, passwordChangedAt: now, ...NO_RESET_TOKEN },
    );
    return result.affected === 1;
  }

  async remove(id: number) {
    const user = await this.findById(id);
    await this.repo.remove(user);
  }
}
