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

  obtener(): Observable<DashboardResponse> {
    return this.api.get<DashboardResponse>('/dashboard');
  }
}
