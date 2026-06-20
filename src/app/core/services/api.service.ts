import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';

type Params = Record<string, string | number | boolean>;

/** Cliente HTTP base: centraliza la URL del backend. El JWT lo añade el interceptor. */
@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  get<T>(path: string, params?: Params): Observable<T> {
    return this.http.get<T>(`${this.base}${path}`, { params });
  }

  /** GET que devuelve un archivo binario (PDF/Excel) como Blob. */
  getBlob(path: string, params?: Params): Observable<Blob> {
    return this.http.get(`${this.base}${path}`, { params, responseType: 'blob' });
  }

  post<T>(path: string, body: unknown): Observable<T> {
    return this.http.post<T>(`${this.base}${path}`, body);
  }

  /** POST con cuerpo `application/x-www-form-urlencoded` (p. ej. login OAuth2). */
  postForm<T>(path: string, body: Record<string, string>): Observable<T> {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(body)) {
      params = params.set(key, value);
    }
    return this.http.post<T>(`${this.base}${path}`, params);
  }

  /** POST de un archivo como `multipart/form-data` (campo `file`). */
  postFile<T>(path: string, file: File): Observable<T> {
    const data = new FormData();
    data.append('file', file);
    return this.http.post<T>(`${this.base}${path}`, data);
  }

  patch<T>(path: string, body: unknown): Observable<T> {
    return this.http.patch<T>(`${this.base}${path}`, body);
  }

  put<T>(path: string, body: unknown): Observable<T> {
    return this.http.put<T>(`${this.base}${path}`, body);
  }

  delete<T>(path: string): Observable<T> {
    return this.http.delete<T>(`${this.base}${path}`);
  }
}
