import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { Plan } from '../../../core/models/plan.model';
import { ReportesService } from '../reportes/reportes.service';
import { SuscripcionesService } from '../suscripciones/suscripciones.service';
import { PagoHistorial, PagosService, SuscripcionEstado } from './pagos.service';

/** Mi Suscripción (CU-03/04): estado, elegir plan y pagar (Stripe), historial. */
@Component({
  selector: 'app-pagos',
  imports: [DatePipe],
  template: `
    <section class="max-w-3xl">
      <h2 class="mb-6 text-xl font-semibold text-slate-800">Mi suscripción</h2>

      @if (aviso()) {
        <p class="mb-4 rounded-lg bg-slate-100 px-4 py-3 text-sm text-slate-700">{{ aviso() }}</p>
      }

      @if (suscripcion(); as s) {
        <!-- Ya tiene una suscripción activa: mostramos el plan actual, sin pagar de nuevo -->
        <div class="rounded-xl border border-emerald-200 bg-emerald-50 p-5">
          <div class="flex items-center gap-2">
            <span class="rounded-full bg-emerald-600 px-2 py-0.5 text-xs font-medium text-white"
              >Plan activo</span
            >
            @if (s.fecha_fin) {
              <span class="text-sm text-emerald-800"
                >vence el {{ s.fecha_fin | date: 'mediumDate' }}</span
              >
            }
          </div>
          <p class="mt-2 text-sm text-emerald-900">
            Tu suscripción está activa. Tienes acceso a las funciones de TesisGuard.
          </p>
        </div>
      } @else {
        <!-- Sin suscripción activa: elegir plan y pagar -->
        <h3 class="mb-3 text-sm font-semibold text-slate-700">Elige un plan</h3>
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          @for (plan of planes(); track plan.id) {
            <div class="rounded-xl border border-slate-200 bg-white p-5">
              <p class="font-medium text-slate-800">{{ plan.nombre }}</p>
              <p class="my-2 text-2xl font-semibold text-slate-900">
                {{ plan.precio }}
                <span class="text-sm font-normal text-slate-500">{{ plan.moneda }}</span>
              </p>
              <p class="mb-4 text-xs text-slate-500">{{ plan.periodo_dias }} días de acceso</p>
              <button
                (click)="pagar(plan)"
                [disabled]="procesando()"
                class="w-full rounded-lg bg-slate-900 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
              >
                {{ procesando() ? 'Redirigiendo…' : 'Pagar y suscribirme' }}
              </button>
            </div>
          }
        </div>
      }

      @if (historial().length) {
        <div class="mb-3 mt-8 flex items-center justify-between">
          <h3 class="text-sm font-semibold text-slate-700">Historial de pagos</h3>
          <div class="flex gap-2">
            <button
              (click)="exportar('pdf')"
              class="rounded-lg border border-slate-300 px-3 py-1 text-xs text-slate-700 hover:bg-slate-50"
            >
              PDF
            </button>
            <button
              (click)="exportar('excel')"
              class="rounded-lg border border-slate-300 px-3 py-1 text-xs text-slate-700 hover:bg-slate-50"
            >
              Excel
            </button>
          </div>
        </div>
        <div class="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table class="w-full min-w-[30rem] text-sm">
            <thead class="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>
                <th class="px-4 py-3">Fecha</th>
                <th class="px-4 py-3">Monto</th>
                <th class="px-4 py-3">Estado</th>
              </tr>
            </thead>
            <tbody>
              @for (pago of historial(); track pago.id) {
                <tr class="border-t border-slate-100">
                  <td class="px-4 py-3 text-slate-600">{{ pago.created_at | date: 'medium' }}</td>
                  <td class="px-4 py-3">{{ pago.monto }} {{ pago.moneda }}</td>
                  <td class="px-4 py-3 text-slate-600">{{ pago.estado }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </section>
  `,
})
export class Pagos {
  private readonly pagosSrv = inject(PagosService);
  private readonly planesSrv = inject(SuscripcionesService);
  private readonly reportesSrv = inject(ReportesService);
  private readonly route = inject(ActivatedRoute);

  protected readonly suscripcion = signal<SuscripcionEstado | null>(null);
  protected readonly planes = signal<Plan[]>([]);
  protected readonly historial = signal<PagoHistorial[]>([]);
  protected readonly aviso = signal<string | null>(null);
  protected readonly procesando = signal(false);

  constructor() {
    const pago = this.route.snapshot.queryParamMap.get('pago');
    const sessionId = this.route.snapshot.queryParamMap.get('session_id');
    if (pago === 'ok' && sessionId) {
      this.aviso.set('Verificando tu pago…');
      this.pagosSrv.confirmar(sessionId).subscribe({
        next: (s) => {
          this.aviso.set(
            s
              ? '¡Suscripción activada! Gracias por tu pago.'
              : 'Tu pago se está procesando. Refresca en unos segundos.',
          );
          this.cargar();
        },
        error: () => {
          this.aviso.set('No se pudo verificar el pago.');
          this.cargar();
        },
      });
    } else {
      if (pago === 'cancelado') {
        this.aviso.set('Pago cancelado. Puedes intentarlo de nuevo cuando quieras.');
      }
      this.cargar();
    }
  }

  private cargar(): void {
    this.pagosSrv.miSuscripcion().subscribe((s) => this.suscripcion.set(s));
    this.planesSrv.listar().subscribe((p) => this.planes.set(p));
    this.pagosSrv.historial().subscribe((h) => this.historial.set(h));
  }

  pagar(plan: Plan): void {
    this.procesando.set(true);
    this.pagosSrv.checkout(plan.id).subscribe({
      next: (res) => (window.location.href = res.checkout_url),
      error: () => {
        this.aviso.set('No se pudo iniciar el pago. Inténtalo de nuevo.');
        this.procesando.set(false);
      },
    });
  }

  exportar(formato: 'pdf' | 'excel'): void {
    this.reportesSrv.miHistorial(formato).subscribe({
      next: (blob) => this.descargar(blob, `mi_historial.${formato === 'excel' ? 'xlsx' : 'pdf'}`),
      error: () => this.aviso.set('No se pudo generar el reporte de tu historial.'),
    });
  }

  private descargar(blob: Blob, nombre: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nombre;
    a.click();
    URL.revokeObjectURL(url);
  }
}
