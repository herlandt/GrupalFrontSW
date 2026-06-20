import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { ApiService } from '../../../core/services/api.service';

export interface Pregunta {
  id: number;
  sesion_id: number;
  orden: number;
  texto: string;
  created_at: string;
}

export interface Evaluacion {
  id: number;
  respuesta_id: number;
  puntuacion: string; // Decimal serializado como string
  observaciones: string | null;
  profundidad: string | null;
  created_at: string;
}

/** Tribunal virtual (CU-16 responder, CU-17 evaluación, RF-06/07). */
@Injectable({ providedIn: 'root' })
export class TribunalService {
  private readonly api = inject(ApiService);

  generarPreguntas(sesionId: number): Observable<Pregunta[]> {
    return this.api.post<Pregunta[]>(`/tribunal/sesiones/${sesionId}/preguntas`, {});
  }

  listarPreguntas(sesionId: number): Observable<Pregunta[]> {
    return this.api.get<Pregunta[]>(`/tribunal/sesiones/${sesionId}/preguntas`);
  }

  responder(
    preguntaId: number,
    texto: string | null,
    audioUrl?: string | null,
  ): Observable<Evaluacion> {
    return this.api.post<Evaluacion>(`/tribunal/preguntas/${preguntaId}/respuesta`, {
      texto: texto || null,
      audio_url: audioUrl || null,
    });
  }

  evaluacion(preguntaId: number): Observable<Evaluacion> {
    return this.api.get<Evaluacion>(`/tribunal/preguntas/${preguntaId}/evaluacion`);
  }
}
