import {
  Component,
  DestroyRef,
  ElementRef,
  OnDestroy,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';

import { AudioStreamer } from '../biometrico/audio-streamer';
import { BiometricoService } from '../biometrico/biometrico.service';
import { VideoStreamer } from '../biometrico/video-streamer';
import { ResultadoSimulacion, SimulacionesService } from '../simulaciones/simulaciones.service';
import { Evaluacion, Pregunta, TribunalService } from '../tribunal/tribunal.service';

type Fase =
  | 'cargando'
  | 'reproduciendo'
  | 'listo' // pregunta ya leída, listo para grabar
  | 'grabando'
  | 'evaluando'
  | 'evaluada'
  | 'fin';

/** CU-16/17 por VOZ: el tribunal lee la pregunta (Polly) y el estudiante responde hablando. */
@Component({
  selector: 'app-tribunal-voz',
  template: `
    <section class="mx-auto max-w-2xl">
      <h2 class="mb-1 text-xl font-semibold text-slate-800">Tribunal por voz</h2>
      <p class="mb-6 text-sm text-slate-500">Defensa #{{ sesionId }}</p>

      <!-- Cámara (WebSocket → Rekognition): mide el contacto visual mientras respondes. -->
      <video
        #cam
        autoplay
        playsinline
        muted
        [hidden]="fase() !== 'listo' && fase() !== 'grabando'"
        class="mx-auto mb-4 w-full max-w-xs rounded-lg border border-slate-200 bg-slate-900"
      ></video>

      @if (aviso(); as a) {
        <p class="mb-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">{{ a }}</p>
      }

      @if (fase() === 'cargando') {
        <div class="flex flex-col items-center gap-3 py-16 text-slate-500">
          <div
            class="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-slate-800"
          ></div>
          Preparando las preguntas del tribunal…
        </div>
      } @else if (fase() === 'fin') {
        <!-- Resultado final -->
        @if (resultado(); as r) {
          <div class="rounded-xl border-2 border-emerald-300 bg-white p-6 text-center">
            <p class="text-sm text-slate-500">Nivel de defensa</p>
            <p class="my-2 text-4xl font-bold text-slate-900">{{ r.nivel_defensa }}</p>
            @if (r.confianza != null) {
              <p class="text-xs text-slate-500">
                Confianza del modelo: {{ (r.confianza * 100).toFixed(0) }}%
              </p>
            }
            @if (r.resumen) {
              <p class="mt-3 text-sm text-slate-600">{{ r.resumen }}</p>
            }
            <button
              (click)="volver()"
              class="mt-5 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              Volver a mis simulaciones
            </button>
            <button
              (click)="descargarInforme()"
              class="mt-2 block w-full rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
            >
              Descargar informe (PDF)
            </button>
          </div>
        }
      } @else if (preguntaActual(); as p) {
        <p class="mb-2 text-xs font-medium uppercase text-slate-400">
          Pregunta {{ idx() + 1 }} de {{ preguntas().length }}
        </p>

        <div class="rounded-xl border border-slate-200 bg-white p-5">
          <div class="mb-4 flex items-start gap-3">
            <div
              class="flex h-10 w-10 flex-none items-center justify-center rounded-full"
              [class.bg-sky-100]="fase() === 'reproduciendo'"
              [class.bg-slate-100]="fase() !== 'reproduciendo'"
            >
              <span class="text-xl">{{ fase() === 'reproduciendo' ? '🔊' : '⚖️' }}</span>
            </div>
            <p class="pt-1 text-base text-slate-800">{{ p.texto }}</p>
          </div>

          <!-- Controles según la fase -->
          @switch (fase()) {
            @case ('reproduciendo') {
              <p class="text-sm text-sky-700">El tribunal está hablando…</p>
            }
            @case ('listo') {
              <div class="flex flex-wrap gap-2">
                <button
                  (click)="grabar()"
                  class="rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700"
                >
                  🎤 Grabar respuesta
                </button>
                <button
                  (click)="reproducir()"
                  class="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                >
                  🔁 Repetir pregunta
                </button>
              </div>
            }
            @case ('grabando') {
              <div>
                <div class="mb-2 flex items-center gap-2 text-sm font-medium text-rose-700">
                  <span class="h-2 w-2 animate-pulse rounded-full bg-rose-500"></span>
                  Grabando… habla tu respuesta
                </div>
                <div class="mb-3 h-2 w-full overflow-hidden rounded-full bg-slate-200">
                  <div
                    class="h-full rounded-full bg-emerald-500 transition-[width] duration-100"
                    [style.width.%]="nivelAudio()"
                  ></div>
                </div>
                @if (mirada() > 0) {
                  <p
                    class="mb-2 text-xs font-medium"
                    [class.text-emerald-700]="mirada() >= 50"
                    [class.text-amber-700]="mirada() < 50"
                  >
                    👁️ Contacto visual: {{ mirada() }}%{{
                      mirada() < 50 ? ' · mira a la cámara' : ''
                    }}
                  </p>
                }
                <p
                  class="mb-3 min-h-[2.5rem] rounded-lg bg-slate-50 px-3 py-2 text-sm italic text-slate-600"
                >
                  {{ acumulado() || 'Escuchando…' }}
                </p>
                <button
                  (click)="terminar()"
                  class="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
                >
                  ⏹ Terminar respuesta
                </button>
              </div>
            }
            @case ('evaluando') {
              <p class="text-sm text-slate-500">Evaluando tu respuesta…</p>
            }
            @case ('evaluada') {
              @if (evaluacion(); as e) {
                <div
                  class="rounded-lg border p-3"
                  [class.border-emerald-300]="puntNum(e) >= 7"
                  [class.bg-emerald-50]="puntNum(e) >= 7"
                  [class.border-amber-300]="puntNum(e) >= 4 && puntNum(e) < 7"
                  [class.bg-amber-50]="puntNum(e) >= 4 && puntNum(e) < 7"
                  [class.border-rose-300]="puntNum(e) < 4"
                  [class.bg-rose-50]="puntNum(e) < 4"
                >
                  <p class="text-lg font-bold text-slate-800">{{ e.puntuacion }} / 10</p>
                  @if (e.observaciones) {
                    <p class="mt-1 text-sm text-slate-600">{{ e.observaciones }}</p>
                  }
                </div>
                <button
                  (click)="siguiente()"
                  class="mt-4 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
                >
                  {{ esUltima() ? 'Finalizar y ver resultado' : 'Siguiente pregunta →' }}
                </button>
              }
            }
          }
        </div>
      }
    </section>
  `,
})
export class TribunalVoz implements OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly tribunal = inject(TribunalService);
  private readonly simSrv = inject(SimulacionesService);
  private readonly bioSrv = inject(BiometricoService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly audio = new AudioStreamer();
  private readonly video = new VideoStreamer();
  private readonly cam = viewChild<ElementRef<HTMLVideoElement>>('cam');

  private audioEl?: HTMLAudioElement;
  private urlActual?: string;
  private sumContacto = 0; // acumula contacto visual de la respuesta en curso
  private nContacto = 0;

  protected readonly sesionId = Number(this.route.snapshot.queryParamMap.get('sesion'));
  protected readonly preguntas = signal<Pregunta[]>([]);
  protected readonly idx = signal(0);
  protected readonly fase = signal<Fase>('cargando');
  protected readonly acumulado = signal('');
  protected readonly nivelAudio = signal(0);
  protected readonly evaluacion = signal<Evaluacion | null>(null);
  protected readonly resultado = signal<ResultadoSimulacion | null>(null);
  protected readonly aviso = signal<string | null>(null);
  protected readonly mirada = signal(0); // contacto visual en vivo (%) durante la respuesta

  protected readonly preguntaActual = computed(() => this.preguntas()[this.idx()] ?? null);
  protected esUltima(): boolean {
    return this.idx() >= this.preguntas().length - 1;
  }

  protected puntNum(e: Evaluacion): number {
    return Number(e.puntuacion) || 0;
  }

  constructor() {
    if (this.sesionId) {
      this.cargar();
    } else {
      this.aviso.set('Abre el tribunal desde una simulación (?sesion=ID).');
    }
  }

  ngOnDestroy(): void {
    this.audio.detener();
    this.video.detener();
    this.limpiarAudio();
  }

  private cargar(): void {
    this.tribunal
      .listarPreguntas(this.sesionId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (ps) => (ps.length ? this.iniciarCon(ps) : this.generar()),
        error: (e) => this.aviso.set(this.msg(e)),
      });
  }

  private generar(): void {
    this.tribunal
      .generarPreguntas(this.sesionId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (ps) => this.iniciarCon(ps),
        // 409: ya tenía preguntas (carrera) → re-listar.
        error: () =>
          this.tribunal.listarPreguntas(this.sesionId).subscribe({
            next: (ps) => this.iniciarCon(ps),
            error: (e) => this.aviso.set(this.msg(e)),
          }),
      });
  }

  private iniciarCon(ps: Pregunta[]): void {
    if (!ps.length) {
      this.aviso.set('No se pudieron generar preguntas para esta simulación.');
      return;
    }
    this.preguntas.set([...ps].sort((a, b) => a.orden - b.orden));
    this.idx.set(0);
    this.reproducir();
  }

  /** Reproduce la pregunta actual con la voz del tribunal (Polly). */
  protected reproducir(): void {
    const p = this.preguntaActual();
    if (!p) return;
    this.video.detener(); // cámara apagada mientras habla el tribunal
    this.fase.set('reproduciendo');
    this.aviso.set(null);
    this.tribunal
      .vozPregunta(p.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (blob) => this.reproducirBlob(blob, () => this.alListo()),
        // Si la voz falla, igual se puede responder (la pregunta está en pantalla).
        error: () => {
          this.aviso.set('No se pudo reproducir la voz; puedes responder igualmente.');
          this.alListo();
        },
      });
  }

  /** La pregunta terminó: listo para responder; encendemos el preview de la cámara. */
  private alListo(): void {
    this.fase.set('listo');
    const cam = this.cam()?.nativeElement;
    if (cam) this.video.abrirPreview(cam).catch(() => undefined);
  }

  protected async grabar(): Promise<void> {
    const p = this.preguntaActual();
    if (!p) return;
    this.fase.set('grabando');
    this.acumulado.set('');
    this.evaluacion.set(null);
    this.aviso.set(null);
    this.iniciarVideoStream(); // empieza a medir el contacto visual de la respuesta
    try {
      await this.audio.iniciar(
        this.bioSrv.audioWsUrl(this.sesionId),
        (m) => {
          if (m.error) this.aviso.set('Análisis de voz: ' + m.error);
          if (m.transcripcion) {
            this.acumulado.update((t) => `${t} ${m.transcripcion}`.trim());
          }
        },
        (n) => this.nivelAudio.set(n),
      );
    } catch {
      this.aviso.set('No se pudo acceder al micrófono. Revisa los permisos.');
      this.video.detener();
      this.fase.set('listo');
    }
  }

  /** Transmite frames a Rekognition y promedia el contacto visual de la respuesta en curso. */
  private iniciarVideoStream(): void {
    this.mirada.set(0);
    this.sumContacto = 0;
    this.nContacto = 0;
    const cam = this.cam()?.nativeElement;
    if (!cam) return;
    // abrirPreview es idempotente (si ya estaba abierta desde 'listo', no reabre).
    this.video
      .abrirPreview(cam)
      .then(() =>
        this.video.iniciarStream(this.bioSrv.videoWsUrl(this.sesionId), (m) => {
          if (m.contacto_visual != null) {
            this.sumContacto += m.contacto_visual;
            this.nContacto += 1;
            this.mirada.set(Math.round(m.contacto_visual));
          }
        }),
      )
      .catch(() => {
        /* sin cámara: la respuesta no se penaliza por mirada (atención = null) */
      });
  }

  protected terminar(): void {
    const p = this.preguntaActual();
    if (!p) return;
    this.audio.detener();
    this.video.detener();
    this.nivelAudio.set(0);
    const texto = this.acumulado().trim();
    if (!texto) {
      this.aviso.set('No se captó tu respuesta; intenta grabar de nuevo.');
      this.fase.set('listo');
      return;
    }
    // Contacto visual promedio (0-1) de la respuesta; null si no hubo cámara (no penaliza).
    const atencion = this.nContacto > 0 ? this.sumContacto / this.nContacto / 100 : null;
    this.fase.set('evaluando');
    this.tribunal
      .responder(p.id, texto, atencion)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (e) => {
          this.evaluacion.set(e);
          this.fase.set('evaluada');
        },
        // Si ya estaba respondida (409), mostramos la evaluación existente.
        error: () =>
          this.tribunal.evaluacion(p.id).subscribe({
            next: (e) => {
              this.evaluacion.set(e);
              this.fase.set('evaluada');
            },
            error: (e2) => {
              this.aviso.set(this.msg(e2));
              this.fase.set('listo');
            },
          }),
      });
  }

  protected siguiente(): void {
    if (this.esUltima()) {
      this.finalizar();
      return;
    }
    this.idx.update((i) => i + 1);
    this.evaluacion.set(null);
    this.acumulado.set('');
    this.reproducir();
  }

  private finalizar(): void {
    this.fase.set('evaluando');
    this.simSrv
      .generarResultado(this.sesionId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (r) => {
          this.resultado.set(r);
          this.fase.set('fin');
        },
        error: (e) => {
          this.aviso.set(this.msg(e));
          this.fase.set('evaluada');
        },
      });
  }

  protected volver(): void {
    this.router.navigate(['/app/simulador']);
  }

  protected descargarInforme(): void {
    this.tribunal.informePdf(this.sesionId).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `informe_tribunal_${this.sesionId}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
      },
      error: (e) => this.aviso.set(this.msg(e)),
    });
  }

  private reproducirBlob(blob: Blob, onEnded: () => void): void {
    this.limpiarAudio();
    this.urlActual = URL.createObjectURL(blob);
    this.audioEl = new Audio(this.urlActual);
    this.audioEl.onended = onEnded;
    this.audioEl.onerror = onEnded;
    this.audioEl.play().catch(onEnded);
  }

  private limpiarAudio(): void {
    this.audioEl?.pause();
    if (this.urlActual) {
      URL.revokeObjectURL(this.urlActual);
      this.urlActual = undefined;
    }
    this.audioEl = undefined;
  }

  private msg(e: { status?: number }): string {
    if (e.status === 402) return 'Necesitas una suscripción activa.';
    if (e.status === 404) return 'La simulación no existe o no es tuya.';
    return 'Ocurrió un error; intenta de nuevo.';
  }
}
