import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { Evaluacion, Pregunta, TribunalService } from './tribunal.service';

/** Tribunal virtual (CU-16 responder, CU-17 evaluación, RF-06/07). Lee ?sesion=. */
@Component({
  selector: 'app-tribunal',
  template: `
    <section class="max-w-3xl">
      <h2 class="mb-4 text-xl font-semibold text-slate-800">Tribunal virtual</h2>

      @if (aviso(); as a) {
        <p class="mb-4 rounded-lg bg-slate-100 px-4 py-3 text-sm text-slate-700">{{ a }}</p>
      }

      @if (!sesionId) {
        <p class="text-sm text-slate-500">
          Abre el tribunal desde una sesión de simulación (?sesion=ID).
        </p>
      } @else if (preguntas().length === 0) {
        <button
          (click)="iniciar()"
          [disabled]="generando()"
          class="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
        >
          {{ generando() ? 'Generando…' : 'Iniciar tribunal' }}
        </button>
      } @else {
        @for (p of preguntas(); track p.id) {
          <div class="mb-4 rounded-xl border border-slate-200 bg-white p-5">
            <p class="mb-3 font-medium text-slate-800">{{ p.orden }}. {{ p.texto }}</p>

            @if (evaluaciones()[p.id]; as ev) {
              <div class="rounded-lg bg-slate-50 p-3">
                <p class="text-sm text-slate-700">
                  Puntuación: <span class="font-semibold">{{ ev.puntuacion }}</span> · Profundidad:
                  {{ ev.profundidad }}
                </p>
                @if (ev.observaciones) {
                  <p class="mt-1 text-sm text-slate-600">{{ ev.observaciones }}</p>
                }
              </div>
            } @else {
              <textarea
                (input)="onTexto($event, p.id)"
                rows="3"
                placeholder="Tu respuesta…"
                class="mb-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              ></textarea>
              <input
                (input)="onAudio($event, p.id)"
                placeholder="…o una URL de audio (opcional)"
                class="mb-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
              <button
                (click)="responder(p)"
                [disabled]="!borrador()[p.id] && !audio()[p.id]"
                class="rounded-lg bg-slate-900 px-3 py-2 text-sm text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Responder
              </button>
              @if (!borrador()[p.id] && !audio()[p.id]) {
                <p class="mt-1 text-xs text-slate-400">
                  Escribe tu respuesta (o pega una URL de audio) para habilitar el botón.
                </p>
              }
            }
          </div>
        }
      }
    </section>
  `,
})
export class Tribunal {
  private readonly srv = inject(TribunalService);
  private readonly route = inject(ActivatedRoute);

  protected readonly sesionId = Number(this.route.snapshot.queryParamMap.get('sesion'));
  protected readonly preguntas = signal<Pregunta[]>([]);
  protected readonly evaluaciones = signal<Record<number, Evaluacion>>({});
  protected readonly borrador = signal<Record<number, string>>({});
  protected readonly audio = signal<Record<number, string>>({});
  protected readonly generando = signal(false);
  protected readonly aviso = signal<string | null>(null);

  constructor() {
    if (this.sesionId) {
      this.srv.listarPreguntas(this.sesionId).subscribe((ps) => this.preguntas.set(ps));
    }
  }

  iniciar(): void {
    this.generando.set(true);
    this.srv.generarPreguntas(this.sesionId).subscribe({
      next: (ps) => {
        this.preguntas.set(ps);
        this.generando.set(false);
      },
      error: (e) => {
        this.aviso.set(this.mensajeError(e));
        this.generando.set(false);
      },
    });
  }

  onTexto(event: Event, preguntaId: number): void {
    const value = (event.target as HTMLTextAreaElement).value;
    this.borrador.update((b) => ({ ...b, [preguntaId]: value }));
  }

  onAudio(event: Event, preguntaId: number): void {
    const value = (event.target as HTMLInputElement).value;
    this.audio.update((a) => ({ ...a, [preguntaId]: value }));
  }

  responder(p: Pregunta): void {
    const texto = this.borrador()[p.id] || null;
    const audioUrl = this.audio()[p.id] || null;
    if (!texto && !audioUrl) return;
    this.srv.responder(p.id, texto, null, audioUrl).subscribe({
      next: (ev) => this.evaluaciones.update((m) => ({ ...m, [p.id]: ev })),
      error: (e) => this.aviso.set(this.mensajeError(e)),
    });
  }

  private mensajeError(e: { status?: number }): string {
    if (e.status === 402) return 'Necesitas una suscripción activa.';
    if (e.status === 404) return 'Sesión o pregunta no encontrada.';
    if (e.status === 409) return 'Esa acción ya se realizó.';
    return 'No se pudo completar la operación.';
  }
}
