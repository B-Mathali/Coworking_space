export type NotificationType =
  | 'BOOKING_CONFIRMED'
  | 'BOOKING_CANCELLED'
  | 'BOOKING_REFUNDED'
  | 'BOOKING_EXPIRED'
  | 'BOOKING_REMINDER'
  | 'ADMIN_BOOKING_CREATED'
  | 'ADMIN_BOOKING_CANCELLED';

export interface AppNotification {
  id: number;
  type: NotificationType;
  title: string;
  message: string;
  reservationId: number | null;
  readAt: string | null;
  createdAt: string;
}

export interface NotificationList {
  items: AppNotification[];
  unreadCount: number;
}
