import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { ApiService } from '../../../core/services/api.service';

export interface Documento {
  id: number;
  titulo: string;
  created_at: string;
  updated_at: string;
}

export interface VersionDocumento {
  id: number;
  documento_id: number;
  numero_version: number;
  archivo_url: string;
  formato: 'DOCX' | 'PDF';
  estado_analisis: 'PENDIENTE' | 'EN_PROCESO' | 'COMPLETADO' | 'ERROR';
  // CU-11: resumen/nivel del análisis (presentes en el historial cuando ya hay resultado).
  nivel_documento?: 'ALTO' | 'MEDIO' | 'BAJO' | null;
  resumen?: string | null;
  created_at: string;
}

/** Documentos del estudiante (CU-08 subir, CU-09 versionar, CU-11 historial). */
@Injectable({ providedIn: 'root' })
export class DocumentosService {
  private readonly api = inject(ApiService);

  listar(): Observable<Documento[]> {
    return this.api.get<Documento[]>('/documentos');
  }

  versiones(documentoId: number): Observable<VersionDocumento[]> {
    return this.api.get<VersionDocumento[]>(`/documentos/${documentoId}/versiones`);
  }

  /** CU-08: el backend recibe multipart (titulo + file). */
  subir(titulo: string, file: File): Observable<VersionDocumento> {
    const data = new FormData();
    data.append('titulo', titulo);
    data.append('file', file);
    return this.api.post<VersionDocumento>('/documentos', data);
  }

  /** CU-09: nueva versión (solo file). */
  subirVersion(documentoId: number, file: File): Observable<VersionDocumento> {
    return this.api.postFile<VersionDocumento>(`/documentos/${documentoId}/versiones`, file);
  }
}
