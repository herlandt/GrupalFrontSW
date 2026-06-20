import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

import { AuthService } from '../services/auth.service';

/**
 * Manejo central de errores HTTP. Ante un 401 con sesión activa (JWT caducado a
 * mitad de uso), cierra sesión y redirige a /login. Re-lanza el error para que cada
 * componente pueda seguir mostrando su propio mensaje si lo necesita.
 */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return next(req).pipe(
    catchError((err: HttpErrorResponse) => {
      // Solo si había sesión: evita interferir con el 401 del propio login.
      if (err.status === 401 && auth.estaAutenticado()) {
        auth.logout();
        router.navigate(['/login']);
      }
      return throwError(() => err);
    }),
  );
};
