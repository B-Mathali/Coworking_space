import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Space } from '../../../core/models/space.model';

@Component({
  selector: 'app-space-card',
  standalone: true,
  imports: [RouterLink],
  template: `
    <article class="card card-hover">
      <div class="row">
        <h3 style="margin: 0">{{ space().name }}</h3>
        <span class="spacer"></span>
        <span class="badge badge-blue">{{ space().seatCount ?? 0 }} places</span>
      </div>
      @if (space().location) { <p class="muted small" style="margin-top: .25rem">📍 {{ space().location }}</p> }
      <p class="muted" style="min-height: 3em">{{ space().description || 'Aucune description.' }}</p>
      <div class="row">
        <a class="btn btn-primary btn-sm" [routerLink]="['/spaces', space().id, 'book']">Réserver une place</a>
        <a class="btn btn-ghost btn-sm" [routerLink]="['/spaces', space().id]">Détails</a>
      </div>
    </article>
  `,
})
export class SpaceCardComponent {
  readonly space = input.required<Space>();
}
