import { provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { catchError, firstValueFrom, of } from 'rxjs';

import { routes } from './app.routes';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { errorInterceptor } from './core/interceptors/error.interceptor';
import { AuthService } from './core/services/auth.service';
import { TokenService } from './core/services/token.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor, errorInterceptor])),
    // Si hay token al cargar la app, recupera el usuario actual (o cierra sesión si caducó).
    provideAppInitializer(() => {
      const tokens = inject(TokenService);
      const auth = inject(AuthService);
      if (!tokens.get()) {
        return Promise.resolve();
      }
      return firstValueFrom(
        auth.loadMe().pipe(
          catchError(() => {
            auth.logout();
            return of(null);
          }),
        ),
      );
    }),
  ],
};
