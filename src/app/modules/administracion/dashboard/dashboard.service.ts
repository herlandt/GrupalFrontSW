import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { ApiService } from '../../../core/services/api.service';

export interface DashboardResponse {
  rol: 'ESTUDIANTE' | 'ADMINISTRADOR';
  // Diccionario abierto: cada fuente aporta su payload bajo su nombre.
  metricas: Record<string, Record<string, unknown>>;
}

/** Dashboard de progreso (CU-06, RF-08/09). */
@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly api = inject(ApiService);

  obtener(opts?: {
    modulo?: string;
    desde?: string;
    hasta?: string;
  }): Observable<DashboardResponse> {
    const params: Record<string, string> = {};
    if (opts?.modulo) params['modulo'] = opts.modulo;
    if (opts?.desde) params['desde'] = opts.desde;
    if (opts?.hasta) params['hasta'] = opts.hasta;
    return this.api.get<DashboardResponse>('/dashboard', params);
  }
}
