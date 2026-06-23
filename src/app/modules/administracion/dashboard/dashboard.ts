import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { Chart, registerables } from 'chart.js';

import { DashboardResponse, DashboardService } from './dashboard.service';

Chart.register(...registerables);

@Component({
  selector: 'app-dashboard',
  template: `
    <section>
      <h2 class="mb-4 text-xl font-semibold text-slate-800">Dashboard de progreso</h2>

      <div class="mb-6 flex flex-wrap items-end gap-3">
        <label class="text-xs text-slate-500">
          Desde
          <input
            type="date"
            (change)="desde.set($any($event.target).value)"
            class="mt-1 block rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </label>
        <label class="text-xs text-slate-500">
          Hasta
          <input
            type="date"
            (change)="hasta.set($any($event.target).value)"
            class="mt-1 block rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </label>
        <button
          (click)="aplicar()"
          class="rounded-lg bg-slate-900 px-3 py-2 text-sm text-white hover:bg-slate-800"
        >
          Aplicar
        </button>
        <button
          (click)="limpiar()"
          class="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
        >
          Limpiar
        </button>
      </div>

      @if (data(); as d) {
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
          @if (d.rol === 'ADMINISTRADOR') {
            <div class="rounded-xl border border-slate-200 bg-white p-5">
              <p class="text-xs uppercase text-slate-500">Usuarios</p>
              <p class="text-2xl font-semibold text-slate-900">
                {{ d.metricas['cuenta']['total_usuarios'] }}
              </p>
            </div>
            <div class="rounded-xl border border-slate-200 bg-white p-5">
              <p class="text-xs uppercase text-slate-500">Suscripciones activas</p>
              <p class="text-2xl font-semibold text-slate-900">
                {{ d.metricas['suscripcion']['suscripciones_activas'] }}
              </p>
            </div>
            <div class="rounded-xl border border-slate-200 bg-white p-5">
              <p class="text-xs uppercase text-slate-500">Ingresos</p>
              <p class="text-2xl font-semibold text-slate-900">
                {{ d.metricas['pagos']['ingresos_totales'] }}
              </p>
            </div>
          } @else {
            <div class="rounded-xl border border-slate-200 bg-white p-5">
              <p class="text-xs uppercase text-slate-500">Mi cuenta</p>
              <p class="text-sm font-medium text-slate-900">{{ d.metricas['cuenta']['email'] }}</p>
            </div>
            <div class="rounded-xl border border-slate-200 bg-white p-5">
              <p class="text-xs uppercase text-slate-500">Suscripción</p>
              <p class="text-2xl font-semibold text-slate-900">
                {{ d.metricas['suscripcion']['estado'] }}
              </p>
            </div>
            <div class="rounded-xl border border-slate-200 bg-white p-5">
              <p class="text-xs uppercase text-slate-500">Pagos realizados</p>
              <p class="text-2xl font-semibold text-slate-900">
                {{ d.metricas['pagos']['total_pagos'] }}
              </p>
            </div>
          }
        </div>

        @if (d.rol !== 'ADMINISTRADOR') {
          <div class="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
            @if (d.metricas['documentos']; as doc) {
              <div class="rounded-xl border border-slate-200 bg-white p-5">
                <p class="text-xs uppercase text-slate-500">Documentos</p>
                <p class="text-2xl font-semibold text-slate-900">{{ doc['total_documentos'] }}</p>
                <p class="text-xs text-slate-500">Último nivel: {{ doc['ultimo_nivel'] ?? '—' }}</p>
              </div>
            }
            @if (d.metricas['simulaciones']; as sim) {
              <div class="rounded-xl border border-slate-200 bg-white p-5">
                <p class="text-xs uppercase text-slate-500">Simulaciones</p>
                <p class="text-2xl font-semibold text-slate-900">{{ sim['total_sesiones'] }}</p>
                <p class="text-xs text-slate-500">
                  Defensa: {{ sim['ultimo_nivel_defensa'] ?? '—' }}
                </p>
              </div>
            }
            @if (d.metricas['biometrico']; as bio) {
              <div class="rounded-xl border border-slate-200 bg-white p-5">
                <p class="text-xs uppercase text-slate-500">Oratoria</p>
                <p class="text-2xl font-semibold text-slate-900">
                  {{ bio['muletillas_total'] }} muletillas
                </p>
                <p class="text-xs text-slate-500">Mayor fallo: {{ bio['mayor_fallo'] ?? '—' }}</p>
              </div>
            }
          </div>
        } @else {
          <div class="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
            @if (d.metricas['documentos']; as doc) {
              <div class="rounded-xl border border-slate-200 bg-white p-5">
                <p class="text-xs uppercase text-slate-500">Documentos</p>
                <p class="text-2xl font-semibold text-slate-900">{{ doc['total_documentos'] }}</p>
                <p class="text-xs text-slate-500">
                  {{ doc['versiones_analizadas'] }} versiones analizadas
                </p>
              </div>
            }
            @if (d.metricas['simulaciones']; as sim) {
              <div class="rounded-xl border border-slate-200 bg-white p-5">
                <p class="text-xs uppercase text-slate-500">Simulaciones</p>
                <p class="text-2xl font-semibold text-slate-900">{{ sim['total_sesiones'] }}</p>
                <p class="text-xs text-slate-500">{{ sim['finalizadas'] }} finalizadas</p>
              </div>
            }
          </div>
        }

        <div class="mt-8 max-w-2xl rounded-xl border border-slate-200 bg-white p-5">
          <canvas #grafico></canvas>
        </div>
      } @else {
        <p class="text-sm text-slate-400">Cargando métricas…</p>
      }
    </section>
  `,
})
export class Dashboard implements AfterViewInit, OnDestroy {
  private readonly srv = inject(DashboardService);
  private readonly canvas = viewChild<ElementRef<HTMLCanvasElement>>('grafico');

  protected readonly data = signal<DashboardResponse | null>(null);
  protected readonly desde = signal('');
  protected readonly hasta = signal('');
  private chart: Chart | null = null;

  constructor() {
    this.cargar();
    // Redibuja el gráfico cuando lleguen los datos y exista el canvas.
    effect(() => {
      const d = this.data();
      const el = this.canvas()?.nativeElement;
      if (d && el) this.dibujar(d, el);
    });
  }

  ngAfterViewInit(): void {
    /* el effect() se encarga del primer render */
  }

  private cargar(): void {
    // CU-06: filtro por periodo (rango inclusivo del día elegido).
    const desde = this.desde() ? `${this.desde()}T00:00:00` : undefined;
    const hasta = this.hasta() ? `${this.hasta()}T23:59:59` : undefined;
    this.srv.obtener({ desde, hasta }).subscribe((d) => this.data.set(d));
  }

  protected aplicar(): void {
    this.cargar();
  }

  protected limpiar(): void {
    this.desde.set('');
    this.hasta.set('');
    this.cargar();
  }

  ngOnDestroy(): void {
    this.chart?.destroy();
  }

  private dibujar(d: DashboardResponse, el: HTMLCanvasElement): void {
    this.chart?.destroy();
    const esAdmin = d.rol === 'ADMINISTRADOR';
    const labels = esAdmin ? ['Usuarios', 'Suscripciones activas'] : ['Pagos', 'Suscripción'];
    const valores = esAdmin
      ? [
          Number(d.metricas['cuenta']['total_usuarios']),
          Number(d.metricas['suscripcion']['suscripciones_activas']),
        ]
      : [
          Number(d.metricas['pagos']['total_pagos']),
          d.metricas['suscripcion']['estado'] === 'ACTIVA' ? 1 : 0,
        ];

    this.chart = new Chart(el, {
      type: 'bar',
      data: { labels, datasets: [{ label: 'Resumen', data: valores }] },
      options: { responsive: true, plugins: { legend: { display: false } } },
    });
  }
}
