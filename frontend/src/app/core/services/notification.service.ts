import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { NotificationList } from '../models/notification.model';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly http = inject(HttpClient);
  private readonly api = `${environment.apiUrl}/notifications`;

  list(): Observable<NotificationList> {
    return this.http.get<NotificationList>(this.api);
  }

  markRead(id: number): Observable<void> {
    return this.http.patch<void>(`${this.api}/${id}/read`, {});
  }

  markAllRead(): Observable<void> {
    return this.http.patch<void>(`${this.api}/read-all`, {});
  }
}
