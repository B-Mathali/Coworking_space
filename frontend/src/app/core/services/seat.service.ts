import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { SeatAvailability, Slot } from '../models/space.model';

export interface BulkSeatsPayload {
  spaceId: number;
  rows: number;
  cols: number;
}

@Injectable({ providedIn: 'root' })
export class SeatService {
  private readonly http = inject(HttpClient);
  private readonly api = environment.apiUrl;

  /** Plan d'un espace avec le statut de chaque place pour le créneau donné. */
  getMap(spaceId: number, slot: Slot): Observable<SeatAvailability[]> {
    const params = new HttpParams()
      .set('start', slot.start.toISOString())
      .set('end', slot.end.toISOString());
    return this.http.get<SeatAvailability[]>(`${this.api}/spaces/${spaceId}/seats`, { params });
  }

  create(payload: { spaceId: number; label: string; posX: number; posY: number }): Observable<unknown> {
    return this.http.post(`${this.api}/seats`, payload);
  }

  bulkCreate(payload: BulkSeatsPayload): Observable<unknown> {
    return this.http.post(`${this.api}/seats/bulk`, payload);
  }

  update(
    id: number,
    patch: Partial<{ label: string; posX: number; posY: number; isActive: boolean }>,
  ): Observable<unknown> {
    return this.http.patch(`${this.api}/seats/${id}`, patch);
  }

  remove(id: number): Observable<void> {
    return this.http.delete<void>(`${this.api}/seats/${id}`);
  }
}
