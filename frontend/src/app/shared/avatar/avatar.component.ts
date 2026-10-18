import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/** Pastille aux initiales, teinte stable dérivée du nom. */
@Component({
  selector: 'app-avatar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span class="avatar" [class.avatar-sm]="size() === 'sm'" [class.avatar-lg]="size() === 'lg'" [style.--h]="hue()">{{ initials() }}</span>`,
  styles: [`:host { display: inline-flex; }`],
})
export class AvatarComponent {
  readonly name = input('');
  readonly size = input<'sm' | 'md' | 'lg'>('md');

  readonly initials = computed(() => {
    const parts = this.name().trim().split(/\s+/).filter(Boolean);
    const letters = parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : (parts[0] ?? '?').slice(0, 2);
    return letters.toUpperCase();
  });

  readonly hue = computed(() => {
    let h = 0;
    for (const c of this.name()) h = (h * 31 + c.charCodeAt(0)) % 360;
    return h;
  });
}
