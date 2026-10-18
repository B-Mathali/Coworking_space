import { ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { Repository } from 'typeorm';
import { ResourceNotFoundException } from '../common/exceptions/resource-not-found.exception';
import { Role, User } from './entities/user.entity';

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

  async update(id: number, patch: Partial<Pick<User, 'fullName' | 'role' | 'isActive'>>) {
    const user = await this.findById(id);
    Object.assign(user, patch);
    await this.repo.save(user);
    return this.findById(id);
  }

  async remove(id: number) {
    const user = await this.findById(id);
    await this.repo.remove(user);
  }
}
