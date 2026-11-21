import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CreateReservationPayload, Reservation } from '../models/reservation.model';

@Injectable({ providedIn: 'root' })
export class ReservationService {
  private readonly http = inject(HttpClient);
  private readonly api = `${environment.apiUrl}/reservations`;

  create(payload: CreateReservationPayload): Observable<Reservation> {
    return this.http.post<Reservation>(this.api, payload);
  }

  mine(): Observable<Reservation[]> {
    return this.http.get<Reservation[]>(`${this.api}/me`);
  }

  cancel(id: number): Observable<Reservation> {
    return this.http.delete<Reservation>(`${this.api}/${id}`);
  }
}
