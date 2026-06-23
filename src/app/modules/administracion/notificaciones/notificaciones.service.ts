import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { Notificacion } from '../../../core/models/notificacion.model';
import { ApiService } from '../../../core/services/api.service';

/** Notificaciones in-app del usuario (CU-02). */
@Injectable({ providedIn: 'root' })
export class NotificacionesService {
  private readonly api = inject(ApiService);

  listar(): Observable<Notificacion[]> {
    return this.api.get<Notificacion[]>('/notificaciones');
  }

  marcarLeida(id: number): Observable<Notificacion> {
    return this.api.post<Notificacion>(`/notificaciones/${id}/leida`, {});
  }
}
