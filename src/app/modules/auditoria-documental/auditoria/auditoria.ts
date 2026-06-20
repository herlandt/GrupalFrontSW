import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { AuditoriaService, Categoria, ResultadoAuditoria } from './auditoria.service';

const CATEGORIAS: Categoria[] = ['COHERENCIA', 'NORMAS', 'SUGERENCIA'];

/** Informe de auditoría de una versión (CU-10): coherencia, normas y sugerencias. */
@Component({
  selector: 'app-auditoria',
  imports: [DatePipe],
  template: `
    <section class="max-w-3xl">
      <h2 class="mb-4 text-xl font-semibold text-slate-800">Informe de auditoría</h2>

      @if (aviso(); as a) {
        <p class="mb-4 rounded-lg bg-slate-100 px-4 py-3 text-sm text-slate-700">{{ a }}</p>
      }

      @if (resultado(); as r) {
        <div class="mb-5 rounded-xl border border-slate-200 bg-white p-5">
          <p class="text-sm text-slate-500">Nivel del documento</p>
          <p class="text-2xl font-semibold text-slate-900">{{ r.nivel_documento }}</p>
          @if (r.resumen) {
            <p class="mt-2 text-sm text-slate-600">{{ r.resumen }}</p>
          }
          <p class="mt-2 text-xs text-slate-400">{{ r.created_at | date: 'medium' }}</p>
        </div>

        <div class="mb-4 flex gap-2">
          <button
            (click)="filtrar(null)"
            [class.bg-slate-900]="filtro() === null"
            [class.text-white]="filtro() === null"
            class="rounded-full border border-slate-300 px-3 py-1 text-sm"
          >
            Todas
          </button>
          @for (c of categorias; track c) {
            <button
              (click)="filtrar(c)"
              [class.bg-slate-900]="filtro() === c"
              [class.text-white]="filtro() === c"
              class="rounded-full border border-slate-300 px-3 py-1 text-sm"
            >
              {{ c }}
            </button>
          }
        </div>

        @for (o of observaciones(); track o.id) {
          <div class="mb-3 rounded-lg border border-slate-200 bg-white p-4">
            <div class="mb-1 flex items-center gap-2">
              <span class="rounded-full bg-slate-100 px-2 py-0.5 text-xs">{{ o.categoria }}</span>
              <span class="text-xs text-slate-500">severidad: {{ o.severidad }}</span>
            </div>
            <p class="text-sm text-slate-800">{{ o.descripcion }}</p>
            @if (o.ubicacion) {
              <p class="mt-1 text-xs text-slate-400">{{ o.ubicacion }}</p>
            }
          </div>
        } @empty {
          <p class="text-sm text-slate-500">No hay observaciones para este filtro.</p>
        }
      }
    </section>
  `,
})
export class Auditoria {
  private readonly service = inject(AuditoriaService);
  private readonly route = inject(ActivatedRoute);
  protected readonly categorias = CATEGORIAS;

  protected readonly resultado = signal<ResultadoAuditoria | null>(null);
  protected readonly filtro = signal<Categoria | null>(null);
  protected readonly aviso = signal<string | null>(null);

  // Filtra en cliente sobre el resultado ya cargado.
  protected readonly observaciones = computed(() => {
    const r = this.resultado();
    if (!r) return [];
    const f = this.filtro();
    return f ? r.observaciones.filter((o) => o.categoria === f) : r.observaciones;
  });

  private readonly versionId = Number(this.route.snapshot.queryParamMap.get('version'));

  constructor() {
    if (!this.versionId) {
      this.aviso.set('Selecciona una versión desde tus documentos para ver su informe.');
      return;
    }
    this.service.resultado(this.versionId).subscribe({
      next: (r) => this.resultado.set(r),
      error: (e) =>
        this.aviso.set(
          e.status === 404
            ? 'El análisis aún no está listo o no hay resultados para esta versión.'
            : e.status === 402
              ? 'Necesitas una suscripción activa para ver el informe.'
              : 'No se pudo cargar el informe.',
        ),
    });
  }

  filtrar(c: Categoria | null): void {
    this.filtro.set(c);
  }
}
