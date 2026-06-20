import { Routes } from '@angular/router';

import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'login' },
  { path: 'login', loadComponent: () => import('./pages/login/login').then((m) => m.Login) },
  {
    path: 'registro',
    loadComponent: () => import('./pages/registro/registro').then((m) => m.Registro),
  },
  {
    path: 'recuperar',
    loadComponent: () => import('./pages/recuperar/recuperar').then((m) => m.Recuperar),
  },
  { path: 'reset', loadComponent: () => import('./pages/reset/reset').then((m) => m.Reset) },
  {
    path: 'app',
    canActivate: [authGuard],
    loadComponent: () => import('./shared/layout/main-layout').then((m) => m.MainLayout),
    children: [
      {
        path: 'administracion',
        loadChildren: () =>
          import('./modules/administracion/administracion.routes').then((m) => m.routes),
      },
      {
        path: 'auditoria-documental',
        loadChildren: () =>
          import('./modules/auditoria-documental/auditoria-documental.routes').then(
            (m) => m.routes,
          ),
      },
      {
        path: 'simulador',
        canActivate: [roleGuard('ESTUDIANTE')],
        loadChildren: () => import('./modules/simulador/simulador.routes').then((m) => m.routes),
      },
      { path: '', pathMatch: 'full', redirectTo: 'administracion/usuarios' },
    ],
  },
  { path: '**', redirectTo: 'login' },
];
