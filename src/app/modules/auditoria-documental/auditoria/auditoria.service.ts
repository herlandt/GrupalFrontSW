import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { ApiService } from '../../../core/services/api.service';

export type Categoria = 'COHERENCIA' | 'NORMAS' | 'SUGERENCIA';

export interface Observacion {
  id: number;
  categoria: Categoria;
  severidad: string;
  descripcion: string;
  ubicacion: string | null;
}

export interface Comparacion {
  version_anterior_id: number;
  version_anterior_numero: number;
  nivel_anterior: string;
  nivel_actual: string;
  tendencia: 'mejoro' | 'empeoro' | 'igual';
  features_delta: Record<string, number>;
}

export interface ResultadoAuditoria {
  id: number;
  version_id: number;
  nivel_documento: 'ALTO' | 'MEDIO' | 'BAJO';
  resumen: string | null;
  comparacion: Comparacion | null; // CU-09: comparación con la versión anterior
  created_at: string;
  observaciones: Observacion[];
}

export interface EstadoAnalisis {
  version_id: number;
  estado_analisis: 'PENDIENTE' | 'EN_PROCESO' | 'COMPLETADO' | 'ERROR';
  tiene_resultado: boolean;
}

/** Resultados de auditoría (CU-10, RF-01 coherencia, RF-02 normas). */
@Injectable({ providedIn: 'root' })
export class AuditoriaService {
  private readonly api = inject(ApiService);

  resultado(versionId: number, categoria?: Categoria): Observable<ResultadoAuditoria> {
    return this.api.get<ResultadoAuditoria>(
      `/auditoria/versiones/${versionId}/resultado`,
      categoria ? { categoria } : undefined,
    );
  }

  estado(versionId: number): Observable<EstadoAnalisis> {
    return this.api.get<EstadoAnalisis>(`/auditoria/versiones/${versionId}/estado`);
  }

  /** CU-08: dispara el análisis de la versión (idempotente). */
  analizar(versionId: number): Observable<EstadoAnalisis> {
    return this.api.post<EstadoAnalisis>(`/auditoria/versiones/${versionId}/analizar`, {});
  }
}
