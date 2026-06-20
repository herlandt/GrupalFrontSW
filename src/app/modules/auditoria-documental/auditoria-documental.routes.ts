import { Routes } from '@angular/router';

import { roleGuard } from '../../core/guards/role.guard';

export const routes: Routes = [
  {
    path: 'documentos',
    canActivate: [roleGuard('ESTUDIANTE')],
    loadComponent: () => import('./documentos/documentos').then((m) => m.Documentos),
  },
  {
    path: 'auditoria',
    canActivate: [roleGuard('ESTUDIANTE')],
    loadComponent: () => import('./auditoria/auditoria').then((m) => m.Auditoria),
  },
  // 'etica' es compartida (admin: bandeja · estudiante: sus alertas); el componente
  // elige el endpoint por rol, así que no lleva roleGuard.
  { path: 'etica', loadComponent: () => import('./etica/etica').then((m) => m.Etica) },
  { path: '', pathMatch: 'full', redirectTo: 'documentos' },
];
