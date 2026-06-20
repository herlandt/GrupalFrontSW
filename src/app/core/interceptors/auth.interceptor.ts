import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';

import { TokenService } from '../services/token.service';

/** Adjunta el header Authorization: Bearer <jwt> a cada petición saliente. */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = inject(TokenService).get();
  if (token) {
    req = req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
  }
  return next(req);
};
