import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { ApiService } from '../../../core/services/api.service';

export interface SuscripcionEstado {
  estado: string;
  plan_id: number;
  fecha_inicio: string | null;
  fecha_fin: string | null;
}

export interface PagoHistorial {
  id: number;
  monto: string;
  moneda: string;
  estado: string;
  created_at: string;
}

/** Pagos y suscripción del estudiante (CU-03, CU-04). */
@Injectable({ providedIn: 'root' })
export class PagosService {
  private readonly api = inject(ApiService);

  miSuscripcion(): Observable<SuscripcionEstado | null> {
    return this.api.get<SuscripcionEstado | null>('/pagos/mi-suscripcion');
  }

  checkout(planId: number): Observable<{ checkout_url: string }> {
    return this.api.post('/pagos/checkout', { plan_id: planId });
  }

  /** Verifica el pago contra Stripe al volver del checkout y activa la suscripción. */
  confirmar(sessionId: string): Observable<SuscripcionEstado | null> {
    return this.api.post<SuscripcionEstado | null>('/pagos/confirmar', { session_id: sessionId });
  }

  /** Historial del estudiante (CU-04), filtrable por periodo (ISO) y estado. */
  historial(desde?: string, hasta?: string, estado?: string): Observable<PagoHistorial[]> {
    const params: Record<string, string> = {};
    if (desde) params['desde'] = desde;
    if (hasta) params['hasta'] = hasta;
    if (estado) params['estado'] = estado;
    return this.api.get<PagoHistorial[]>('/pagos/historial', params);
  }
}
