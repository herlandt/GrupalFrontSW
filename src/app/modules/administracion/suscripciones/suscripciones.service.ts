import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { Plan } from '../../../core/models/plan.model';
import { ApiService } from '../../../core/services/api.service';

interface PlanInput {
  nombre: string;
  precio: string;
  moneda: string;
  periodo_dias: number;
}

/** Planes de suscripción (CU-02). Listar es para cualquiera; crear/editar es admin. */
@Injectable({ providedIn: 'root' })
export class SuscripcionesService {
  private readonly api = inject(ApiService);

  listar(incluirInactivos = false): Observable<Plan[]> {
    return this.api.get<Plan[]>('/planes', { incluir_inactivos: incluirInactivos });
  }

  crear(data: PlanInput): Observable<Plan> {
    return this.api.post<Plan>('/planes', data);
  }

  actualizar(
    id: number,
    cambios: Partial<{ nombre: string; precio: string; periodo_dias: number; activo: boolean }>,
  ): Observable<Plan> {
    return this.api.patch<Plan>(`/planes/${id}`, cambios);
  }
}
