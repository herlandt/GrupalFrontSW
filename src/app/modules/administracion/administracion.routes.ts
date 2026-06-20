import { Routes } from '@angular/router';

import { roleGuard } from '../../core/guards/role.guard';

export const routes: Routes = [
  {
    path: 'dashboard',
    loadComponent: () => import('./dashboard/dashboard').then((m) => m.Dashboard),
  },
  { path: 'usuarios', loadComponent: () => import('./usuarios/usuarios').then((m) => m.Usuarios) },
  {
    path: 'suscripciones',
    canActivate: [roleGuard('ADMINISTRADOR')],
    loadComponent: () => import('./suscripciones/suscripciones').then((m) => m.Suscripciones),
  },
  {
    path: 'pagos',
    canActivate: [roleGuard('ESTUDIANTE')],
    loadComponent: () => import('./pagos/pagos').then((m) => m.Pagos),
  },
  {
    path: 'reportes',
    canActivate: [roleGuard('ADMINISTRADOR')],
    loadComponent: () => import('./reportes/reportes').then((m) => m.Reportes),
  },
  {
    path: 'monitoreo',
    canActivate: [roleGuard('ADMINISTRADOR')],
    loadComponent: () => import('./monitoreo/monitoreo').then((m) => m.Monitoreo),
  },
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
];
