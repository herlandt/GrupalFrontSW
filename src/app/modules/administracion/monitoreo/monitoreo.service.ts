import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { ApiService } from '../../../core/services/api.service';

export type NivelGeneral = 'ALTO' | 'MEDIO' | 'BAJO';
export type EstadoAvance = 'PENDIENTE' | 'APROBADO' | 'RECHAZADO';

export interface EstudianteResumen {
  id: number;
  nombre: string;
  email: string;
  activo: boolean;
  nivel_general: NivelGeneral;
}

export interface AvanceFormal {
  id: number;
  usuario_id: number;
  etapa: string;
  estado: EstadoAvance;
  aprobado_por_id: number | null;
  fecha_aprobacion: string | null;
  created_at: string;
}

export interface SesionResumen {
  id: number;
  fecha_inicio: string;
  nivel_dificultad: string;
  estado: string;
  nivel_defensa: NivelGeneral | null;
}

export interface VersionResumen {
  id: number;
  numero_version: number;
  estado_analisis: string;
  nivel_documento: NivelGeneral | null;
  resumen: string | null;
  created_at: string;
}

export interface EstudianteDetalle {
  estudiante: EstudianteResumen;
  nivel_general: NivelGeneral;
  simulaciones: SesionResumen[];
  versiones: VersionResumen[];
  avances: AvanceFormal[];
}

/** Monitoreo de estudiantes y avance formal (CU-07, RF-08). Solo admin. */
@Injectable({ providedIn: 'root' })
export class MonitoreoService {
  private readonly api = inject(ApiService);

  listar(): Observable<EstudianteResumen[]> {
    return this.api.get<EstudianteResumen[]>('/monitoreo/estudiantes');
  }

  detalle(usuarioId: number): Observable<EstudianteDetalle> {
    return this.api.get<EstudianteDetalle>(`/monitoreo/estudiantes/${usuarioId}`);
  }

  /** Descarga el reporte PDF del estudiante seleccionado (CU-07). */
  exportar(usuarioId: number): Observable<Blob> {
    return this.api.getBlob(`/monitoreo/estudiantes/${usuarioId}/export`);
  }

  registrarAvance(usuarioId: number, etapa: string): Observable<AvanceFormal> {
    return this.api.post<AvanceFormal>(`/monitoreo/estudiantes/${usuarioId}/avances`, { etapa });
  }

  aprobar(avanceId: number): Observable<AvanceFormal> {
    return this.api.post<AvanceFormal>(`/monitoreo/avances/${avanceId}/aprobar`, {});
  }

  rechazar(avanceId: number): Observable<AvanceFormal> {
    return this.api.post<AvanceFormal>(`/monitoreo/avances/${avanceId}/rechazar`, {});
  }
}
