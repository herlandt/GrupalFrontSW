import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';

import { Notificacion } from '../../../core/models/notificacion.model';
import { NotificacionesService } from './notificaciones.service';

/** Bandeja de notificaciones in-app del usuario (CU-02). */
@Component({
  selector: 'app-notificaciones',
  imports: [DatePipe],
  template: `
    <section class="max-w-3xl">
      <h2 class="mb-1 text-xl font-semibold text-slate-800">Notificaciones</h2>
      <p class="mb-6 text-sm text-slate-500">
        Avisos del sistema (cambios de tarifa, etc.). {{ noLeidas() }} sin leer.
      </p>

      @if (items().length) {
        <ul class="space-y-3">
          @for (n of items(); track n.id) {
            <li
              class="rounded-xl border bg-white p-4"
              [class.border-slate-200]="n.leida"
              [class.border-indigo-300]="!n.leida"
              [class.bg-indigo-50]="!n.leida"
            >
              <div class="flex items-start justify-between gap-4">
                <div>
                  <p class="font-medium text-slate-800">
                    @if (!n.leida) {
                      <span class="mr-1 inline-block h-2 w-2 rounded-full bg-indigo-500"></span>
                    }
                    {{ n.titulo }}
                  </p>
                  <p class="mt-1 text-sm text-slate-600">{{ n.cuerpo }}</p>
                  <p class="mt-1 text-xs text-slate-400">{{ n.created_at | date: 'short' }}</p>
                </div>
                @if (!n.leida) {
                  <button
                    (click)="marcar(n)"
                    class="shrink-0 rounded-lg border border-slate-300 px-3 py-1 text-xs text-slate-700 hover:bg-slate-50"
                  >
                    Marcar leída
                  </button>
                }
              </div>
            </li>
          }
        </ul>
      } @else {
        <p class="rounded-lg bg-slate-100 px-4 py-3 text-sm text-slate-600">
          No tienes notificaciones.
        </p>
      }
    </section>
  `,
})
export class Notificaciones {
  private readonly srv = inject(NotificacionesService);
  protected readonly items = signal<Notificacion[]>([]);
  protected readonly noLeidas = computed(() => this.items().filter((n) => !n.leida).length);

  constructor() {
    this.cargar();
  }

  private cargar(): void {
    this.srv.listar().subscribe((n) => this.items.set(n));
  }

  protected marcar(n: Notificacion): void {
    this.srv.marcarLeida(n.id).subscribe(() => this.cargar());
  }
}
