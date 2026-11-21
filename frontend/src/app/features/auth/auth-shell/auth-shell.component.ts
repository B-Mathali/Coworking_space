import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IconComponent } from '../../../shared/icon/icon.component';

/** Mise en page commune connexion / inscription : carte centrée sur fond doux. */
@Component({
  selector: 'app-auth-shell',
  standalone: true,
  imports: [RouterLink, IconComponent],
  template: `
    <div class="shell">
      <div class="col rise">
        <a class="brand" routerLink="/">Coworking<b>Space</b></a>

        <section class="box">
          <a class="back" routerLink="/"><app-icon name="arrow-left" [size]="15" /> Accueil</a>
          @if (eyebrow()) { <span class="kicker">{{ eyebrow() }}</span> }
          <h1>{{ title() }}</h1>
          <p class="sub">{{ subtitle() }}</p>
          <ng-content />
        </section>

        <p class="foot">Un accès sécurisé à votre espace de travail.</p>
      </div>
    </div>
  `,
  styles: [
    `
      .shell {
        min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 3rem 1rem;
        background:
          radial-gradient(50rem 40rem at 0% 0%, color-mix(in srgb, var(--primary) 9%, transparent), transparent 70%),
          radial-gradient(40rem 30rem at 100% 100%, color-mix(in srgb, var(--sky) 8%, transparent), transparent 70%),
          var(--bg);
      }
      .col { width: 100%; max-width: 440px; display: flex; flex-direction: column; align-items: center; }
      .brand { font-size: 1.4rem; font-weight: 800; letter-spacing: -.04em; color: var(--text); margin-bottom: 1.4rem; }
      .brand:hover { color: var(--text); }
      .brand b { color: var(--primary); font-weight: 800; }
      .box {
        width: 100%; padding: 2.25rem 2.25rem 2rem; border-radius: 24px;
        background: var(--surface); border: 1px solid var(--border);
        box-shadow: 0 24px 60px color-mix(in srgb, var(--primary) 8%, transparent), var(--shadow-sm);
      }
      .back { display: inline-flex; align-items: center; gap: .3rem; font-size: .85rem; font-weight: 600; color: var(--text-3); margin-bottom: 1.6rem; }
      .back:hover { color: var(--text); }
      .kicker { display: block; font-size: .74rem; font-weight: 800; letter-spacing: .12em; text-transform: uppercase; color: var(--primary); margin-bottom: .6rem; }
      h1 { font-size: 1.9rem; letter-spacing: -.04em; margin-bottom: .45rem; }
      .sub { color: var(--text-2); font-size: .93rem; margin-bottom: 1.6rem; }
      .foot { margin: 1.4rem 0 0; font-size: .8rem; color: var(--text-3); }
      @media (max-width: 520px) { .box { padding: 1.6rem 1.25rem; border-radius: 20px; } }
    `,
  ],
})
export class AuthShellComponent {
  readonly eyebrow = input('');
  readonly title = input.required<string>();
  readonly subtitle = input('');
}
