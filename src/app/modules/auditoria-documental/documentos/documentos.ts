import { DatePipe } from '@angular/common';
import { Component, OnDestroy, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { AuditoriaService } from '../auditoria/auditoria.service';
import { Documento, DocumentosService, VersionDocumento } from './documentos.service';

/** Documentos: subir (CU-08), versionar (CU-09) y ver historial (CU-11). */
@Component({
  selector: 'app-documentos',
  imports: [DatePipe, RouterLink],
  template: `
    <section class="max-w-3xl">
      <h2 class="mb-6 text-xl font-semibold text-slate-800">Mis documentos</h2>

      @if (aviso()) {
        <p class="mb-4 rounded-lg bg-slate-100 px-4 py-3 text-sm text-slate-700">{{ aviso() }}</p>
      }

      @if (error(); as e) {
        <div class="mb-4 rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {{ e }}
          @if (sinSuscripcion()) {
            <a [routerLink]="['/app/administracion/pagos']" class="font-medium underline">
              Ir a suscripción
            </a>
          }
        </div>
      }

      <!-- CU-08: subir documento nuevo -->
      <div class="mb-8 rounded-xl border border-slate-200 bg-white p-5">
        <h3 class="mb-3 text-sm font-semibold text-slate-700">Subir documento</h3>
        <input
          [value]="titulo()"
          (input)="titulo.set($any($event.target).value)"
          placeholder="Título de la tesis"
          class="mb-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        <!-- Selector de archivo estilizado: el input nativo va OCULTO dentro del label, así
             el área clicable es clara y se muestra el nombre del archivo elegido. -->
        <label
          class="mb-3 flex cursor-pointer items-center gap-3 rounded-lg border border-dashed border-slate-300 px-3 py-2 text-sm text-slate-600 hover:border-slate-400 hover:bg-slate-50"
        >
          <span class="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
            Elegir archivo
          </span>
          <span class="truncate" [class.text-slate-400]="!archivo()">
            {{ archivo()?.name ?? 'PDF o DOCX' }}
          </span>
          <input type="file" accept=".pdf,.docx" (change)="onArchivo($event)" class="hidden" />
        </label>
        <button
          (click)="subir()"
          [disabled]="subiendo() || !archivo() || !titulo()"
          class="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {{ subiendo() ? 'Subiendo…' : 'Subir documento' }}
        </button>
        @if (!subiendo() && (!titulo() || !archivo())) {
          <p class="mt-2 text-xs text-slate-400">
            Escribe un título y elige un archivo para habilitar el botón.
          </p>
        }
      </div>

      <!-- CU-11: lista de documentos -->
      @for (doc of documentos(); track doc.id) {
        <div class="mb-4 rounded-xl border border-slate-200 bg-white p-5">
          <div class="flex items-center justify-between">
            <div>
              <p class="font-medium text-slate-800">{{ doc.titulo }}</p>
              <p class="text-xs text-slate-500">Creado el {{ doc.created_at | date: 'medium' }}</p>
            </div>
            <button
              (click)="verVersiones(doc.id)"
              class="text-sm text-slate-600 hover:text-slate-900"
            >
              Ver versiones
            </button>
          </div>

          @if (versionesPorDoc()[doc.id]; as versiones) {
            <div class="mt-3 overflow-x-auto">
              <table class="w-full min-w-[34rem] text-sm">
                <thead class="text-left text-xs uppercase text-slate-500">
                  <tr>
                    <th class="py-2">Versión</th>
                    <th class="py-2">Formato</th>
                    <th class="py-2">Estado</th>
                    <th class="py-2">Nivel</th>
                    <th class="py-2">Fecha</th>
                    <th class="py-2">Informe</th>
                  </tr>
                </thead>
                <tbody>
                  @for (v of versiones; track v.id) {
                    <tr class="border-t border-slate-100">
                      <td class="py-2">v{{ v.numero_version }}</td>
                      <td class="py-2">{{ v.formato }}</td>
                      <td class="py-2 text-slate-600">{{ v.estado_analisis }}</td>
                      <td class="py-2 text-slate-600">{{ v.nivel_documento ?? '—' }}</td>
                      <td class="py-2 text-slate-500">{{ v.created_at | date: 'short' }}</td>
                      <td class="py-2">
                        @switch (v.estado_analisis) {
                          @case ('COMPLETADO') {
                            <a
                              [routerLink]="['/app/auditoria-documental/auditoria']"
                              [queryParams]="{ version: v.id }"
                              class="text-slate-600 hover:text-slate-900 hover:underline"
                              >Ver informe</a
                            >
                          }
                          @case ('EN_PROCESO') {
                            <span class="inline-flex items-center gap-1 text-slate-500">
                              <span class="h-2 w-2 animate-pulse rounded-full bg-amber-500"></span>
                              Analizando…
                            </span>
                          }
                          @default {
                            <button
                              (click)="analizar(v, doc.id)"
                              [disabled]="analizando()[v.id]"
                              class="text-slate-600 hover:text-slate-900 hover:underline disabled:opacity-50"
                            >
                              {{
                                analizando()[v.id]
                                  ? 'Enviando…'
                                  : v.estado_analisis === 'ERROR'
                                    ? 'Reintentar'
                                    : 'Analizar'
                              }}
                            </button>
                          }
                        }
                      </td>
                    </tr>
                    @if (v.resumen) {
                      <tr>
                        <td colspan="6" class="pb-2 pl-2 text-xs italic text-slate-500">
                          {{ v.resumen }}
                        </td>
                      </tr>
                    }
                  }
                </tbody>
              </table>
            </div>
            <!-- CU-09: subir nueva versión (selector estilizado, sube al elegir) -->
            <label
              class="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-slate-300 px-3 py-1.5 text-xs text-slate-600 hover:border-slate-400 hover:bg-slate-50"
            >
              <span class="font-medium text-slate-700">Subir nueva versión</span>
              <span class="text-slate-400">PDF o DOCX</span>
              <input
                type="file"
                accept=".pdf,.docx"
                (change)="onNuevaVersion($event, doc.id)"
                class="hidden"
              />
            </label>
          }
        </div>
      } @empty {
        <p class="text-sm text-slate-400">
          {{ cargando() ? 'Cargando…' : 'Aún no has subido ningún documento.' }}
        </p>
      }
    </section>
  `,
})
export class Documentos implements OnDestroy {
  private readonly srv = inject(DocumentosService);
  private readonly auditoria = inject(AuditoriaService);
  private poll: ReturnType<typeof setInterval> | null = null;

  protected readonly documentos = signal<Documento[]>([]);
  protected readonly versionesPorDoc = signal<Record<number, VersionDocumento[]>>({});
  protected readonly titulo = signal('');
  protected readonly archivo = signal<File | null>(null);
  protected readonly subiendo = signal(false);
  protected readonly aviso = signal<string | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly cargando = signal(false);
  protected readonly sinSuscripcion = signal(false);
  protected readonly analizando = signal<Record<number, boolean>>({});

  constructor() {
    this.cargar();
  }

  private cargar(): void {
    this.cargando.set(true);
    this.srv.listar().subscribe({
      next: (docs) => {
        this.documentos.set(docs);
        this.cargando.set(false);
      },
      error: (e) => {
        this.cargando.set(false);
        this.sinSuscripcion.set(e.status === 402);
        this.error.set(
          e.status === 402
            ? 'Necesitas una suscripción activa para subir y analizar documentos.'
            : 'No se pudieron cargar tus documentos.',
        );
      },
    });
  }

  onArchivo(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.archivo.set(input.files?.[0] ?? null);
  }

  subir(): void {
    const file = this.archivo();
    if (!file) return;
    this.subiendo.set(true);
    this.srv.subir(this.titulo(), file).subscribe({
      next: () => {
        this.aviso.set('Documento subido. El análisis empezó automáticamente.');
        this.titulo.set('');
        this.archivo.set(null);
        this.subiendo.set(false);
        this.cargar();
      },
      error: (e) => {
        this.aviso.set(e?.error?.detail ?? 'No se pudo subir el documento.');
        this.subiendo.set(false);
      },
    });
  }

  verVersiones(documentoId: number): void {
    this.srv.versiones(documentoId).subscribe((vs) => {
      this.versionesPorDoc.update((m) => ({ ...m, [documentoId]: vs }));
      this.gestionarPolling(); // si hay alguna EN_PROCESO, arranca el sondeo
    });
  }

  onNuevaVersion(event: Event, documentoId: number): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.srv.subirVersion(documentoId, file).subscribe({
      next: () => {
        this.aviso.set('Nueva versión subida; el análisis empezó automáticamente.');
        this.verVersiones(documentoId);
        this.cargar();
      },
      error: (e) => this.aviso.set(e?.error?.detail ?? 'No se pudo subir la versión.'),
    });
  }

  analizar(v: VersionDocumento, documentoId: number): void {
    this.analizando.update((m) => ({ ...m, [v.id]: true }));
    // El análisis corre EN SEGUNDO PLANO en el servidor: la petición vuelve enseguida y
    // seguimos el progreso por sondeo. Puedes cambiar de pestaña; al volver verás el estado.
    this.aviso.set(
      'Análisis en segundo plano (puede tardar 1-2 min). Puedes seguir navegando; al volver verás el estado.',
    );
    this.auditoria.analizar(v.id).subscribe({
      next: () => {
        this.analizando.update((m) => ({ ...m, [v.id]: false }));
        this.verVersiones(documentoId); // pasa a EN_PROCESO y arranca el sondeo
      },
      error: (e) => {
        this.analizando.update((m) => ({ ...m, [v.id]: false }));
        this.aviso.set(
          e.status === 502
            ? 'El servicio de análisis no está disponible. Inténtalo más tarde.'
            : 'No se pudo iniciar el análisis.',
        );
      },
    });
  }

  ngOnDestroy(): void {
    this.detenerPolling();
  }

  /** Mientras alguna versión esté EN_PROCESO, refresca su estado cada 4 s (sondeo). */
  private gestionarPolling(): void {
    if (this.hayEnProceso()) {
      if (!this.poll) {
        this.poll = setInterval(() => this.refrescarEnProceso(), 4000);
      }
    } else if (this.poll) {
      this.detenerPolling();
      this.aviso.set('Análisis finalizado. Revisa el estado en la tabla.');
    }
  }

  private detenerPolling(): void {
    if (this.poll) {
      clearInterval(this.poll);
      this.poll = null;
    }
  }

  private hayEnProceso(): boolean {
    return Object.values(this.versionesPorDoc()).some((vs) =>
      vs.some((v) => v.estado_analisis === 'EN_PROCESO'),
    );
  }

  private refrescarEnProceso(): void {
    // Re-consulta solo los documentos que tengan alguna versión EN_PROCESO.
    for (const [docId, vs] of Object.entries(this.versionesPorDoc())) {
      if (vs.some((v) => v.estado_analisis === 'EN_PROCESO')) {
        this.srv.versiones(+docId).subscribe((nvs) => {
          this.versionesPorDoc.update((m) => ({ ...m, [+docId]: nvs }));
          this.gestionarPolling(); // si ya no queda nada EN_PROCESO, se detiene
        });
      }
    }
  }
}
