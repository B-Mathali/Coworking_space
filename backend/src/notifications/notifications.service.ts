import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { ResourceNotFoundException } from '../common/exceptions/resource-not-found.exception';
import { Notification, NotificationType } from './entities/notification.entity';

const LIST_LIMIT = 30;

export interface NewNotification {
  userId: number;
  type: NotificationType;
  title: string;
  message: string;
  reservationId: number;
}

@Injectable()
export class NotificationsService {
  constructor(@InjectRepository(Notification) private readonly repo: Repository<Notification>) {}

  async create(items: NewNotification[]) {
    if (items.length > 0) await this.repo.insert(items);
  }

  async list(userId: number) {
    const [items, unreadCount] = await Promise.all([
      this.repo.find({ where: { userId }, order: { createdAt: 'DESC', id: 'DESC' }, take: LIST_LIMIT }),
      this.repo.count({ where: { userId, readAt: IsNull() } }),
    ]);
    return { items, unreadCount };
  }

  /** Filtré par userId : impossible d'agir sur la notification de quelqu'un d'autre. */
  async markRead(userId: number, id: number) {
    const exists = await this.repo.existsBy({ id, userId });
    if (!exists) throw new ResourceNotFoundException('Notification');
    await this.repo.update({ id, userId, readAt: IsNull() }, { readAt: new Date() });
  }

  async markAllRead(userId: number) {
    await this.repo.update({ userId, readAt: IsNull() }, { readAt: new Date() });
  }
}
