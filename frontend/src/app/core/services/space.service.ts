
import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Space, SpacePayload } from '../models/space.model';

@Injectable({ providedIn: 'root' })
export class SpaceService {
  private readonly http = inject(HttpClient);

  // API endpoint: http://localhost:3000/api/spaces
  private readonly api = `${environment.apiUrl}/spaces`;

  /**
   * Get all spaces.
   */
  list(): Observable<Space[]> {
    return this.http.get<Space[]>(this.api);
  }

  /**
   * Get one space by ID.
   */
  get(id: number): Observable<Space> {
    return this.http.get<Space>(`${this.api}/${id}`);
  }

  /**
   * Create a space.
   * Accepts FormData when uploading an image,
   * or a regular object when no image is uploaded.
   */
  create(payload: FormData | SpacePayload): Observable<Space> {
  return this.http.post<Space>(this.api, payload);
}

  /**
   * Update an existing space.
   */
  update(
  id: number,
  payload: SpacePayload | FormData,
): Observable<Space> {
  return this.http.patch<Space>(
    `${this.api}/${id}`,
    payload,
  );
}

  /**
   * Delete a space by ID.
   */
  remove(id: number): Observable<void> {
    return this.http.delete<void>(`${this.api}/${id}`);
  }


  imageUrl(path: string | null | undefined): string | null {
  if (!path) return null;

  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  const serverUrl = environment.apiUrl.replace(/\/api\/?$/, '');

  return `${serverUrl}/${path.replace(/^\/+/, '')}`;
}
}
