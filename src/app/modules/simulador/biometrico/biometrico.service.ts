import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { ApiService } from '../../../core/services/api.service';
import { TokenService } from '../../../core/services/token.service';
import { environment } from '../../../../environments/environment';

export interface MetricaBiometrica {
  id: number;
  sesion_id: number;
  postura_score: string | null; // Decimal serializado como string
  muletillas_conteo: number;
  ritmo_wpm: number | null;
  pausas_largas_conteo: number;
  contacto_visual_pct: string | null;
  momento: string;
  created_at: string;
}

export interface ResumenBiometrico {
  sesion_id: number;
  intervalos: number;
  postura_score_promedio: string | null;
  contacto_visual_pct_promedio: string | null;
  muletillas_total: number;
  pausas_total: number;
  ritmo_wpm_promedio: number | null;
}

export interface SegmentoIn {
  audio_url?: string;
  video_url?: string;
  momento?: string;
}

/** Métricas biométricas de la simulación — ExpoLens (CU-14, RF-03/04/05). */
@Injectable({ providedIn: 'root' })
export class BiometricoService {
  private readonly api = inject(ApiService);
  private readonly tokens = inject(TokenService);

  /** URL del WebSocket de audio (AWS Transcribe Streaming). El JWT va como query param
   *  porque el handshake WebSocket del navegador no admite cabeceras Authorization. */
  audioWsUrl(sesionId: number): string {
    const http = environment.apiUrl.startsWith('http')
      ? environment.apiUrl
      : `${location.origin}${environment.apiUrl}`;
    const ws = http.replace(/^http/, 'ws');
    const token = this.tokens.get() ?? '';
    return `${ws}/biometrico/sesiones/${sesionId}/audio?token=${encodeURIComponent(token)}`;
  }

  analizarSegmento(sesionId: number, body: SegmentoIn): Observable<MetricaBiometrica> {
    return this.api.post<MetricaBiometrica>(`/biometrico/sesiones/${sesionId}/segmentos`, body);
  }

  metricas(sesionId: number): Observable<MetricaBiometrica[]> {
    return this.api.get<MetricaBiometrica[]>(`/biometrico/sesiones/${sesionId}/metricas`);
  }

  resumen(sesionId: number): Observable<ResumenBiometrico> {
    return this.api.get<ResumenBiometrico>(`/biometrico/sesiones/${sesionId}/resumen`);
  }

  /** Envía un frame de la cámara (imagen JPEG) para análisis con AWS Rekognition. */
  analizarFrame(sesionId: number, frame: Blob): Observable<MetricaBiometrica> {
    const data = new FormData();
    data.append('file', frame, 'frame.jpg');
    return this.api.post<MetricaBiometrica>(`/biometrico/sesiones/${sesionId}/frame`, data);
  }
}
