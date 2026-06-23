import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { ApiService } from '../../../core/services/api.service';

export type NivelDificultad = 'EXPLORACION' | 'ESTANDAR' | 'RIGUROSO';
export type EstadoSesion = 'EN_CURSO' | 'FINALIZADA' | 'CANCELADA';
export type NivelDefensa = 'ALTO' | 'MEDIO' | 'BAJO';

export interface Sesion {
  id: number;
  usuario_id: number;
  version_documento_id: number;
  nivel_dificultad: NivelDificultad;
  estado: EstadoSesion;
  nivel_defensa: NivelDefensa | null; // CU-15: resultado general de la sesión
  fecha_inicio: string;
  fecha_fin: string | null;
  created_at: string;
}

export interface ResultadoSimulacion {
  id: number;
  sesion_id: number;
  nivel_defensa: NivelDefensa;
  oratoria_score: number | null;
  comunicacion_no_verbal_score: number | null;
  dominio_score: number | null;
  coherencia_documento_score: number | null; // 0..100: discurso vs documento
  confianza: number | null;
  resumen: string | null;
  created_at: string;
}

/** Sesiones de simulación (CU-13 iniciar/cerrar, CU-15 historial). */
@Injectable({ providedIn: 'root' })
export class SimulacionesService {
  private readonly api = inject(ApiService);

  iniciar(versionDocumentoId: number, nivel: NivelDificultad): Observable<Sesion> {
    return this.api.post<Sesion>('/simulaciones', {
      version_documento_id: versionDocumentoId,
      nivel_dificultad: nivel,
    });
  }

  historial(): Observable<Sesion[]> {
    return this.api.get<Sesion[]>('/simulaciones');
  }

  detalle(id: number): Observable<Sesion> {
    return this.api.get<Sesion>(`/simulaciones/${id}`);
  }

  finalizar(id: number): Observable<Sesion> {
    return this.api.post<Sesion>(`/simulaciones/${id}/finalizar`, {});
  }

  cancelar(id: number): Observable<Sesion> {
    return this.api.post<Sesion>(`/simulaciones/${id}/cancelar`, {});
  }

  /** Fase 4 (CU-14): genera el resultado y el nivel de defensa (IA evaluadora). */
  generarResultado(id: number): Observable<ResultadoSimulacion> {
    return this.api.post<ResultadoSimulacion>(`/simulaciones/${id}/resultado`, {});
  }

  obtenerResultado(id: number): Observable<ResultadoSimulacion> {
    return this.api.get<ResultadoSimulacion>(`/simulaciones/${id}/resultado`);
  }
}
