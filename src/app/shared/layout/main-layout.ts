import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';

import { AuthService } from '../../core/services/auth.service';

/** Layout del área autenticada: barra lateral de navegación (según rol) + contenido.
 *  En móvil la barra lateral es un cajón (drawer) que se abre con el botón de menú; en
 *  pantallas md+ queda fija a la izquierda. */
@Component({
  selector: 'app-main-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="flex h-full flex-col md:flex-row">
      <!-- Barra superior SOLO en móvil: título + botón de menú -->
      <header
        class="flex items-center justify-between bg-slate-900 px-4 py-3 text-slate-100 md:hidden"
      >
        <span class="text-lg font-semibold">TesisGuard</span>
        <button type="button" (click)="alternarMenu()" aria-label="Abrir menú" class="-mr-1 p-1">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="2"
          >
            <path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </header>

      <!-- Fondo oscuro al abrir el menú en móvil (toca para cerrar) -->
      @if (menuAbierto()) {
        <div
          class="fixed inset-0 z-30 bg-black/40 md:hidden"
          (click)="cerrarMenu()"
          aria-hidden="true"
        ></div>
      }

      <aside
        class="fixed inset-y-0 left-0 z-40 flex w-60 shrink-0 flex-col overflow-y-auto bg-slate-900 p-4 text-slate-100 transition-transform md:static md:translate-x-0"
        [class.-translate-x-full]="!menuAbierto()"
      >
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
          <a
            routerLink="/app/administracion/notificaciones"
            routerLinkActive="bg-slate-700"
            class="rounded px-3 py-2 hover:bg-slate-800"
            >Notificaciones</a
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
      <main class="flex-1 overflow-auto bg-slate-50 p-4 sm:p-6">
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
  protected readonly menuAbierto = signal(false);

  constructor() {
    // Cierra el cajón al navegar: no debe quedar abierto tras elegir una opción en móvil.
    this.router.events
      .pipe(
        filter((e) => e instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.menuAbierto.set(false));
  }

  alternarMenu(): void {
    this.menuAbierto.update((v) => !v);
  }

  cerrarMenu(): void {
    this.menuAbierto.set(false);
  }

  salir(): void {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}
