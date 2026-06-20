/** Mensaje que devuelve el backend por el WebSocket de audio (RF-05). */
export interface AudioMensaje {
  transcripcion?: string;
  muletillas?: number;
  ritmo_wpm?: number | null;
  pausas?: number;
  error?: string;
}

const TASA_DESTINO = 16000; // AWS Transcribe Streaming espera PCM 16 kHz, 16-bit, mono.
const TAMANO_BUFFER = 4096;

/**
 * Captura el micrófono, lo convierte a PCM 16-bit / 16 kHz y lo transmite por WebSocket
 * al backend (que lo reenvía a AWS Transcribe Streaming). Análisis de voz EN VIVO:
 * muletillas + ritmo del habla (RF-05).
 */
export class AudioStreamer {
  private ctx: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private fuente: MediaStreamAudioSourceNode | null = null;
  private procesador: ScriptProcessorNode | null = null;
  private ws: WebSocket | null = null;
  private cerrando = false;

  /** Resuelve cuando el WebSocket está CONECTADO. Rechaza si el handshake falla (así un
   *  rechazo del backend deja de ser silencioso). Tras conectar, los cierres/errores se
   *  reportan por `onMensaje({ error })`. */
  /** Lista los micrófonos disponibles (las etiquetas requieren permiso ya concedido). */
  static async microfonos(): Promise<{ id: string; label: string }[]> {
    const dispositivos = await navigator.mediaDevices.enumerateDevices();
    return dispositivos
      .filter((d) => d.kind === 'audioinput')
      .map((d, i) => ({ id: d.deviceId, label: d.label || `Micrófono ${i + 1}` }));
  }

  async iniciar(
    url: string,
    onMensaje: (m: AudioMensaje) => void,
    onNivel?: (nivel: number) => void,
    deviceId?: string,
  ): Promise<void> {
    this.cerrando = false;
    // Auto-gain ON: sube el volumen de micrófonos flojos. deviceId: micrófono concreto.
    const audio: MediaTrackConstraints = {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    };
    if (deviceId) audio.deviceId = { exact: deviceId };
    this.stream = await navigator.mediaDevices.getUserMedia({ audio });
    // Contexto a la tasa NATIVA del navegador; re-muestreamos a 16 kHz en aPcm16. Forzar
    // sampleRate=16000 silencia el micrófono en algunos navegadores (Edge), así que no.
    this.ctx = new AudioContext();
    await this.ctx.resume(); // por si arranca suspendido (política de autoplay)
    const tasaEntrada = this.ctx.sampleRate;

    this.ws = new WebSocket(url);
    this.ws.binaryType = 'arraybuffer';

    // Espera el handshake: resuelve en open, rechaza en error (conexión rechazada/caída).
    try {
      await new Promise<void>((resolve, reject) => {
        const ws = this.ws!;
        ws.onopen = () => resolve();
        ws.onerror = () => reject(new Error('No se pudo conectar al análisis de voz.'));
      });
    } catch (e) {
      this.detener(); // libera micrófono/contexto si la conexión no se estableció
      throw e;
    }

    // Conectado: a partir de aquí los fallos se reportan por callback, no rechazan.
    this.ws.onmessage = (ev) => {
      try {
        onMensaje(JSON.parse(ev.data as string) as AudioMensaje);
      } catch {
        /* ignora frames que no sean JSON */
      }
    };
    this.ws.onerror = () => onMensaje({ error: 'Error en la conexión de voz.' });
    this.ws.onclose = (ev) => {
      if (!this.cerrando && ev.code !== 1000) {
        onMensaje({ error: `Análisis de voz desconectado (código ${ev.code}).` });
      }
    };

    this.fuente = this.ctx.createMediaStreamSource(this.stream);
    this.procesador = this.ctx.createScriptProcessor(TAMANO_BUFFER, 1, 1);
    this.procesador.onaudioprocess = (ev) => {
      const entrada = ev.inputBuffer.getChannelData(0);
      // Nivel del micrófono (RMS 0-100): permite VER si realmente entra audio del micro.
      if (onNivel) {
        let suma = 0;
        for (let i = 0; i < entrada.length; i++) {
          const v = entrada[i] ?? 0;
          suma += v * v;
        }
        const rms = Math.sqrt(suma / entrada.length);
        // Escala perceptual: la voz normal tiene RMS bajo y con escala lineal queda en ~0.
        // sqrt(rms) hace visible el audio presente aunque sea de volumen bajo.
        onNivel(Math.min(100, Math.round(Math.sqrt(rms) * 280)));
      }
      if (this.ws?.readyState !== WebSocket.OPEN) return;
      this.ws.send(this.aPcm16(entrada, tasaEntrada));
    };

    // El procesador debe alcanzar el destino para emitir eventos; su salida es silencio.
    this.fuente.connect(this.procesador);
    this.procesador.connect(this.ctx.destination);

    if (this.ctx.state !== 'running') {
      onMensaje({ error: 'El audio está suspendido; interactúa con la página y reintenta.' });
    }
  }

  detener(): void {
    this.cerrando = true;
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send('stop'); // pide al backend cerrar el stream de Transcribe limpiamente
      } catch {
        /* noop */
      }
    }
    this.procesador?.disconnect();
    this.fuente?.disconnect();
    this.stream?.getTracks().forEach((t) => t.stop());
    void this.ctx?.close();
    this.ws?.close();
    this.ctx = null;
    this.stream = null;
    this.fuente = null;
    this.procesador = null;
    this.ws = null;
  }

  /** Re-muestrea a 16 kHz (decimación) y convierte Float32 [-1,1] a PCM Int16 little-endian. */
  private aPcm16(muestras: Float32Array, tasaEntrada: number): ArrayBuffer {
    const ratio = tasaEntrada / TASA_DESTINO;
    const longitud = Math.floor(muestras.length / ratio);
    const vista = new DataView(new ArrayBuffer(longitud * 2));
    for (let i = 0; i < longitud; i++) {
      const muestra = muestras[Math.floor(i * ratio)] ?? 0;
      const acotada = Math.max(-1, Math.min(1, muestra));
      vista.setInt16(i * 2, acotada < 0 ? acotada * 0x8000 : acotada * 0x7fff, true);
    }
    return vista.buffer;
  }
}
