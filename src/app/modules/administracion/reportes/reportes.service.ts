import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { ApiService } from '../../../core/services/api.service';

export interface FilaPagoEstudiante {
  usuario_id: number;
  nombre: string;
  email: string;
  total_pagado: string;
  cantidad_pagos: number;
}

export interface ResumenReportes {
  ganancias: {
    total: string;
    moneda: string;
    cantidad_pagos: number;
  };
  por_estudiante: FilaPagoEstudiante[];
}

type Formato = 'pdf' | 'excel';

/** Reportes dinámicos (CU-05) + export del historial (CU-04). */
@Injectable({ providedIn: 'root' })
export class ReportesService {
  private readonly api = inject(ApiService);

  resumen(): Observable<ResumenReportes> {
    return this.api.get<ResumenReportes>('/reportes/resumen');
  }

  ganancias(formato: Formato): Observable<Blob> {
    return this.api.getBlob('/reportes/ganancias', { formato });
  }

  pagosPorEstudiante(formato: Formato): Observable<Blob> {
    return this.api.getBlob('/reportes/pagos-por-estudiante', { formato });
  }

  /** Export del propio historial (rol estudiante). */
  miHistorial(formato: Formato): Observable<Blob> {
    return this.api.getBlob('/reportes/mi-historial/export', { formato });
  }
}
