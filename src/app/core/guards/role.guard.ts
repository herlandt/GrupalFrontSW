import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { Rol } from '../models/user.model';
import { AuthService } from '../services/auth.service';

/** Restringe una ruta a un rol concreto (estudiante o administrador). */
export function roleGuard(rol: Rol): CanActivateFn {
  return () => {
    const auth = inject(AuthService);
    const router = inject(Router);
    // Autenticado pero sin el rol: lo mandamos a una ruta permitida de /app,
    // no a /login (no se cerró la sesión).
    return auth.tieneRol(rol) ? true : router.createUrlTree(['/app']);
  };
}
