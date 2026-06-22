/** Métrica que devuelve el backend por el WebSocket de video (Rekognition, RF-04). */
export interface VideoMetrica {
  postura?: number;
  contacto_visual?: number;
  error?: string;
}

const INTERVALO_MS = 2000; // un frame cada 2 s (igual que la simulación)

/**
 * Captura la cámara y transmite frames JPEG por WebSocket al backend (→ AWS Rekognition),
 * que responde la métrica de postura y contacto visual por frame. Mismo transporte que el
 * biométrico de la presentación; reutilizable (p. ej. el tribunal por voz).
 */
export class VideoStreamer {
  private stream: MediaStream | null = null;
  private ws: WebSocket | null = null;
  private intervalo: ReturnType<typeof setInterval> | null = null;
  private cerrando = false;
  private video: HTMLVideoElement | null = null;

  /** Solo abre la cámara y muestra el preview (sin transmitir todavía). */
  async abrirPreview(video: HTMLVideoElement): Promise<void> {
    if (this.stream) return; // ya abierta
    this.video = video;
    this.stream = await navigator.mediaDevices.getUserMedia({ video: true });
    video.srcObject = this.stream;
    await video.play();
  }

  /** Abre cámara + WebSocket y empieza a transmitir. Resuelve al conectar; rechaza si falla. */
  async iniciar(
    url: string,
    video: HTMLVideoElement,
    onMetrica: (m: VideoMetrica) => void,
  ): Promise<void> {
    await this.abrirPreview(video);
    await this.iniciarStream(url, onMetrica);
  }

  /** Empieza a enviar frames al backend (la cámara ya debe estar abierta con `abrirPreview`). */
  async iniciarStream(url: string, onMetrica: (m: VideoMetrica) => void): Promise<void> {
    this.cerrando = false;
    this.ws = new WebSocket(url);
    this.ws.binaryType = 'arraybuffer';
    try {
      await new Promise<void>((resolve, reject) => {
        const ws = this.ws!;
        ws.onopen = () => resolve();
        ws.onerror = () => reject(new Error('No se pudo conectar el análisis de video.'));
      });
    } catch (e) {
      this.ws?.close();
      this.ws = null;
      throw e;
    }

    this.ws.onmessage = (ev) => {
      try {
        onMetrica(JSON.parse(ev.data as string) as VideoMetrica);
      } catch {
        /* ignora frames no-JSON */
      }
    };
    this.ws.onerror = () => onMetrica({ error: 'Error en la conexión de video.' });
    this.ws.onclose = (ev) => {
      if (!this.cerrando && ev.code !== 1000) {
        onMetrica({ error: `Análisis de video desconectado (código ${ev.code}).` });
      }
    };

    this.capturar();
    this.intervalo = setInterval(() => this.capturar(), INTERVALO_MS);
  }

  private capturar(): void {
    const v = this.video;
    if (!v || !v.videoWidth || this.ws?.readyState !== WebSocket.OPEN) return;
    const canvas = document.createElement('canvas');
    canvas.width = v.videoWidth;
    canvas.height = v.videoHeight;
    canvas.getContext('2d')?.drawImage(v, 0, 0);
    canvas.toBlob(
      (blob) => {
        if (blob && this.ws?.readyState === WebSocket.OPEN) {
          void blob.arrayBuffer().then((buf) => this.ws?.send(buf));
        }
      },
      'image/jpeg',
      0.8,
    );
  }

  detener(): void {
    this.cerrando = true;
    if (this.intervalo) {
      clearInterval(this.intervalo);
      this.intervalo = null;
    }
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send('stop'); // cierre limpio del stream de video en el backend
      } catch {
        /* noop */
      }
    }
    if (this.ws) {
      this.ws.onmessage = null;
      this.ws.onclose = null;
      this.ws.onerror = null;
    }
    this.ws?.close();
    this.ws = null;
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
    if (this.video) {
      this.video.srcObject = null;
      this.video = null;
    }
  }
}
