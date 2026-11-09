import { DatePipe } from '@angular/common';
import { Component, ElementRef, HostListener, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AppNotification, NotificationType } from '../../core/models/notification.model';
import { NotificationService } from '../../core/services/notification.service';
import { IconComponent } from '../icon/icon.component';

const POLL_INTERVAL_MS = 30_000;

const ICONS: Record<NotificationType, string> = {
  BOOKING_CONFIRMED: 'calendar-check',
  BOOKING_CANCELLED: 'x',
  BOOKING_REFUNDED: 'card',
  BOOKING_EXPIRED: 'clock',
  BOOKING_REMINDER: 'bell',
  ADMIN_BOOKING_CREATED: 'calendar-check',
  ADMIN_BOOKING_CANCELLED: 'x',
};

/** Affichée uniquement pour un utilisateur connecté : le suivi s'arrête à la déconnexion. */
@Component({
  selector: 'app-notification-bell',
  standalone: true,
  imports: [DatePipe, IconComponent],
  templateUrl: './notification-bell.component.html',
  styleUrl: './notification-bell.component.css',
})
export class NotificationBellComponent implements OnInit, OnDestroy {
  private readonly api = inject(NotificationService);
  private readonly router = inject(Router);
  private readonly host = inject(ElementRef<HTMLElement>);
  private timer?: ReturnType<typeof setInterval>;

  readonly items = signal<AppNotification[]>([]);
  readonly unread = signal(0);
  readonly open = signal(false);

  ngOnInit() {
    this.load();
    this.timer = setInterval(() => {
      if (!document.hidden) this.load();
    }, POLL_INTERVAL_MS);
  }

  ngOnDestroy() {
    clearInterval(this.timer);
  }

  icon(n: AppNotification) {
    return ICONS[n.type] ?? 'bell';
  }

  toggle() {
    this.open.update((o) => !o);
    if (this.open()) this.load();
  }

  select(n: AppNotification) {
    this.open.set(false);
    if (!n.readAt) {
      this.items.update((list) =>
        list.map((x) => (x.id === n.id ? { ...x, readAt: new Date().toISOString() } : x)),
      );
      this.unread.update((c) => Math.max(0, c - 1));
      this.api.markRead(n.id).subscribe({ error: () => this.load() });
    }
    this.router.navigateByUrl(n.type.startsWith('ADMIN_') ? '/admin/reservations' : '/my-reservations');
  }

  markAll() {
    const now = new Date().toISOString();
    this.items.update((list) => list.map((x) => ({ ...x, readAt: x.readAt ?? now })));
    this.unread.set(0);
    this.api.markAllRead().subscribe({ error: () => this.load() });
  }

  @HostListener('document:click', ['$event'])
  closeOnOutsideClick(ev: Event) {
    if (this.open() && !this.host.nativeElement.contains(ev.target as Node)) this.open.set(false);
  }

  @HostListener('document:keydown.escape')
  closeOnEscape() {
    this.open.set(false);
  }

  private load() {
    this.api.list().subscribe({
      next: (r) => {
        this.items.set(r.items);
        this.unread.set(r.unreadCount);
      },
      error: () => undefined, // suivi en arrière-plan : réessai au prochain cycle, 401 géré par l'intercepteur
    });
  }
}
