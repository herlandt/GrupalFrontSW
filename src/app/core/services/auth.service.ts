import { Injectable, inject, signal } from '@angular/core';
import { Observable, switchMap, tap } from 'rxjs';

import { Rol, Usuario } from '../models/user.model';
import { ApiService } from './api.service';
import { TokenService } from './token.service';

interface TokenResponse {
  access_token: string;
  token_type: string;
}

/** Autenticación (CU-01): login/logout, registro, perfil actual y reset. */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly api = inject(ApiService);
  private readonly tokens = inject(TokenService);

  private readonly _usuario = signal<Usuario | null>(null);
  readonly usuario = this._usuario.asReadonly();

  estaAutenticado(): boolean {
    return this.tokens.get() !== null;
  }

  tieneRol(rol: Rol): boolean {
    return this._usuario()?.rol === rol;
  }

  register(nombre: string, email: string, password: string): Observable<Usuario> {
    return this.api.post<Usuario>('/auth/register', { nombre, email, password });
  }

  login(email: string, password: string): Observable<Usuario> {
    return this.api.postForm<TokenResponse>('/auth/login', { username: email, password }).pipe(
      tap((res) => this.tokens.set(res.access_token)),
      switchMap(() => this.loadMe()),
    );
  }

  loadMe(): Observable<Usuario> {
    return this.api.get<Usuario>('/usuarios/me').pipe(tap((user) => this._usuario.set(user)));
  }

  requestReset(email: string): Observable<{ detail: string }> {
    return this.api.post('/auth/password-reset/request', { email });
  }

  confirmReset(token: string, newPassword: string): Observable<{ detail: string }> {
    return this.api.post('/auth/password-reset/confirm', { token, new_password: newPassword });
  }

  setUsuario(user: Usuario): void {
    this._usuario.set(user);
  }

  logout(): void {
    // CU-01: registra el cierre de sesión en el backend (bitácora) antes de descartar el
    // token. Con JWT stateless el token se invalida en el cliente; el evento queda auditado.
    if (this.tokens.get()) {
      this.api
        .post('/auth/logout', {})
        .subscribe({ next: () => undefined, error: () => undefined });
    }
    this.tokens.clear();
    this._usuario.set(null);
  }
}
