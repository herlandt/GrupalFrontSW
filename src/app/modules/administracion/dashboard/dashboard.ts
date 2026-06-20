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
      <h2 class="mb-6 text-xl font-semibold text-slate-800">Dashboard de progreso</h2>

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
  private chart: Chart | null = null;

  constructor() {
    this.srv.obtener().subscribe((d) => this.data.set(d));
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
