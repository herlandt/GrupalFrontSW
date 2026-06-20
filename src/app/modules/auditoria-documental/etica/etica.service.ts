import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { AlertaEtica, EstadoAlertaEtica } from '../../../core/models/alerta-etica.model';
import { ApiService } from '../../../core/services/api.service';

/** Alertas de ética (CU-12). Bandeja para admin; "mis-alertas" para estudiante. */
@Injectable({ providedIn: 'root' })
export class EticaService {
  private readonly api = inject(ApiService);

  listarAdmin(): Observable<AlertaEtica[]> {
    return this.api.get<AlertaEtica[]>('/etica/alertas');
  }

  misAlertas(): Observable<AlertaEtica[]> {
    return this.api.get<AlertaEtica[]>('/etica/mis-alertas');
  }

  resolver(id: number, estado: EstadoAlertaEtica): Observable<AlertaEtica> {
    return this.api.patch<AlertaEtica>(`/etica/alertas/${id}/resolver`, { estado });
  }
}
