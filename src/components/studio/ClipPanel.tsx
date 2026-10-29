import { useRef, useState } from "react";
import { Field, PanelHeader, Status, btnGhost, btnPrimary, inputClass } from "@/components/studio/ui";
import { downloadBlob } from "@/lib/download";

type StyleId = "barras" | "anel" | "onda" | "campo";

const STYLES: { id: StyleId; label: string }[] = [
  { id: "barras", label: "Barras" },
  { id: "anel", label: "Anel" },
  { id: "onda", label: "Onda" },
  { id: "campo", label: "Campo" },
];

const COLORS = [
  { id: "#e2a15a", label: "Latão" },
  { id: "#f4efe6", label: "Marfim" },
  { id: "#c46b4a", label: "Brasa" },
];

const MAX_SECONDS = 300;

export function ClipPanel() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bufferRef = useRef<AudioBuffer | null>(null);
  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [style, setStyle] = useState<StyleId>("barras");
  const [color, setColor] = useState(COLORS[0].id);
  const [duration, setDuration] = useState(0);
  const [progress, setProgress] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [url, setUrl] = useState("");

  async function onFile(file: File | undefined) {
    if (!file) return;
    setError("");
    setName(file.name);
    try {
      const ctx = new AudioContext();
      const buffer = await ctx.decodeAudioData(await file.arrayBuffer());
      await ctx.close();
      bufferRef.current = buffer;
      setDuration(buffer.duration);
      setTitle(file.name.replace(/\.[^.]+$/, "").slice(0, 48));
    } catch {
      setError("Não consegui ler esse áudio. Use MP3, WAV, M4A ou OGG.");
    }
  }

  async function record() {
    const buffer = bufferRef.current;
    const canvas = canvasRef.current;
    if (!buffer || !canvas) return;
    const ctx2d = canvas.getContext("2d");
    if (!ctx2d) return;
    setBusy(true);
    setError("");
    setProgress(0);
    const seconds = Math.min(buffer.duration, MAX_SECONDS);
    const audioCtx = new AudioContext();
    const source = audioCtx.createBufferSource();
    source.buffer = buffer;
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 256;
    const dest = audioCtx.createMediaStreamDestination();
    source.connect(analyser);
    analyser.connect(dest);
    analyser.connect(audioCtx.destination);
    const stream = canvas.captureStream(30);
    const track = dest.stream.getAudioTracks()[0];
    if (track) stream.addTrack(track);
    const mime = ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"].find((item) =>
      MediaRecorder.isTypeSupported(item),
    );
    if (!mime) {
      setError("Este navegador não grava vídeo.");
      setBusy(false);
      await audioCtx.close();
      return;
    }
    const recorder = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 2_000_000 });
    const chunks: Blob[] = [];
    recorder.ondataavailable = (event) => {
      if (event.data.size) chunks.push(event.data);
    };
    const done = new Promise<Blob>((resolve) => {
      recorder.onstop = () => resolve(new Blob(chunks, { type: "video/webm" }));
    });
    const freq = new Uint8Array(analyser.frequencyBinCount);
    const wave = new Uint8Array(analyser.fftSize);
    const startedAt = audioCtx.currentTime;
    let lastPaint = 0;
    source.start(0);
    source.stop(audioCtx.currentTime + seconds);
    recorder.start(200);
    await new Promise<void>((resolve) => {
      const frame = () => {
        const elapsed = audioCtx.currentTime - startedAt;
        analyser.getByteFrequencyData(freq);
        analyser.getByteTimeDomainData(wave);
        drawClip(ctx2d, canvas.width, canvas.height, freq, wave, style, color, title, elapsed / seconds);
        if (elapsed >= seconds - 0.05) {
          resolve();
          return;
        }
        if (elapsed - lastPaint > 0.25) {
          lastPaint = elapsed;
          setProgress(elapsed);
        }
        requestAnimationFrame(frame);
      };
      requestAnimationFrame(frame);
    });
    recorder.stop();
    source.disconnect();
    const blob = await done;
    await audioCtx.close();
    if (url) URL.revokeObjectURL(url);
    setUrl(URL.createObjectURL(blob));
    setProgress(seconds);
    setBusy(false);
  }

  const trimmed = duration > MAX_SECONDS;

  return (
    <div className="mx-auto max-w-4xl">
      <PanelHeader
        kicker="Clipe"
        title="O áudio vira vídeo, até 5 minutos."
        text="Suba um MP3 ou qualquer som. O clipe desenha o ritmo em tempo real e grava um WebM com o áudio original. Passou de 5 minutos, usamos só o começo."
      />
      <div className="grid gap-6 lg:grid-cols-[18rem_minmax(0,1fr)]">
        <div className="flex flex-col gap-4">
          <input
            className="block w-full text-sm text-muted file:mr-3 file:h-11 file:rounded-xl file:border-0 file:bg-accent file:px-4 file:font-medium file:text-accent-ink"
            type="file"
            accept="audio/*"
            onChange={(event) => void onFile(event.target.files?.[0])}
          />
          {name ? <p className="text-sm text-muted">{name}</p> : null}
          {duration > 0 ? (
            <p className="text-sm text-fg tabular-nums">
              {formatTime(Math.min(duration, MAX_SECONDS))}
              {trimmed ? " · cortado em 5:00" : ""}
            </p>
          ) : null}
          <Field label="Título no clipe">
            <input className={inputClass} value={title} maxLength={48} onChange={(event) => setTitle(event.target.value)} />
          </Field>
          <div className="flex flex-wrap gap-2">
            {STYLES.map((item) => (
              <button
                key={item.id}
                type="button"
                className={style === item.id ? btnPrimary : btnGhost}
                onClick={() => setStyle(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            {COLORS.map((item) => (
              <button
                key={item.id}
                type="button"
                aria-label={item.label}
                className="h-11 w-11 rounded-full border-2"
                style={{
                  background: item.id,
                  borderColor: color === item.id ? "#f4efe6" : "#3a342c",
                }}
                onClick={() => setColor(item.id)}
              />
            ))}
          </div>
          <button type="button" className={btnPrimary} disabled={!duration || busy} onClick={() => void record()}>
            {busy ? `Gravando ${formatTime(progress)}` : "Gravar clipe"}
          </button>
          <Status error={error} />
        </div>
        <div className="flex flex-col gap-3">
          <canvas
            ref={canvasRef}
            width={960}
            height={540}
            className="aspect-video w-full rounded-2xl border border-line bg-bg"
          />
          {url ? (
            <>
              <video className="w-full rounded-2xl border border-line" controls src={url} playsInline />
              <button
                type="button"
                className={btnGhost}
                onClick={() => {
                  void fetch(url)
                    .then((response) => response.blob())
                    .then((blob) => downloadBlob(blob, "lumen-clipe.webm"));
                }}
              >
                Baixar clipe
              </button>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function formatTime(seconds: number) {
  const total = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function drawClip(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  freq: Uint8Array,
  wave: Uint8Array,
  style: StyleId,
  color: string,
  title: string,
  progress: number,
) {
  ctx.fillStyle = "#12110e";
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  if (style === "barras") {
    const bars = 42;
    const gap = 6;
    const barW = (width - gap * (bars + 1)) / bars;
    for (let i = 0; i < bars; i += 1) {
      const value = (freq[i + 2] ?? 0) / 255;
      const h = Math.max(8, value * (height * 0.62));
      ctx.fillRect(gap + i * (barW + gap), height * 0.72 - h, barW, h);
    }
  } else if (style === "anel") {
    const cx = width / 2;
    const cy = height / 2;
    const bars = 64;
    for (let i = 0; i < bars; i += 1) {
      const value = (freq[i] ?? 0) / 255;
      const angle = (i / bars) * Math.PI * 2 - Math.PI / 2;
      const inner = 90;
      const outer = inner + 20 + value * 120;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(angle) * inner, cy + Math.sin(angle) * inner);
      ctx.lineTo(cx + Math.cos(angle) * outer, cy + Math.sin(angle) * outer);
      ctx.lineWidth = 4;
      ctx.stroke();
    }
  } else if (style === "onda") {
    ctx.beginPath();
    ctx.lineWidth = 3;
    for (let i = 0; i < wave.length; i += 1) {
      const x = (i / (wave.length - 1)) * width;
      const y = height / 2 + ((wave[i] ?? 128) - 128) * 1.4;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  } else {
    const bass = (freq[2] ?? 0) / 255;
    for (let i = 0; i < 28; i += 1) {
      const value = (freq[i * 2] ?? 0) / 255;
      const x = ((i * 97) % width);
      const y = height * 0.8 - value * height * 0.7 - bass * 20;
      ctx.beginPath();
      ctx.arc(x, y, 6 + value * 18, 0, Math.PI * 2);
      ctx.globalAlpha = 0.35 + value * 0.65;
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  if (title) {
    ctx.fillStyle = "#f4efe6";
    ctx.font = "600 36px Outfit, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(title, width / 2, style === "anel" ? height - 48 : 64);
  }
  ctx.fillStyle = "#3a342c";
  ctx.fillRect(0, height - 6, width, 6);
  ctx.fillStyle = color;
  ctx.fillRect(0, height - 6, width * Math.min(1, progress), 6);
}
