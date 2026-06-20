import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';

import { AlertaEtica, EstadoAlertaEtica } from '../../../core/models/alerta-etica.model';
import { AuthService } from '../../../core/services/auth.service';
import { EticaService } from './etica.service';

/** Alertas de ética (CU-12). Bandeja (admin) o aviso (estudiante). */
@Component({
  selector: 'app-etica',
  imports: [DatePipe],
  template: `
    <section class="max-w-4xl">
      <h2 class="mb-1 text-xl font-semibold text-slate-800">Alertas de ética e integridad</h2>
      <p class="mb-6 text-sm text-slate-500">
        @if (esAdmin()) {
          Revisa y resuelve las alertas detectadas.
        } @else {
          Estado de las alertas de integridad de tus documentos.
        }
      </p>

      @if (error(); as e) {
        <p class="mb-4 rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">{{ e }}</p>
      }

      <div class="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table class="w-full min-w-[44rem] text-sm">
          <thead class="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th class="px-4 py-3">Tipo</th>
              <th class="px-4 py-3">Fragmento</th>
              <th class="px-4 py-3">Estado</th>
              <th class="px-4 py-3">Fecha</th>
              @if (esAdmin()) {
                <th class="px-4 py-3">Acciones</th>
              }
            </tr>
          </thead>
          <tbody>
            @for (a of alertas(); track a.id) {
              <tr class="border-t border-slate-100">
                <td class="px-4 py-3 font-medium text-slate-800">{{ a.tipo }}</td>
                <td class="max-w-xs truncate px-4 py-3 text-slate-600">{{ a.fragmento }}</td>
                <td class="px-4 py-3">
                  <span class="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700">
                    {{ a.estado }}
                  </span>
                </td>
                <td class="px-4 py-3 text-slate-500">{{ a.created_at | date: 'short' }}</td>
                @if (esAdmin()) {
                  <td class="space-x-2 px-4 py-3">
                    <button
                      (click)="resolver(a, 'EN_REVISION')"
                      class="text-amber-600 hover:underline"
                    >
                      Revisar
                    </button>
                    <button
                      (click)="resolver(a, 'CONFIRMADA')"
                      class="text-red-600 hover:underline"
                    >
                      Confirmar
                    </button>
                    <button
                      (click)="resolver(a, 'DESESTIMADA')"
                      class="text-emerald-600 hover:underline"
                    >
                      Desestimar
                    </button>
                  </td>
                }
              </tr>
            } @empty {
              <tr>
                <td colspan="5" class="px-4 py-6 text-center text-slate-400">
                  {{ cargando() ? 'Cargando…' : 'Sin alertas.' }}
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
      @if (mensaje()) {
        <p class="mt-4 text-sm text-emerald-600">{{ mensaje() }}</p>
      }
    </section>
  `,
})
export class Etica {
  private readonly service = inject(EticaService);
  private readonly auth = inject(AuthService);

  protected readonly esAdmin = computed(() => this.auth.usuario()?.rol === 'ADMINISTRADOR');
  protected readonly alertas = signal<AlertaEtica[]>([]);
  protected readonly mensaje = signal<string | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly cargando = signal(false);

  constructor() {
    this.cargar();
  }

  private cargar(): void {
    this.error.set(null);
    this.cargando.set(true);
    const fuente = this.esAdmin() ? this.service.listarAdmin() : this.service.misAlertas();
    fuente.subscribe({
      next: (a) => {
        this.alertas.set(a);
        this.cargando.set(false);
      },
      error: (e) => {
        this.cargando.set(false);
        this.error.set(
          e.status === 402
            ? 'Necesitas una suscripción activa para ver tus alertas.'
            : 'No se pudieron cargar las alertas.',
        );
      },
    });
  }

  resolver(a: AlertaEtica, estado: EstadoAlertaEtica): void {
    this.service.resolver(a.id, estado).subscribe({
      next: () => {
        this.mensaje.set(`Alerta #${a.id} marcada como ${estado}.`);
        this.cargar();
      },
      error: () => this.error.set(`No se pudo actualizar la alerta #${a.id}.`),
    });
  }
}
