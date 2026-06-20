import { Component, ElementRef, OnDestroy, inject, signal, viewChild } from '@angular/core';
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
    <section class="max-w-3xl">
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

        <!-- Cámara + micrófono: análisis facial y de voz continuo (RF-03/04/05) -->
        <div class="mb-6 rounded-xl border border-slate-200 bg-white p-5">
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
                Analizando en vivo · {{ capturas() }} capturas
              </span>
              @if (audioActivo()) {
                <span class="flex items-center gap-1 text-xs font-medium text-sky-700">
                  <span class="h-2 w-2 animate-pulse rounded-full bg-sky-500"></span>
                  voz
                </span>
              }
              <button
                (click)="finalizarDefensa()"
                [disabled]="finalizando()"
                class="rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700 disabled:opacity-50"
              >
                {{ finalizando() ? 'Finalizando…' : 'Finalizar simulación' }}
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
                Nivel de micrófono — habla para ver si capta ({{ nivelAudio() }})
              </p>
              <div class="h-3 w-full overflow-hidden rounded-full bg-slate-200">
                <div
                  class="h-full rounded-full bg-emerald-500 transition-[width] duration-100"
                  [style.width.%]="nivelAudio()"
                ></div>
              </div>
            </div>
          }

          @if (transcripcion(); as t) {
            <p class="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-sm italic text-slate-600">
              🎙️ “{{ t }}”
            </p>
          }
        </div>

        <h3 class="mb-3 text-sm font-semibold text-slate-700">Historial por intervalo</h3>
        <div class="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table class="w-full text-sm">
            <thead class="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>
                <th class="px-4 py-3">Postura</th>
                <th class="px-4 py-3">Contacto visual</th>
                <th class="px-4 py-3">Muletillas</th>
                <th class="px-4 py-3">Pausas</th>
                <th class="px-4 py-3">Ritmo</th>
              </tr>
            </thead>
            <tbody>
              @for (m of metricas(); track m.id) {
                <tr class="border-t border-slate-100">
                  <td class="px-4 py-3 text-slate-700">{{ m.postura_score ?? '—' }}</td>
                  <td class="px-4 py-3 text-slate-700">{{ m.contacto_visual_pct ?? '—' }}</td>
                  <td class="px-4 py-3 text-slate-700">{{ m.muletillas_conteo }}</td>
                  <td class="px-4 py-3 text-slate-700">{{ m.pausas_largas_conteo }}</td>
                  <td class="px-4 py-3 text-slate-700">{{ m.ritmo_wpm ?? '—' }}</td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="5" class="px-4 py-6 text-center text-slate-400">
                    {{ cargando() ? 'Cargando…' : 'Activa la cámara para empezar a analizar.' }}
                  </td>
                </tr>
              }
            </tbody>
          </table>
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
  private readonly preview = viewChild<ElementRef<HTMLVideoElement>>('preview');
  private readonly audio = new AudioStreamer();
  private stream: MediaStream | null = null;
  private intervalo: ReturnType<typeof setInterval> | null = null;
  private enVuelo = false;

  protected readonly sesionId = Number(this.route.snapshot.queryParamMap.get('sesion'));
  protected readonly resumen = signal<ResumenBiometrico | null>(null);
  protected readonly metricas = signal<MetricaBiometrica[]>([]);
  protected readonly camara = signal(false);
  protected readonly audioActivo = signal(false);
  protected readonly enCurso = signal(false);
  protected readonly nivelAudio = signal(0);
  protected readonly microfonos = signal<{ id: string; label: string }[]>([]);
  protected readonly micActual = signal('');
  protected readonly capturas = signal(0);
  protected readonly cargando = signal(false);
  protected readonly finalizando = signal(false);
  protected readonly transcripcion = signal<string | null>(null);
  protected readonly aviso = signal<string | null>(null);

  constructor() {
    if (this.sesionId) {
      this.cargar();
      // Solo abrimos cámara/micrófono si la defensa está EN CURSO; en una sesión ya
      // finalizada esta pantalla es solo lectura (no reabrir el hardware).
      this.simSrv.detalle(this.sesionId).subscribe({
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
    this.srv.resumen(this.sesionId).subscribe({
      next: (r) => this.resumen.set(r),
      error: (e) => this.aviso.set(this.mensajeError(e)),
    });
    this.srv.metricas(this.sesionId).subscribe({
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
      // Análisis de video continuo: un frame cada INTERVALO_MS mientras dura la defensa.
      this.capturarFrame();
      this.intervalo = setInterval(() => this.capturarFrame(), INTERVALO_MS);
      // Análisis de voz continuo (RF-05) por WebSocket → AWS Transcribe Streaming.
      this.iniciarAudio();
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
    this.cargar(); // refresca tabla + resumen con la nueva métrica de voz
  }

  private capturarFrame(): void {
    const video = this.preview()?.nativeElement;
    if (!video || !video.videoWidth || this.enVuelo) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')?.drawImage(video, 0, 0);
    this.enVuelo = true;
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          this.enVuelo = false;
          return;
        }
        this.srv.analizarFrame(this.sesionId, blob).subscribe({
          next: () => {
            this.enVuelo = false;
            this.capturas.update((n) => n + 1);
            this.cargar();
          },
          error: (e) => {
            this.enVuelo = false;
            this.detenerCaptura(); // detiene solo el bucle de video ante un error (402/404/502…)
            this.aviso.set(this.mensajeError(e));
          },
        });
      },
      'image/jpeg',
      0.8,
    );
  }

  /** Finaliza la SIMULACIÓN (no solo apaga la cámara): cierra la sesión y vuelve al listado. */
  finalizarDefensa(): void {
    this.detener();
    this.finalizando.set(true);
    this.simSrv.finalizar(this.sesionId).subscribe({
      next: () => this.router.navigate(['/app/simulador']),
      // 409 si ya estaba cerrada: igualmente salimos al listado.
      error: () => this.router.navigate(['/app/simulador']),
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
    this.detenerCaptura();
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
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
