import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { Chart, registerables } from 'chart.js';

import { ReportesService, ResumenReportes } from './reportes.service';

Chart.register(...registerables);
type Formato = 'pdf' | 'excel';

@Component({
  selector: 'app-reportes',
  template: `
    <section class="max-w-4xl">
      <h2 class="mb-6 text-xl font-semibold text-slate-800">Reportes dinámicos</h2>

      @if (error(); as e) {
        <p class="mb-4 rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">{{ e }}</p>
      }

      @if (resumen(); as r) {
        <div class="mb-6 rounded-xl border border-slate-200 bg-white p-5">
          <p class="text-sm text-slate-500">Total recaudado</p>
          <p class="text-3xl font-semibold text-slate-900">
            {{ r.ganancias.total }}
            <span class="text-base text-slate-500">{{ r.ganancias.moneda }}</span>
          </p>
          <p class="text-xs text-slate-500">{{ r.ganancias.cantidad_pagos }} pagos completados</p>
        </div>
        <div class="mb-8 rounded-xl border border-slate-200 bg-white p-5">
          <canvas #grafico></canvas>
        </div>
      }

      <h3 class="mb-3 text-sm font-semibold text-slate-700">Descargar reportes</h3>
      <div class="grid gap-3 sm:grid-cols-2">
        <div class="rounded-xl border border-slate-200 bg-white p-4">
          <p class="mb-3 font-medium text-slate-800">Ganancias totales</p>
          <div class="flex gap-2">
            <button
              (click)="descargarGanancias('pdf')"
              class="rounded-lg bg-slate-900 px-3 py-2 text-sm text-white hover:bg-slate-800"
            >
              PDF
            </button>
            <button
              (click)="descargarGanancias('excel')"
              class="rounded-lg bg-emerald-600 px-3 py-2 text-sm text-white hover:bg-emerald-500"
            >
              Excel
            </button>
          </div>
        </div>
        <div class="rounded-xl border border-slate-200 bg-white p-4">
          <p class="mb-3 font-medium text-slate-800">Pagos por estudiante</p>
          <div class="flex gap-2">
            <button
              (click)="descargarPorEstudiante('pdf')"
              class="rounded-lg bg-slate-900 px-3 py-2 text-sm text-white hover:bg-slate-800"
            >
              PDF
            </button>
            <button
              (click)="descargarPorEstudiante('excel')"
              class="rounded-lg bg-emerald-600 px-3 py-2 text-sm text-white hover:bg-emerald-500"
            >
              Excel
            </button>
          </div>
        </div>
      </div>

      <h3 class="mb-3 mt-8 text-sm font-semibold text-slate-700">
        Bitácora del sistema (auditoría)
      </h3>
      <div class="rounded-xl border border-slate-200 bg-white p-4">
        <p class="mb-3 text-sm text-slate-500">
          Eventos registrados (altas, cambios, pagos, reportes…). Opcional: acota por fechas.
        </p>
        <div class="mb-3 grid gap-3 sm:grid-cols-2">
          <label class="block text-xs text-slate-500">
            Desde
            <input
              type="date"
              (change)="desde.set($any($event.target).value)"
              class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
          <label class="block text-xs text-slate-500">
            Hasta
            <input
              type="date"
              (change)="hasta.set($any($event.target).value)"
              class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
        </div>
        <div class="flex gap-2">
          <button
            (click)="descargarBitacora('pdf')"
            class="rounded-lg bg-slate-900 px-3 py-2 text-sm text-white hover:bg-slate-800"
          >
            PDF
          </button>
          <button
            (click)="descargarBitacora('excel')"
            class="rounded-lg bg-emerald-600 px-3 py-2 text-sm text-white hover:bg-emerald-500"
          >
            Excel
          </button>
        </div>
      </div>
    </section>
  `,
})
export class Reportes implements AfterViewInit, OnDestroy {
  private readonly srv = inject(ReportesService);
  private readonly grafico = viewChild<ElementRef<HTMLCanvasElement>>('grafico');
  private chart?: Chart;

  protected readonly resumen = signal<ResumenReportes | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly desde = signal('');
  protected readonly hasta = signal('');

  constructor() {
    this.srv.resumen().subscribe((r) => {
      this.resumen.set(r);
      queueMicrotask(() => this.pintar());
    });
  }

  ngAfterViewInit(): void {
    this.pintar();
  }

  ngOnDestroy(): void {
    this.chart?.destroy();
  }

  private pintar(): void {
    const r = this.resumen();
    const canvas = this.grafico()?.nativeElement;
    if (!r || !canvas) return;
    this.chart?.destroy();
    this.chart = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: r.por_estudiante.map((f) => f.nombre),
        datasets: [
          { label: 'Total pagado', data: r.por_estudiante.map((f) => Number(f.total_pagado)) },
        ],
      },
      options: { responsive: true, plugins: { legend: { display: false } } },
    });
  }

  protected descargarGanancias(formato: Formato): void {
    this.error.set(null);
    this.srv.ganancias(formato).subscribe({
      next: (b) => this.guardar(b, `ganancias.${this.ext(formato)}`),
      error: () => this.error.set('No se pudo generar el reporte de ganancias.'),
    });
  }

  protected descargarPorEstudiante(formato: Formato): void {
    this.error.set(null);
    this.srv.pagosPorEstudiante(formato).subscribe({
      next: (b) => this.guardar(b, `pagos_por_estudiante.${this.ext(formato)}`),
      error: () => this.error.set('No se pudo generar el reporte por estudiante.'),
    });
  }

  protected descargarBitacora(formato: Formato): void {
    this.error.set(null);
    // Rango INCLUSIVO: desde al inicio del día y hasta al final del día elegido.
    const desde = this.desde() ? `${this.desde()}T00:00:00` : undefined;
    const hasta = this.hasta() ? `${this.hasta()}T23:59:59` : undefined;
    this.srv.bitacora(formato, desde, hasta).subscribe({
      next: (b) => this.guardar(b, `bitacora.${this.ext(formato)}`),
      error: () => this.error.set('No se pudo generar el reporte de la bitácora.'),
    });
  }

  private ext(formato: Formato): string {
    return formato === 'excel' ? 'xlsx' : 'pdf';
  }

  private guardar(blob: Blob, nombre: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nombre;
    a.click();
    URL.revokeObjectURL(url);
  }
}
