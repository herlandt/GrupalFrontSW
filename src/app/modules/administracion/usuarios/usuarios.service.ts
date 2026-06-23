import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { Usuario } from '../../../core/models/user.model';
import { ApiService } from '../../../core/services/api.service';

/** Operaciones de perfil del usuario actual (CU-01). */
@Injectable({ providedIn: 'root' })
export class UsuariosService {
  private readonly api = inject(ApiService);

  actualizarPerfil(nombre: string, preferencias?: Record<string, unknown>): Observable<Usuario> {
    const body: Record<string, unknown> = { nombre };
    if (preferencias !== undefined) body['preferencias'] = preferencias;
    return this.api.patch<Usuario>('/usuarios/me', body);
  }

  subirFoto(file: File): Observable<Usuario> {
    return this.api.postFile<Usuario>('/usuarios/me/foto', file);
  }
}
