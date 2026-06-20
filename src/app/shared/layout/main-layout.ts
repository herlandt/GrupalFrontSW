import { Component, computed, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { AuthService } from '../../core/services/auth.service';

/** Layout del área autenticada: barra lateral de navegación (según rol) + contenido. */
@Component({
  selector: 'app-main-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="flex h-full">
      <aside class="flex w-60 shrink-0 flex-col bg-slate-900 p-4 text-slate-100">
        <h1 class="mb-1 text-lg font-semibold">TesisGuard</h1>
        @if (usuario(); as u) {
          <p class="mb-5 truncate text-xs text-slate-400">{{ u.nombre }} · {{ u.rol }}</p>
        }
        <nav class="flex flex-col gap-1 text-sm">
          <a
            routerLink="/app/administracion/dashboard"
            routerLinkActive="bg-slate-700"
            class="rounded px-3 py-2 hover:bg-slate-800"
            >Dashboard</a
          >
          <a
            routerLink="/app/administracion/usuarios"
            routerLinkActive="bg-slate-700"
            class="rounded px-3 py-2 hover:bg-slate-800"
            >Mi perfil</a
          >

          @if (esAdmin()) {
            <a
              routerLink="/app/administracion/suscripciones"
              routerLinkActive="bg-slate-700"
              class="rounded px-3 py-2 hover:bg-slate-800"
              >Tarifas</a
            >
            <a
              routerLink="/app/administracion/reportes"
              routerLinkActive="bg-slate-700"
              class="rounded px-3 py-2 hover:bg-slate-800"
              >Reportes</a
            >
            <a
              routerLink="/app/administracion/monitoreo"
              routerLinkActive="bg-slate-700"
              class="rounded px-3 py-2 hover:bg-slate-800"
              >Monitoreo</a
            >
            <a
              routerLink="/app/auditoria-documental/etica"
              routerLinkActive="bg-slate-700"
              class="rounded px-3 py-2 hover:bg-slate-800"
              >Alertas de ética</a
            >
          } @else {
            <a
              routerLink="/app/administracion/pagos"
              routerLinkActive="bg-slate-700"
              class="rounded px-3 py-2 hover:bg-slate-800"
              >Mi suscripción</a
            >
            <a
              routerLink="/app/auditoria-documental/documentos"
              routerLinkActive="bg-slate-700"
              class="rounded px-3 py-2 hover:bg-slate-800"
              >Documentos</a
            >
            <a
              routerLink="/app/auditoria-documental/auditoria"
              routerLinkActive="bg-slate-700"
              class="rounded px-3 py-2 hover:bg-slate-800"
              >Informe de auditoría</a
            >
            <a
              routerLink="/app/auditoria-documental/etica"
              routerLinkActive="bg-slate-700"
              class="rounded px-3 py-2 hover:bg-slate-800"
              >Mis alertas</a
            >
            <a
              routerLink="/app/simulador/simulaciones"
              routerLinkActive="bg-slate-700"
              class="rounded px-3 py-2 hover:bg-slate-800"
              >Simulador</a
            >
            <a
              routerLink="/app/simulador/tribunal"
              routerLinkActive="bg-slate-700"
              class="rounded px-3 py-2 hover:bg-slate-800"
              >Tribunal virtual</a
            >
          }
        </nav>
        <button
          type="button"
          (click)="salir()"
          class="mt-auto pt-6 text-left text-sm text-slate-400 hover:text-white"
        >
          Cerrar sesión
        </button>
      </aside>
      <main class="flex-1 overflow-auto bg-slate-50 p-6">
        <router-outlet />
      </main>
    </div>
  `,
})
export class MainLayout {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly usuario = this.auth.usuario;
  protected readonly esAdmin = computed(() => this.usuario()?.rol === 'ADMINISTRADOR');

  salir(): void {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}
