import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
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
        <input
          type="file"
          accept=".pdf,.docx"
          (change)="onArchivo($event)"
          class="mb-3 block text-sm"
        />
        <button
          (click)="subir()"
          [disabled]="subiendo() || !archivo() || !titulo()"
          class="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
        >
          {{ subiendo() ? 'Subiendo…' : 'Subir documento' }}
        </button>
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
            <table class="mt-3 w-full text-sm">
              <thead class="text-left text-xs uppercase text-slate-500">
                <tr>
                  <th class="py-2">Versión</th>
                  <th class="py-2">Formato</th>
                  <th class="py-2">Estado</th>
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
                    <td class="py-2 text-slate-500">{{ v.created_at | date: 'short' }}</td>
                    <td class="py-2">
                      @if (v.estado_analisis === 'COMPLETADO') {
                        <a
                          [routerLink]="['/app/auditoria-documental/auditoria']"
                          [queryParams]="{ version: v.id }"
                          class="text-slate-600 hover:text-slate-900 hover:underline"
                          >Ver informe</a
                        >
                      } @else {
                        <button
                          (click)="analizar(v, doc.id)"
                          [disabled]="analizando()[v.id]"
                          class="text-slate-600 hover:text-slate-900 hover:underline disabled:opacity-50"
                        >
                          {{ analizando()[v.id] ? 'Analizando…' : 'Analizar' }}
                        </button>
                      }
                    </td>
                  </tr>
                }
              </tbody>
            </table>
            <!-- CU-09: subir nueva versión -->
            <input
              type="file"
              accept=".pdf,.docx"
              (change)="onNuevaVersion($event, doc.id)"
              class="mt-3 block text-xs"
            />
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
export class Documentos {
  private readonly srv = inject(DocumentosService);
  private readonly auditoria = inject(AuditoriaService);

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
        this.aviso.set('Documento subido. El análisis quedó en cola (PENDIENTE).');
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
    this.srv
      .versiones(documentoId)
      .subscribe((vs) => this.versionesPorDoc.update((m) => ({ ...m, [documentoId]: vs })));
  }

  onNuevaVersion(event: Event, documentoId: number): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.srv.subirVersion(documentoId, file).subscribe({
      next: () => {
        this.aviso.set('Nueva versión subida (PENDIENTE de análisis).');
        this.verVersiones(documentoId);
        this.cargar();
      },
      error: (e) => this.aviso.set(e?.error?.detail ?? 'No se pudo subir la versión.'),
    });
  }

  analizar(v: VersionDocumento, documentoId: number): void {
    this.analizando.update((m) => ({ ...m, [v.id]: true }));
    // El análisis real con AWS (Comprehend + Titan) sobre el PDF completo es lento:
    // avisamos para que no parezca colgado.
    this.aviso.set('Analizando con IA (AWS). En documentos largos puede tardar 1-2 minutos…');
    this.auditoria.analizar(v.id).subscribe({
      next: () => {
        this.analizando.update((m) => ({ ...m, [v.id]: false }));
        this.aviso.set('Análisis completado.');
        this.verVersiones(documentoId); // refresca el estado (-> COMPLETADO)
      },
      error: (e) => {
        this.analizando.update((m) => ({ ...m, [v.id]: false }));
        this.aviso.set(
          e.status === 502
            ? 'El servicio de análisis no está disponible. Inténtalo más tarde.'
            : 'No se pudo analizar la versión.',
        );
      },
    });
  }
}
