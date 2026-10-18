import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Space, SpacePayload } from '../models/space.model';

@Injectable({ providedIn: 'root' })
export class SpaceService {
  private readonly http = inject(HttpClient);
  private readonly api = `${environment.apiUrl}/spaces`;

  list(): Observable<Space[]> {
    return this.http.get<Space[]>(this.api);
  }

  get(id: number): Observable<Space> {
    return this.http.get<Space>(`${this.api}/${id}`);
  }

  create(payload: SpacePayload): Observable<Space> {
    return this.http.post<Space>(this.api, payload);
  }

  update(id: number, payload: SpacePayload): Observable<Space> {
    return this.http.patch<Space>(`${this.api}/${id}`, payload);
  }

  remove(id: number): Observable<void> {
    return this.http.delete<void>(`${this.api}/${id}`);
  }
}
