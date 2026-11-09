import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map, shareReplay } from 'rxjs';
import { environment } from '../../../environments/environment';
import { BillingConfig, PaymentConfirmation } from '../models/reservation.model';

@Injectable({ providedIn: 'root' })
export class PaymentService {
  private readonly http = inject(HttpClient);
  private readonly api = `${environment.apiUrl}/payments`;

  /** Devise + TVA (chargées une seule fois). */
  readonly config$: Observable<BillingConfig> = this.http
    .get<BillingConfig>(`${this.api}/config`)
    .pipe(shareReplay(1));

  /** Démarre le paiement Stripe : redirige le navigateur vers la page Stripe Checkout. */
  checkout(reservationId: number): Observable<void> {
    return this.http
      .post<{ url: string }>(`${this.api}/checkout`, { reservationId })
      .pipe(map(({ url }) => window.location.assign(url)));
  }

  confirm(sessionId: string): Observable<PaymentConfirmation> {
    return this.http.post<PaymentConfirmation>(`${this.api}/confirm`, { sessionId });
  }

  /** Télécharge la facture PDF (requête authentifiée → blob → lien de téléchargement). */
  downloadInvoice(reservationId: number, invoiceNumber: string | null): Observable<void> {
    return this.http
      .get(`${this.api}/reservations/${reservationId}/invoice`, { responseType: 'blob' })
      .pipe(
        map((blob) => {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `facture-${invoiceNumber ?? reservationId}.pdf`;
          a.click();
          setTimeout(() => URL.revokeObjectURL(url), 1000);
        }),
      );
  }
}
