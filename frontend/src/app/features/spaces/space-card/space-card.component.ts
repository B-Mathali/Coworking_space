import { Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Space } from '../../../core/models/space.model';
import { IconComponent } from '../../../shared/icon/icon.component';

/** Teinte de couverture stable par espace (palette restreinte et harmonieuse). */
const COVER_HUES = [228, 252, 205, 160, 18, 280];

@Component({
  selector: 'app-space-card',
  standalone: true,
  imports: [RouterLink, IconComponent],
  template: `
    <article class="card card-flush card-hover sc">
      <a class="cover" [routerLink]="['/spaces', space().id]" [style.--h]="hue()" [attr.aria-label]="'Détails de ' + space().name">
        <div class="mini" [style.grid-template-columns]="'repeat(' + cols() + ', 1fr)'">
          @for (i of cells(); track $index) { <span [class.on]="i"></span> }
        </div>
        @if (!space().isActive) { <span class="badge badge-gray closed">Fermé</span> }
      </a>

      <div class="body">
        <div class="title-row">
          <h3>{{ space().name }}</h3>
          <span class="badge badge-blue"><app-icon name="seat" [size]="13" /> {{ space().seatCount ?? 0 }}</span>
        </div>
        @if (space().location) {
          <p class="loc"><app-icon name="pin" [size]="14" /> {{ space().location }}</p>
        }
        <p class="desc">{{ space().description || 'Un espace de travail calme et lumineux, prêt à vous accueillir.' }}</p>

        <div class="actions">
          <a class="btn btn-primary btn-sm" [routerLink]="['/spaces', space().id, 'book']">
            Réserver <app-icon name="arrow-right" [size]="15" />
          </a>
          <a class="btn btn-ghost btn-sm" [routerLink]="['/spaces', space().id]">Détails</a>
        </div>
      </div>
    </article>
  `,
  styles: [
    `
      :host { display: block; }
      .sc { display: flex; flex-direction: column; height: 100%; }
      .cover {
        position: relative; display: grid; place-items: center; height: 148px; overflow: hidden;
        background:
          radial-gradient(120% 90% at 100% 0%, hsl(var(--h) 90% 70% / .55), transparent 60%),
          linear-gradient(135deg, hsl(var(--h) 80% 55%), hsl(calc(var(--h) + 30) 75% 45%));
      }
      .mini { display: grid; gap: 5px; width: 62%; transform: perspective(500px) rotateX(28deg); transition: transform .35s var(--ease); }
      .sc:hover .mini { transform: perspective(500px) rotateX(18deg) scale(1.04); }
      .mini span { aspect-ratio: 1; border-radius: 4px; background: rgb(255 255 255 / 22%); }
      .mini span.on { background: rgb(255 255 255 / 90%); }
      .closed { position: absolute; top: .75rem; right: .75rem; }
      .body { padding: 1.1rem 1.2rem 1.2rem; display: flex; flex-direction: column; flex: 1; }
      .title-row { display: flex; align-items: flex-start; justify-content: space-between; gap: .75rem; }
      h3 { margin: 0; font-size: 1.08rem; }
      .loc { display: flex; align-items: center; gap: .3rem; color: var(--text-3); font-size: .83rem; font-weight: 550; margin: .3rem 0 0; }
      .desc { color: var(--text-2); font-size: .89rem; margin: .7rem 0 1.1rem; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
      .actions { display: flex; gap: .4rem; margin-top: auto; }
    `,
  ],
})
export class SpaceCardComponent {
  readonly space = input.required<Space>();

  readonly hue = computed(() => COVER_HUES[this.space().id % COVER_HUES.length]);
  readonly cols = computed(() => 8);
  /** Aperçu décoratif : une case allumée par place (max 24). */
  readonly cells = computed(() => {
    const n = Math.min(this.space().seatCount ?? 0, 24);
    return Array.from({ length: 24 }, (_, i) => i < n);
  });
}
