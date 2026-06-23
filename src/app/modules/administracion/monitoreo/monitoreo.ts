import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import {
  AvanceFormal,
  EstudianteDetalle,
  EstudianteResumen,
  MonitoreoService,
} from './monitoreo.service';

/** Monitoreo de estudiantes y validación de avance formal (CU-07, RF-08, admin). */
@Component({
  selector: 'app-monitoreo',
  imports: [ReactiveFormsModule, DatePipe],
  template: `
    <section class="grid max-w-5xl gap-6 lg:grid-cols-2">
      <div class="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <h2 class="border-b border-slate-100 px-4 py-3 text-sm font-semibold text-slate-700">
          Estudiantes
        </h2>
        <table class="w-full text-sm">
          <thead class="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th class="px-4 py-2">Nombre</th>
              <th class="px-4 py-2">Nivel</th>
            </tr>
          </thead>
          <tbody>
            @for (e of estudiantes(); track e.id) {
              <tr
                (click)="abrir(e)"
                class="cursor-pointer border-t border-slate-100 hover:bg-slate-50"
              >
                <td class="px-4 py-2 font-medium text-slate-800">{{ e.nombre }}</td>
                <td class="px-4 py-2 text-slate-600">{{ e.nivel_general }}</td>
              </tr>
            }
          </tbody>
        </table>
      </div>

      @if (detalle(); as d) {
        <div class="rounded-xl border border-slate-200 bg-white p-5">
          <div class="mb-1 flex items-start justify-between gap-2">
            <h3 class="text-sm font-semibold text-slate-800">{{ d.estudiante.nombre }}</h3>
            <button
              (click)="exportar(d)"
              class="shrink-0 rounded-lg border border-slate-300 px-3 py-1 text-xs text-slate-700 hover:bg-slate-50"
            >
              Exportar PDF
            </button>
          </div>
          <p class="mb-4 text-xs text-slate-500">
            {{ d.estudiante.email }} · Nivel general: {{ d.nivel_general }}
          </p>

          <form
            [formGroup]="form"
            (ngSubmit)="registrar(d.estudiante.id)"
            class="mb-4 flex items-end gap-2"
          >
            <input
              formControlName="etapa"
              placeholder="Nueva etapa"
              class="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none"
            />
            <button
              type="submit"
              [disabled]="form.invalid"
              class="rounded-lg bg-slate-900 px-3 py-2 text-sm text-white hover:bg-slate-800 disabled:opacity-50"
            >
              Registrar
            </button>
          </form>

          <ul class="flex flex-col gap-2">
            @for (a of d.avances; track a.id) {
              <li
                class="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2"
              >
                <span class="text-slate-700">{{ a.etapa }}</span>
                <span class="flex items-center gap-2">
                  <span class="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{{
                    a.estado
                  }}</span>
                  @if (a.estado === 'PENDIENTE') {
                    <button
                      (click)="aprobar(a, d)"
                      class="text-xs text-emerald-600 hover:underline"
                    >
                      Aprobar
                    </button>
                    <button (click)="rechazar(a, d)" class="text-xs text-rose-600 hover:underline">
                      Rechazar
                    </button>
                  }
                </span>
              </li>
            }
          </ul>

          <h4 class="mb-2 mt-5 text-xs font-semibold uppercase text-slate-500">Simulaciones</h4>
          @if (d.simulaciones.length) {
            <ul class="flex flex-col gap-1 text-sm">
              @for (s of d.simulaciones; track s.id) {
                <li class="flex justify-between rounded-lg border border-slate-100 px-3 py-2">
                  <span class="text-slate-600">{{ s.fecha_inicio | date: 'short' }}</span>
                  <span class="text-slate-700">{{ s.nivel_dificultad }}</span>
                  <span class="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                    {{ s.nivel_defensa ?? s.estado }}
                  </span>
                </li>
              }
            </ul>
          } @else {
            <p class="text-xs text-slate-400">Sin simulaciones.</p>
          }

          <h4 class="mb-2 mt-5 text-xs font-semibold uppercase text-slate-500">
            Versiones del documento
          </h4>
          @if (d.versiones.length) {
            <ul class="flex flex-col gap-1 text-sm">
              @for (v of d.versiones; track v.id) {
                <li class="rounded-lg border border-slate-100 px-3 py-2">
                  <span class="font-medium text-slate-700">v{{ v.numero_version }}</span>
                  <span class="text-slate-500">· {{ v.estado_analisis }}</span>
                  @if (v.nivel_documento) {
                    <span class="text-slate-500"> · {{ v.nivel_documento }}</span>
                  }
                  @if (v.resumen) {
                    <p class="mt-1 text-xs text-slate-500">{{ v.resumen }}</p>
                  }
                </li>
              }
            </ul>
          } @else {
            <p class="text-xs text-slate-400">Sin versiones.</p>
          }
        </div>
      }
    </section>
  `,
})
export class Monitoreo {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(MonitoreoService);

  protected readonly estudiantes = signal<EstudianteResumen[]>([]);
  protected readonly detalle = signal<EstudianteDetalle | null>(null);
  protected readonly form = this.fb.nonNullable.group({
    etapa: ['', [Validators.required]],
  });

  constructor() {
    this.service.listar().subscribe((e) => this.estudiantes.set(e));
  }

  abrir(e: EstudianteResumen): void {
    this.service.detalle(e.id).subscribe((d) => this.detalle.set(d));
  }

  private recargar(usuarioId: number): void {
    this.service.detalle(usuarioId).subscribe((d) => this.detalle.set(d));
  }

  registrar(usuarioId: number): void {
    if (this.form.invalid) {
      return;
    }
    this.service.registrarAvance(usuarioId, this.form.getRawValue().etapa).subscribe(() => {
      this.form.reset({ etapa: '' });
      this.recargar(usuarioId);
    });
  }

  aprobar(a: AvanceFormal, d: EstudianteDetalle): void {
    this.service.aprobar(a.id).subscribe(() => this.recargar(d.estudiante.id));
  }

  rechazar(a: AvanceFormal, d: EstudianteDetalle): void {
    this.service.rechazar(a.id).subscribe(() => this.recargar(d.estudiante.id));
  }

  exportar(d: EstudianteDetalle): void {
    this.service.exportar(d.estudiante.id).subscribe((blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `estudiante_${d.estudiante.id}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    });
  }
}
