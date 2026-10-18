import { Component, input } from '@angular/core';
import { IconComponent } from '../../../shared/icon/icon.component';

/** Mise en page commune connexion / inscription : panneau de marque + formulaire. */
@Component({
  selector: 'app-auth-shell',
  standalone: true,
  imports: [IconComponent],
  template: `
    <div class="shell">
      <section class="visual" aria-hidden="true">
        <div class="visual-inner">
          <span class="eyebrow-inv"><app-icon name="sparkles" [size]="14" /> Coworking nouvelle génération</span>
          <h2 class="headline">Votre bureau idéal,<br />réservé en <span>un clic</span>.</h2>

          <div class="mock">
            <div class="mock-head">
              <span class="dot"></span><span class="dot"></span><span class="dot"></span>
              <span class="mock-title">Open space — 2ᵉ étage</span>
            </div>
            <div class="mock-plan">
              @for (s of mockSeats; track $index) {
                <span class="ms" [class]="'ms ms-' + s"></span>
              }
            </div>
            <div class="mock-foot">
              <span><i class="ms-free"></i> 14 libres</span>
              <span><i class="ms-mine"></i> Votre place</span>
            </div>
          </div>

          <ul class="perks">
            <li><app-icon name="pointer" [size]="16" /> Plan interactif en temps réel</li>
            <li><app-icon name="clock" [size]="16" /> Créneaux flexibles, à l'heure ou à la journée</li>
            <li><app-icon name="check-circle" [size]="16" /> Annulation gratuite en un clic</li>
          </ul>
        </div>
      </section>

      <section class="form-side">
        <div class="form-box rise">
          <h1>{{ title() }}</h1>
          <p class="sub">{{ subtitle() }}</p>
          <ng-content />
        </div>
      </section>
    </div>
  `,
  styles: [
    `
      .shell { display: grid; grid-template-columns: minmax(0, 1.05fr) minmax(0, 1fr); min-height: calc(100vh - var(--nav-h)); }
      .visual {
        position: relative; overflow: hidden; color: #fff; display: flex; align-items: center; justify-content: center; padding: 3rem;
        background:
          radial-gradient(900px 500px at 0% 0%, rgb(255 122 69 / 35%), transparent 60%),
          radial-gradient(700px 600px at 100% 100%, rgb(110 140 255 / 55%), transparent 60%),
          linear-gradient(150deg, #1a2fd6 0%, #2a46ff 45%, #3d2bc4 100%);
      }
      .visual::before {
        content: ''; position: absolute; inset: 0; opacity: .14;
        background-image: radial-gradient(circle, #fff 1px, transparent 1.4px); background-size: 22px 22px;
        mask-image: linear-gradient(180deg, #000, transparent 85%);
      }
      .visual-inner { position: relative; max-width: 460px; width: 100%; }
      .eyebrow-inv { display: inline-flex; align-items: center; gap: .4rem; font-size: .74rem; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; padding: .35rem .7rem; border-radius: 999px; background: rgb(255 255 255 / 14%); border: 1px solid rgb(255 255 255 / 20%); }
      .headline { color: #fff; font-size: clamp(1.8rem, 1.2rem + 1.6vw, 2.6rem); font-weight: 800; letter-spacing: -.035em; line-height: 1.1; margin: 1.1rem 0 1.8rem; }
      .headline span { background: linear-gradient(90deg, #ffb48f, #ff7a45); -webkit-background-clip: text; background-clip: text; color: transparent; }

      .mock { background: rgb(255 255 255 / 10%); border: 1px solid rgb(255 255 255 / 18%); border-radius: 18px; padding: 1rem; backdrop-filter: blur(10px); box-shadow: 0 30px 60px rgb(10 20 80 / 35%); }
      .mock-head { display: flex; align-items: center; gap: .35rem; margin-bottom: .85rem; }
      .dot { width: 8px; height: 8px; border-radius: 50%; background: rgb(255 255 255 / 35%); }
      .mock-title { margin-left: .5rem; font-size: .78rem; font-weight: 650; opacity: .85; }
      .mock-plan { display: grid; grid-template-columns: repeat(8, 1fr); gap: 7px; }
      .ms { aspect-ratio: 1; border-radius: 7px; }
      .ms-f, .ms-free { background: rgb(255 255 255 / 92%); }
      .ms-t { background: rgb(255 255 255 / 22%); }
      .ms-m, .ms-mine { background: #ff7a45; box-shadow: 0 0 0 3px rgb(255 122 69 / 35%); }
      .ms-e { background: transparent; }
      .mock-foot { display: flex; gap: 1.1rem; margin-top: .85rem; font-size: .76rem; font-weight: 650; opacity: .9; }
      .mock-foot i { display: inline-block; width: 10px; height: 10px; border-radius: 3px; margin-right: .35rem; vertical-align: -1px; }

      .perks { list-style: none; padding: 0; margin: 1.8rem 0 0; display: grid; gap: .7rem; font-size: .92rem; font-weight: 550; }
      .perks li { display: flex; align-items: center; gap: .6rem; opacity: .95; }
      .perks app-icon { width: 28px; height: 28px; border-radius: 8px; display: grid; place-items: center; background: rgb(255 255 255 / 14%); }

      .form-side { display: flex; align-items: center; justify-content: center; padding: 3rem 1.5rem; }
      .form-box { width: 100%; max-width: 400px; }
      .form-box h1 { font-size: 1.85rem; }
      .sub { color: var(--text-2); margin-bottom: 1.75rem; }

      @media (max-width: 920px) {
        .shell { grid-template-columns: 1fr; }
        .visual { display: none; }
        .form-side { padding: 2.5rem 1rem; align-items: flex-start; }
      }
    `,
  ],
})
export class AuthShellComponent {
  readonly title = input.required<string>();
  readonly subtitle = input('');

  // f = libre, t = occupée, m = la vôtre, e = allée
  readonly mockSeats = [
    'f', 't', 'f', 'e', 'e', 'f', 'f', 't',
    'f', 'f', 't', 'e', 'e', 't', 'f', 'f',
    'e', 'e', 'e', 'e', 'e', 'e', 'e', 'e',
    't', 'f', 'f', 'e', 'e', 'f', 'm', 'f',
    'f', 't', 'f', 'e', 'e', 'f', 't', 'f',
  ];
}
