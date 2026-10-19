import { Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Space } from '../../../core/models/space.model';
import { IconComponent } from '../../../shared/icon/icon.component';

/** Teinte pastel stable par espace (violet, pêche, menthe, ciel, rose, ambre). */
const COVER_HUES = [250, 22, 160, 200, 330, 42];
const COVER_ICONS = ['building', 'seat', 'users', 'coffee', 'sparkles', 'grid'];

@Component({
  selector: 'app-space-card',
  standalone: true,
  imports: [RouterLink, IconComponent],
  template: `
    <article class="sc">
      <a class="cover" [routerLink]="['/spaces', space().id]" [style.--h]="hue()" [attr.aria-label]="'Détails de ' + space().name">
        <span class="tag" [class.off]="!space().isActive">
          <i></i>{{ space().isActive ? 'Ouvert' : 'Fermé' }}
        </span>
        <span class="tile"><app-icon [name]="icon()" [size]="30" [stroke]="1.8" /></span>
      </a>

      <div class="body">
        <h3>{{ space().name }}</h3>
        @if (space().location) {
          <p class="loc"><app-icon name="pin" [size]="14" /> {{ space().location }}</p>
        }
        <p class="desc">{{ space().description || 'Un espace de travail calme et lumineux, prêt à vous accueillir.' }}</p>

        <div class="meta">
          <span><app-icon name="users" [size]="15" /> {{ space().seatCount ?? 0 }} places</span>
          <a [routerLink]="['/spaces', space().id]">Détails</a>
        </div>

        <a class="book" [routerLink]="['/spaces', space().id, 'book']">
          Réserver une place <app-icon name="arrow-right" [size]="15" />
        </a>
      </div>
    </article>
  `,
  styles: [
    `
      :host { display: block; }
      .sc {
        display: flex; flex-direction: column; height: 100%; overflow: hidden;
        background: var(--surface); border: 1px solid var(--border); border-radius: 20px;
        transition: transform .2s var(--ease), box-shadow .2s var(--ease);
      }
      .sc:hover { transform: translateY(-4px); box-shadow: var(--shadow); }
      .cover {
        position: relative; display: grid; place-items: center; height: 190px;
        background:
          radial-gradient(90% 90% at 100% 100%, color-mix(in srgb, hsl(calc(var(--h) + 50) 85% 75%) 40%, transparent), transparent 70%),
          linear-gradient(135deg, color-mix(in srgb, hsl(var(--h) 85% 72%) 42%, var(--surface)), color-mix(in srgb, hsl(calc(var(--h) + 30) 85% 80%) 26%, var(--surface)));
      }
      .tag {
        position: absolute; top: .9rem; left: .9rem; display: inline-flex; align-items: center; gap: .4rem;
        height: 26px; padding: 0 .7rem; border-radius: 999px; background: var(--surface);
        font-size: .75rem; font-weight: 700; color: var(--text); box-shadow: var(--shadow-xs);
      }
      .tag i { width: 6px; height: 6px; border-radius: 50%; background: var(--success); }
      .tag.off i { background: var(--text-3); }
      .tile {
        width: 78px; height: 78px; border-radius: 22px; display: grid; place-items: center;
        background: var(--surface); color: hsl(var(--h) 70% 52%);
        box-shadow: 0 12px 28px hsl(var(--h) 60% 40% / 16%);
        transition: transform .3s var(--ease);
      }
      .sc:hover .tile { transform: translateY(-4px) rotate(-4deg); }
      .body { padding: 1.3rem 1.35rem 1.35rem; display: flex; flex-direction: column; flex: 1; }
      h3 { margin: 0; font-size: 1.15rem; }
      .loc { display: flex; align-items: center; gap: .3rem; color: var(--text-3); font-size: .85rem; font-weight: 550; margin: .3rem 0 0; }
      .loc app-icon { color: #f43f5e; }
      .desc { color: var(--text-2); font-size: .9rem; margin: .8rem 0 1.1rem; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
      .meta {
        display: flex; align-items: center; justify-content: space-between; margin-top: auto;
        padding-top: .9rem; border-top: 1px solid var(--border); font-size: .85rem; color: var(--text-2); font-weight: 600;
      }
      .meta span { display: inline-flex; align-items: center; gap: .35rem; }
      .meta span app-icon { color: var(--primary); }
      .meta a { font-weight: 700; color: var(--text-2); }
      .meta a:hover { color: var(--primary); }
      .book {
        display: flex; align-items: center; justify-content: center; gap: .4rem; height: 42px; margin-top: 1rem;
        border-radius: 12px; background: var(--primary-soft); color: var(--primary); font-weight: 700; font-size: .9rem;
        transition: background .15s, color .15s;
      }
      .book:hover { background: var(--primary); color: #fff; }
    `,
  ],
})
export class SpaceCardComponent {
  readonly space = input.required<Space>();

  readonly hue = computed(() => COVER_HUES[this.space().id % COVER_HUES.length]);
  readonly icon = computed(() => COVER_ICONS[this.space().id % COVER_ICONS.length]);
}
