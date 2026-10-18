import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AdminStats, Reservation, ReservationFilter } from '../models/reservation.model';
import { Role, User } from '../models/user.model';

@Injectable({ providedIn: 'root' })
export class AdminService {
  private readonly http = inject(HttpClient);
  private readonly api = `${environment.apiUrl}/admin`;

  stats(): Observable<AdminStats> {
    return this.http.get<AdminStats>(`${this.api}/stats`);
  }

  users(): Observable<User[]> {
    return this.http.get<User[]>(`${this.api}/users`);
  }

  updateUser(
    id: number,
    patch: Partial<{ fullName: string; role: Role; isActive: boolean }>,
  ): Observable<User> {
    return this.http.patch<User>(`${this.api}/users/${id}`, patch);
  }

  removeUser(id: number): Observable<void> {
    return this.http.delete<void>(`${this.api}/users/${id}`);
  }

  reservations(filter: ReservationFilter = {}): Observable<Reservation[]> {
    let params = new HttpParams();
    if (filter.spaceId) params = params.set('spaceId', filter.spaceId);
    if (filter.status) params = params.set('status', filter.status);
    if (filter.from) params = params.set('from', new Date(`${filter.from}T00:00:00`).toISOString());
    if (filter.to) params = params.set('to', new Date(`${filter.to}T23:59:59`).toISOString());
    return this.http.get<Reservation[]>(`${this.api}/reservations`, { params });
  }

  cancelReservation(id: number): Observable<Reservation> {
    return this.http.delete<Reservation>(`${this.api}/reservations/${id}`);
  }
}
