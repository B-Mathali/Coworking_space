import { Component, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ThemeService } from '../../core/services/theme.service';
import { AvatarComponent } from '../avatar/avatar.component';
import { IconComponent } from '../icon/icon.component';
import { NotificationBellComponent } from '../notification-bell/notification-bell.component';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, IconComponent, AvatarComponent, NotificationBellComponent],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.css',
})
export class NavbarComponent {
  readonly auth = inject(AuthService);
  readonly theme = inject(ThemeService);
  readonly menuOpen = signal(false);
}
