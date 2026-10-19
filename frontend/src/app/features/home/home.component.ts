import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { IconComponent } from '../../shared/icon/icon.component';

/** Page d'accueil publique : présentation du service et accès rapide. */
@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink, IconComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css',
})
export class HomeComponent {
  readonly auth = inject(AuthService);

  readonly stats = [
    { label: 'Réservation', value: '24/7', unit: '' },
    { label: 'Pour réserver', value: '30', unit: 's' },
    { label: 'Annulation', value: '1', unit: 'clic' },
  ];

  readonly features = [
    { icon: 'grid', title: 'Plan interactif', text: 'Visualisez chaque salle place par place et choisissez la vôtre.', tone: 'violet' },
    { icon: 'zap', title: 'Disponibilités en direct', text: 'Les places occupées sont signalées instantanément, sans double réservation.', tone: 'sky' },
    { icon: 'ticket', title: 'Vos réservations', text: 'Suivez et annulez vos réservations depuis un seul écran.', tone: 'green' },
    { icon: 'shield', title: 'Gestion simplifiée', text: 'Les administrateurs gèrent les salles, les plans et l’occupation.', tone: 'orange' },
  ];

  readonly steps = [
    { icon: 'building', title: 'Choisissez un espace', text: 'Parcourez les salles disponibles, leur capacité et leur emplacement.' },
    { icon: 'clock', title: 'Sélectionnez un créneau', text: 'Indiquez la date et l’horaire : le plan se met à jour instantanément.' },
    { icon: 'pointer', title: 'Cliquez sur votre place', text: 'Repérez une place libre et confirmez votre réservation en un clic.' },
  ];

  scrollTo(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}
