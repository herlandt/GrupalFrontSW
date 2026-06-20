import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import {
  Documento,
  DocumentosService,
  VersionDocumento,
} from '../../auditoria-documental/documentos/documentos.service';
import {
  NivelDificultad,
  ResultadoSimulacion,
  Sesion,
  SimulacionesService,
} from './simulaciones.service';

const NIVELES: NivelDificultad[] = ['EXPLORACION', 'ESTANDAR', 'RIGUROSO'];

/** Simulaciones de defensa (CU-13 iniciar/cerrar, CU-15 historial). */
@Component({
  selector: 'app-simulaciones',
  imports: [DatePipe, RouterLink],
  template: `
    <section class="max-w-3xl">
      <h2 class="mb-6 text-xl font-semibold text-slate-800">Simulador de defensa</h2>

      @if (aviso(); as a) {
        <p class="mb-4 rounded-lg bg-slate-100 px-4 py-3 text-sm text-slate-700">{{ a }}</p>
      }

      <!-- CU-14 (Fase 4): resultado y nivel de defensa de la IA evaluadora -->
      @if (resultado(); as r) {
        <div class="mb-6 rounded-xl border border-slate-200 bg-white p-5">
          <div class="mb-2 flex items-center justify-between">
            <h3 class="text-sm font-semibold text-slate-700">Resultado de la simulación</h3>
            <button
              (click)="resultado.set(null)"
              class="text-xs text-slate-400 hover:text-slate-600"
            >
              cerrar
            </button>
          </div>
          <p class="text-sm text-slate-500">Nivel de defensa</p>
          <p class="text-2xl font-semibold text-slate-900">{{ r.nivel_defensa }}</p>
          @if (r.confianza != null) {
            <p class="text-xs text-slate-500">
              Confianza del modelo: {{ (r.confianza * 100).toFixed(0) }}%
            </p>
          }
          @if (r.confianza != null && r.confianza < 0.55) {
            <p
              class="mt-1 inline-block rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800"
            >
              ⚠️ Caso límite — revisión humana sugerida
            </p>
          }
          <div class="mt-3 grid grid-cols-3 gap-3 text-sm">
            <div>
              <p class="text-xs text-slate-500">Oratoria</p>
              <p class="text-slate-800">{{ r.oratoria_score ?? '—' }}</p>
            </div>
            <div>
              <p class="text-xs text-slate-500">No verbal</p>
              <p class="text-slate-800">{{ r.comunicacion_no_verbal_score ?? '—' }}</p>
            </div>
            <div>
              <p class="text-xs text-slate-500">Dominio</p>
              <p class="text-slate-800">{{ r.dominio_score ?? '—' }}</p>
            </div>
          </div>
          @if (r.resumen) {
            <p class="mt-3 text-sm text-slate-600">{{ r.resumen }}</p>
          }
        </div>
      }

      <!-- CU-13: iniciar una sesión anclada a una versión de documento propia -->
      <div class="mb-8 rounded-xl border border-slate-200 bg-white p-5">
        <h3 class="mb-3 text-sm font-semibold text-slate-700">Nueva simulación</h3>
        <div class="grid gap-3 sm:grid-cols-3">
          <select
            (change)="onDocumento($event)"
            class="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">Documento…</option>
            @for (d of documentos(); track d.id) {
              <option [value]="d.id">{{ d.titulo }}</option>
            }
          </select>

          <select
            (change)="versionId.set(+$any($event.target).value || null)"
            [disabled]="!versiones().length"
            class="rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:opacity-50"
          >
            <option value="">Versión…</option>
            @for (v of versiones(); track v.id) {
              <option [value]="v.id">v{{ v.numero_version }} · {{ v.formato }}</option>
            }
          </select>

          <select
            (change)="nivel.set($any($event.target).value)"
            class="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            @for (n of niveles; track n) {
              <option [value]="n">{{ n }}</option>
            }
          </select>
        </div>
        <button
          (click)="iniciar()"
          [disabled]="iniciando() || !versionId()"
          class="mt-3 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
        >
          {{ iniciando() ? 'Iniciando…' : 'Iniciar simulación' }}
        </button>
      </div>

      <!-- CU-15: historial -->
      <h3 class="mb-3 text-sm font-semibold text-slate-700">Mis simulaciones</h3>
      <div class="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table class="w-full text-sm">
          <thead class="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th class="px-4 py-3">Inicio</th>
              <th class="px-4 py-3">Nivel</th>
              <th class="px-4 py-3">Estado</th>
              <th class="px-4 py-3">Acciones</th>
            </tr>
          </thead>
          <tbody>
            @for (s of sesiones(); track s.id) {
              <tr class="border-t border-slate-100">
                <td class="px-4 py-3 text-slate-600">{{ s.fecha_inicio | date: 'short' }}</td>
                <td class="px-4 py-3 text-slate-700">{{ s.nivel_dificultad }}</td>
                <td class="px-4 py-3">
                  <span class="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700">
                    {{ s.estado }}
                  </span>
                </td>
                <td class="space-x-2 px-4 py-3">
                  @if (s.estado === 'EN_CURSO') {
                    <button (click)="finalizar(s)" class="text-emerald-600 hover:underline">
                      Finalizar
                    </button>
                    <button (click)="cancelar(s)" class="text-rose-600 hover:underline">
                      Cancelar
                    </button>
                  }
                  @if (s.estado !== 'CANCELADA') {
                    <a
                      [routerLink]="['/app/simulador/tribunal']"
                      [queryParams]="{ sesion: s.id }"
                      class="text-slate-700 hover:underline"
                      >Tribunal</a
                    >
                    <a
                      [routerLink]="['/app/simulador/biometrico']"
                      [queryParams]="{ sesion: s.id }"
                      class="text-slate-700 hover:underline"
                      >Métricas</a
                    >
                    <button (click)="verResultado(s)" class="text-slate-700 hover:underline">
                      Resultado
                    </button>
                  } @else {
                    <span class="text-xs text-slate-400">—</span>
                  }
                </td>
              </tr>
            } @empty {
              <tr>
                <td colspan="4" class="px-4 py-6 text-center text-slate-400">
                  Aún no has iniciado ninguna simulación.
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    </section>
  `,
})
export class Simulaciones {
  private readonly srv = inject(SimulacionesService);
  private readonly docs = inject(DocumentosService);
  private readonly router = inject(Router);
  protected readonly niveles = NIVELES;

  protected readonly documentos = signal<Documento[]>([]);
  protected readonly versiones = signal<VersionDocumento[]>([]);
  protected readonly versionId = signal<number | null>(null);
  protected readonly nivel = signal<NivelDificultad>('ESTANDAR');
  protected readonly sesiones = signal<Sesion[]>([]);
  protected readonly iniciando = signal(false);
  protected readonly aviso = signal<string | null>(null);
  protected readonly resultado = signal<ResultadoSimulacion | null>(null);

  constructor() {
    this.docs.listar().subscribe((d) => this.documentos.set(d));
    this.recargar();
  }

  private recargar(): void {
    this.srv.historial().subscribe((s) => this.sesiones.set(s));
  }

  onDocumento(event: Event): void {
    const docId = Number((event.target as HTMLSelectElement).value);
    this.versionId.set(null);
    this.versiones.set([]);
    if (docId) {
      this.docs.versiones(docId).subscribe((v) => this.versiones.set(v));
    }
  }

  iniciar(): void {
    const version = this.versionId();
    if (!version) return;
    this.iniciando.set(true);
    this.srv.iniciar(version, this.nivel()).subscribe({
      next: (sesion) => {
        this.iniciando.set(false);
        // La defensa empieza: abrimos el biométrico (la cámara se abre sola allí).
        this.router.navigate(['/app/simulador/biometrico'], {
          queryParams: { sesion: sesion.id },
        });
      },
      error: (e) => {
        this.aviso.set(
          e.status === 402
            ? 'Necesitas una suscripción activa para iniciar una simulación.'
            : e.status === 409
              ? 'Ya tienes una simulación en curso; ciérrala primero.'
              : e.status === 404
                ? 'La versión seleccionada no existe o no es tuya.'
                : 'No se pudo iniciar la simulación.',
        );
        this.iniciando.set(false);
      },
    });
  }

  finalizar(s: Sesion): void {
    this.srv.finalizar(s.id).subscribe({
      next: () => this.recargar(),
      error: () => this.recargar(), // si ya estaba finalizada (409), solo sincronizamos la UI
    });
  }

  cancelar(s: Sesion): void {
    this.srv.cancelar(s.id).subscribe({
      next: () => this.recargar(),
      error: () => this.recargar(),
    });
  }

  verResultado(s: Sesion): void {
    // El backend es idempotente: si la sesión ya tiene resultado lo devuelve; si no, lo genera.
    this.srv.generarResultado(s.id).subscribe({
      next: (r) => {
        this.resultado.set(r);
        this.recargar();
      },
      error: (e) =>
        this.aviso.set(
          e.status === 402
            ? 'Necesitas una suscripción activa para evaluar la defensa.'
            : 'No se pudo obtener el resultado de la simulación.',
        ),
    });
  }
}
