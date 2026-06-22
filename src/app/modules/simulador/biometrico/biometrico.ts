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

import { SimulacionesService } from '../simulaciones/simulaciones.service';
import { AudioMensaje, AudioStreamer } from './audio-streamer';
import { BiometricoService, MetricaBiometrica, ResumenBiometrico } from './biometrico.service';

const INTERVALO_MS = 2000; // analiza un frame cada 2 s durante la defensa (cuasi-tiempo-real)

/** Análisis biométrico EN VIVO de la defensa — ExpoLens (CU-14, RF-03/04/05). Lee ?sesion=.
 *  Video (Rekognition: postura + contacto visual) + audio (Transcribe: muletillas + ritmo). */
@Component({
  selector: 'app-biometrico',
  template: `
    <section class="max-w-5xl">
      <h2 class="mb-4 text-xl font-semibold text-slate-800">Análisis de la defensa (ExpoLens)</h2>

      @if (aviso(); as a) {
        <p class="mb-4 rounded-lg bg-slate-100 px-4 py-3 text-sm text-slate-700">{{ a }}</p>
      }

      @if (!sesionId) {
        <p class="text-sm text-slate-500">
          Abre el análisis desde una sesión de simulación (?sesion=ID).
        </p>
      } @else {
        @if (resumen(); as r) {
          <div class="mb-6 rounded-xl border border-slate-200 bg-white p-5">
            <p class="text-sm text-slate-500">
              Métricas acumuladas · {{ r.intervalos }} intervalos
            </p>
            <div class="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-5">
              <div>
                <p class="text-xs text-slate-500">Postura prom.</p>
                <p class="text-slate-800">{{ r.postura_score_promedio ?? '—' }}</p>
              </div>
              <div>
                <p class="text-xs text-slate-500">Contacto visual</p>
                <p class="text-slate-800">{{ r.contacto_visual_pct_promedio ?? '—' }}</p>
              </div>
              <div>
                <p class="text-xs text-slate-500">Muletillas</p>
                <p class="text-slate-800">{{ r.muletillas_total }}</p>
              </div>
              <div>
                <p class="text-xs text-slate-500">Pausas largas</p>
                <p class="text-slate-800">{{ r.pausas_total }}</p>
              </div>
              <div>
                <p class="text-xs text-slate-500">Ritmo (wpm)</p>
                <p class="text-slate-800">{{ r.ritmo_wpm_promedio ?? '—' }}</p>
              </div>
            </div>
          </div>
        }

        <!-- En vivo: cámara/controles a la izquierda, feed de lecturas (recientes arriba) a la derecha -->
        <div class="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <!-- Cámara + micrófono: análisis facial y de voz continuo (RF-03/04/05) -->
          <div class="rounded-xl border border-slate-200 bg-white p-5">
            <video
              #preview
              autoplay
              playsinline
              muted
              [hidden]="!camara()"
              class="mb-3 w-full max-w-sm rounded-lg border border-slate-200 bg-slate-900"
            ></video>

            <div class="flex flex-wrap items-center gap-3">
              @if (!camara() && enCurso()) {
                <button
                  (click)="activarCamara()"
                  class="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
                >
                  Activar cámara y micrófono
                </button>
              } @else if (camara()) {
                <span class="flex items-center gap-2 text-sm font-medium text-emerald-700">
                  <span class="h-2 w-2 animate-pulse rounded-full bg-emerald-500"></span>
                  Analizando en vivo · {{ metricas().length }} lecturas
                </span>
                @if (audioActivo()) {
                  <span class="flex items-center gap-1 text-xs font-medium text-sky-700">
                    <span class="h-2 w-2 animate-pulse rounded-full bg-sky-500"></span>
                    voz
                  </span>
                }
                <button
                  (click)="terminarPresentacion()"
                  class="rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700"
                >
                  Terminar presentación →
                </button>
              }
            </div>

            @if (camara() && microfonos().length) {
              <div class="mt-3 max-w-sm">
                <label class="mb-1 block text-xs text-slate-500"
                  >Micrófono (prueba otro si el nivel queda en 0)</label
                >
                <select
                  (change)="cambiarMicrofono($event)"
                  class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                >
                  @for (mic of microfonos(); track mic.id) {
                    <option [value]="mic.id" [selected]="mic.id === micActual()">
                      {{ mic.label }}
                    </option>
                  }
                </select>
              </div>
            }

            @if (camara()) {
              <div class="mt-3 max-w-sm">
                <p class="mb-1 text-xs text-slate-500">
                  Nivel de micrófono
                  @if (nivelAudio() > 8) {
                    <span class="font-medium text-emerald-600">· captando voz ✓</span>
                  } @else {
                    <span>— habla para probar</span>
                  }
                </p>
                <div class="h-3 w-full overflow-hidden rounded-full bg-slate-200">
                  <div
                    class="h-full rounded-full bg-emerald-500 transition-[width] duration-100"
                    [style.width.%]="nivelAudio()"
                  ></div>
                </div>
              </div>
            }

            @if (camara()) {
              <div class="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
                <span class="mb-0.5 block text-xs font-medium text-slate-400"
                  >Transcripción en vivo</span
                >
                @if (transcripcionVivo(); as t) {
                  <span class="italic">🎙️ “{{ t }}”</span>
                } @else {
                  <span class="italic text-slate-400"
                    >Escuchando… habla para ver la transcripción (puede tardar 1-2 s).</span
                  >
                }
              </div>
            }
          </div>

          <!-- Feed por intervalo: FIFO, la lectura MÁS RECIENTE arriba (sin scroll al fondo) -->
          <div class="rounded-xl border border-slate-200 bg-white p-4">
            <div class="mb-2 flex items-center justify-between">
              <h3 class="text-sm font-semibold text-slate-700">Lecturas en vivo</h3>
              <span class="text-xs text-slate-400">recientes arriba</span>
            </div>
            <ul class="flex max-h-[30rem] flex-col gap-2 overflow-y-auto pr-1">
              @for (m of metricasRecientes(); track m.id; let i = $index, primero = $first) {
                <li
                  class="rounded-lg border px-3 py-2"
                  [class.border-emerald-300]="primero"
                  [class.bg-emerald-50]="primero"
                  [class.border-slate-100]="!primero"
                  [class.bg-white]="!primero"
                >
                  <div class="mb-1 flex items-center justify-between text-xs">
                    <span class="font-medium text-slate-500"
                      >Intervalo {{ metricasRecientes().length - i }}</span
                    >
                    @if (primero) {
                      <span
                        class="rounded-full bg-emerald-100 px-2 py-0.5 font-medium text-emerald-700"
                        >más reciente</span
                      >
                    }
                  </div>
                  <div class="grid grid-cols-5 gap-1 text-center">
                    <div>
                      <p class="text-[11px] text-slate-400">Postura</p>
                      <p class="text-sm font-medium text-slate-700">{{ m.postura_score ?? '—' }}</p>
                    </div>
                    <div>
                      <p class="text-[11px] text-slate-400">Visual</p>
                      <p class="text-sm font-medium text-slate-700">
                        {{ m.contacto_visual_pct ?? '—' }}
                      </p>
                    </div>
                    <div>
                      <p class="text-[11px] text-slate-400">Muletillas</p>
                      <p class="text-sm font-medium text-slate-700">{{ m.muletillas_conteo }}</p>
                    </div>
                    <div>
                      <p class="text-[11px] text-slate-400">Pausas</p>
                      <p class="text-sm font-medium text-slate-700">{{ m.pausas_largas_conteo }}</p>
                    </div>
                    <div>
                      <p class="text-[11px] text-slate-400">Ritmo</p>
                      <p class="text-sm font-medium text-slate-700">{{ m.ritmo_wpm ?? '—' }}</p>
                    </div>
                  </div>
                </li>
              } @empty {
                <li class="py-6 text-center text-sm text-slate-400">
                  {{ cargando() ? 'Cargando…' : 'Activa la cámara para empezar a analizar.' }}
                </li>
              }
            </ul>
          </div>
        </div>
      }
    </section>
  `,
})
export class Biometrico implements OnDestroy {
  private readonly srv = inject(BiometricoService);
  private readonly simSrv = inject(SimulacionesService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly preview = viewChild<ElementRef<HTMLVideoElement>>('preview');
  private readonly audio = new AudioStreamer();
  private stream: MediaStream | null = null;
  private intervalo: ReturnType<typeof setInterval> | null = null;
  private poll: ReturnType<typeof setInterval> | null = null; // refresco periódico del feed
  private videoWs: WebSocket | null = null;
  private cerrandoVideo = false; // distingue el cierre intencional del WS de uno inesperado
  private ultimoRefresco = 0; // throttle de cargar() ante la ráfaga de mensajes de los WS

  protected readonly sesionId = Number(this.route.snapshot.queryParamMap.get('sesion'));
  protected readonly resumen = signal<ResumenBiometrico | null>(null);
  protected readonly metricas = signal<MetricaBiometrica[]>([]);
  /** Métricas de la MÁS RECIENTE a la más antigua: alimenta el feed lateral (FIFO en la UI). */
  protected readonly metricasRecientes = computed(() =>
    [...this.metricas()].sort((a, b) => b.id - a.id),
  );
  /** Transcripción en vivo armada desde los datos GUARDADOS (orden cronológico): es fiable
   *  aunque algún mensaje del WebSocket no llegue, porque se refresca por polling. */
  protected readonly transcripcionVivo = computed(() => {
    const txt = [...this.metricas()]
      .sort((a, b) => a.id - b.id)
      .map((m) => (m.transcripcion_texto ?? '').trim())
      .filter((t) => t.length > 0)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
    return txt.length > 500 ? '…' + txt.slice(-500) : txt;
  });
  protected readonly camara = signal(false);
  protected readonly audioActivo = signal(false);
  protected readonly enCurso = signal(false);
  protected readonly nivelAudio = signal(0);
  protected readonly microfonos = signal<{ id: string; label: string }[]>([]);
  protected readonly micActual = signal('');
  protected readonly capturas = signal(0);
  protected readonly cargando = signal(false);
  protected readonly transcripcion = signal<string | null>(null);
  protected readonly aviso = signal<string | null>(null);

  constructor() {
    if (this.sesionId) {
      this.cargar();
      // Solo abrimos cámara/micrófono si la defensa está EN CURSO; en una sesión ya
      // finalizada esta pantalla es solo lectura (no reabrir el hardware).
      this.simSrv
        .detalle(this.sesionId)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (s) => {
            if (s.estado === 'EN_CURSO') {
              this.enCurso.set(true);
              this.activarCamara(); // el detalle llega tras el render: #preview ya existe
            } else {
              this.aviso.set('Sesión finalizada: mostrando solo las métricas (sin cámara).');
            }
          },
          error: (e) => this.aviso.set(this.mensajeError(e)),
        });
    }
  }

  ngOnDestroy(): void {
    this.detener();
  }

  private cargar(): void {
    this.cargando.set(true);
    this.srv
      .resumen(this.sesionId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (r) => this.resumen.set(r),
        error: (e) => this.aviso.set(this.mensajeError(e)),
      });
    this.srv
      .metricas(this.sesionId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (m) => {
          this.metricas.set(m);
          this.cargando.set(false);
        },
        error: (e) => {
          this.cargando.set(false);
          this.aviso.set(this.mensajeError(e));
        },
      });
  }

  /** Refresco ACOTADO (máx. 1 cada 1.5 s): los WS de audio/video emiten varias veces por
   *  segundo; sin throttle cada mensaje dispararía 2 GET (resumen+métricas) → tormenta. */
  private refrescar(): void {
    const ahora = Date.now();
    if (ahora - this.ultimoRefresco < 1500) return;
    this.ultimoRefresco = ahora;
    this.cargar();
  }

  async activarCamara(): Promise<void> {
    if (this.camara()) return; // evita doble activación (doble cámara/WebSocket)
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ video: true });
      const video = this.preview()?.nativeElement;
      if (video) {
        video.srcObject = this.stream;
        await video.play();
      }
      this.camara.set(true);
      this.capturas.set(0);
      // Análisis de video por WebSocket: un frame cada INTERVALO_MS → AWS Rekognition.
      this.abrirVideoWs();
      this.capturarFrame();
      this.intervalo = setInterval(() => this.capturarFrame(), INTERVALO_MS);
      // Análisis de voz continuo (RF-05) por WebSocket → AWS Transcribe Streaming.
      this.iniciarAudio();
      // Refresco PERIÓDICO independiente del WS: el feed, los contadores y la transcripción
      // se actualizan desde la BD (fuente de verdad) ~cada 1.5 s aunque el WebSocket falle.
      this.poll = setInterval(() => this.cargar(), 1500);
    } catch {
      this.aviso.set('No se pudo acceder a la cámara. Revisa los permisos del navegador.');
    }
  }

  private iniciarAudio(deviceId?: string): void {
    this.audio
      .iniciar(
        this.srv.audioWsUrl(this.sesionId),
        (m) => this.onAudio(m),
        (n) => this.nivelAudio.set(n),
        deviceId,
      )
      .then(() => {
        this.audioActivo.set(true);
        // Ya con permiso concedido, listamos los micrófonos para poder elegir el correcto.
        AudioStreamer.microfonos().then((m) => this.microfonos.set(m));
      })
      .catch(() =>
        this.aviso.set('No se pudo acceder al micrófono; el análisis de voz queda inactivo.'),
      );
  }

  /** Reinicia la captura de voz con el micrófono elegido (por si el por defecto no capta). */
  cambiarMicrofono(ev: Event): void {
    const id = (ev.target as HTMLSelectElement).value;
    this.micActual.set(id);
    this.audio.detener();
    this.audioActivo.set(false);
    this.nivelAudio.set(0);
    this.iniciarAudio(id);
  }

  private onAudio(m: AudioMensaje): void {
    if (m.error) {
      this.aviso.set('Análisis de voz no disponible: ' + m.error);
      this.audioActivo.set(false);
      return;
    }
    // Acumula la transcripción (últimos ~400 car.) para ver qué oye Transcribe de verdad.
    if (m.transcripcion) {
      this.transcripcion.update((t) => `${t ?? ''} ${m.transcripcion}`.trim().slice(-400));
    }
    this.refrescar(); // refresca tabla + resumen con la nueva métrica de voz (throttled)
  }

  /** Abre el WebSocket de video → AWS Rekognition (mismo transporte que el audio). */
  private abrirVideoWs(): void {
    this.cerrandoVideo = false; // nuevo socket: un cierre ahora sí sería inesperado
    const ws = new WebSocket(this.srv.videoWsUrl(this.sesionId));
    ws.binaryType = 'arraybuffer';
    ws.onmessage = (ev) => {
      try {
        const m = JSON.parse(ev.data as string) as { error?: string };
        if (m.error) {
          this.aviso.set('Análisis de video: ' + m.error);
          return;
        }
        this.capturas.update((n) => n + 1);
        this.refrescar(); // refresca tabla + resumen con la nueva métrica de video (throttled)
      } catch {
        /* ignora frames no-JSON */
      }
    };
    ws.onerror = () => this.aviso.set('No se pudo conectar el análisis de video.');
    ws.onclose = () => {
      this.detenerCaptura(); // siempre paramos el bucle de captura
      if (!this.cerrandoVideo) {
        // Cierre INESPERADO (red/token/backend): apagamos cámara y micrófono para no dejar
        // el hardware encendido con la UI diciendo "analizando" sin análisis real.
        this.aviso.set('El análisis de video se desconectó; se detuvo la cámara.');
        this.detener();
      }
    };
    this.videoWs = ws;
  }

  private capturarFrame(): void {
    const video = this.preview()?.nativeElement;
    if (!video || !video.videoWidth || this.videoWs?.readyState !== WebSocket.OPEN) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')?.drawImage(video, 0, 0);
    // Envía el frame JPEG por WebSocket; Rekognition lo analiza y responde la métrica.
    canvas.toBlob(
      (blob) => {
        if (blob && this.videoWs?.readyState === WebSocket.OPEN) {
          void blob.arrayBuffer().then((buf) => this.videoWs?.send(buf));
        }
      },
      'image/jpeg',
      0.8,
    );
  }

  /** Termina la PRESENTACIÓN (no cierra la sesión): apaga cámara/mic y pasa al tribunal por voz.
   *  La sesión sigue EN_CURSO; el resultado se genera al terminar el tribunal. */
  terminarPresentacion(): void {
    this.detener();
    this.enCurso.set(false); // ya no debe reaparecer el botón "Activar cámara"
    this.router.navigate(['/app/simulador/tribunal-voz'], {
      queryParams: { sesion: this.sesionId },
    });
  }

  /** Detiene el bucle de captura de video (sin tocar audio ni cerrar la cámara). */
  private detenerCaptura(): void {
    if (this.intervalo) {
      clearInterval(this.intervalo);
      this.intervalo = null;
    }
  }

  /** Apaga todo: captura de video, micrófono/WebSocket y la cámara. */
  private detener(): void {
    this.cerrandoVideo = true; // cierre intencional: el onclose no debe re-disparar detener()
    this.detenerCaptura();
    if (this.poll) {
      clearInterval(this.poll);
      this.poll = null;
    }
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
    if (this.videoWs && this.videoWs.readyState === WebSocket.OPEN) {
      try {
        this.videoWs.send('stop'); // cierre limpio del stream de video en el backend
      } catch {
        /* noop */
      }
    }
    if (this.videoWs) {
      // Anula los handlers antes de cerrar: ningún callback debe tocar el componente tras esto.
      this.videoWs.onmessage = null;
      this.videoWs.onclose = null;
      this.videoWs.onerror = null;
    }
    this.videoWs?.close();
    this.videoWs = null;
    this.audio.detener();
    this.audioActivo.set(false);
    this.camara.set(false);
  }

  private mensajeError(e: { status?: number }): string {
    if (e.status === 402) return 'Necesitas una suscripción activa.';
    if (e.status === 404) return 'La sesión no existe o no es tuya.';
    if (e.status === 409) return 'La sesión no está en curso; no admite más análisis.';
    if (e.status === 502) return 'El servicio biométrico no está disponible.';
    return 'No se pudo completar la operación.';
  }
}
