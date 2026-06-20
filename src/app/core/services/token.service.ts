import { Injectable } from '@angular/core';

const TOKEN_KEY = 'tesisguard.token';

/** Guarda y recupera el JWT de acceso (almacenamiento local del navegador). */
@Injectable({ providedIn: 'root' })
export class TokenService {
  get(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  set(token: string): void {
    localStorage.setItem(TOKEN_KEY, token);
  }

  clear(): void {
    localStorage.removeItem(TOKEN_KEY);
  }
}
