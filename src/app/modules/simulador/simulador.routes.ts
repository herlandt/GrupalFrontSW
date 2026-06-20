import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'simulaciones',
    loadComponent: () => import('./simulaciones/simulaciones').then((m) => m.Simulaciones),
  },
  { path: 'tribunal', loadComponent: () => import('./tribunal/tribunal').then((m) => m.Tribunal) },
  {
    path: 'biometrico',
    loadComponent: () => import('./biometrico/biometrico').then((m) => m.Biometrico),
  },
  { path: '', pathMatch: 'full', redirectTo: 'simulaciones' },
];
