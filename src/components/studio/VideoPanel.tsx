import { useRef, useState } from "react";
import { Field, PanelHeader, Status, btnGhost, btnPrimary, inputClass } from "@/components/studio/ui";
import { downloadUrl } from "@/lib/download";
import { isSexualRequest, SEXUAL_BLOCK } from "@/lib/policy";
import { pollVideo, startVideo } from "@/lib/studio-ai";

export function VideoPanel() {
  const [prompt, setPrompt] = useState("Um farol na névoa, câmera lenta, amanhecer.");
  const [duration, setDuration] = useState(6);
  const [aspect, setAspect] = useState<"16:9" | "9:16">("16:9");
  const [audio, setAudio] = useState(false);
  const [localSeconds, setLocalSeconds] = useState(12);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [url, setUrl] = useState("");
  const stopRef = useRef(false);

  async function runAi() {
    if (isSexualRequest(prompt)) {
      setError(SEXUAL_BLOCK);
      return;
    }
    stopRef.current = false;
    setBusy("Pedindo o vídeo…");
    setError("");
    setUrl("");
    try {
      const started = await startVideo({ data: { prompt, duration, aspect, audio } });
      if (!started.ok) {
        setError(started.error);
        setBusy("");
        return;
      }
      for (let attempt = 0; attempt < 40; attempt += 1) {
        if (stopRef.current) return;
        await wait(5000);
        const polled = await pollVideo({ data: { id: started.id } });
        if (polled.ok) {
          setUrl(polled.url);
          setBusy("");
          return;
        }
        if (!polled.pending) {
          setError(polled.error);
          setBusy("");
          return;
        }
        setBusy(`Renderizando… ${polled.status}`);
      }
      setError("O vídeo ainda não ficou pronto. Tente de novo em instantes.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "O vídeo falhou.");
    } finally {
      setBusy("");
    }
  }

  async function runLocal() {
    if (isSexualRequest(prompt)) {
      setError(SEXUAL_BLOCK);
      return;
    }
    setBusy("Gravando motion…");
    setError("");
    try {
      const blob = await recordMotion(prompt, localSeconds, aspect);
      if (url.startsWith("blob:")) URL.revokeObjectURL(url);
      setUrl(URL.createObjectURL(blob));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não gravou o motion.");
    } finally {
      setBusy("");
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PanelHeader
        kicker="Vídeo"
        title="Do texto a um clipe curto."
        text="A IA gera até 10 segundos (o modelo chega perto de 15; aqui o teto é menor para não queimar a cota). O motion no aparelho grava tipografia e formas a partir do texto, até 30 segundos, sem gastar crédito."
      />
      <div className="flex flex-col gap-4">
        <Field label="Descrição">
          <textarea className={inputClass} rows={4} value={prompt} onChange={(event) => setPrompt(event.target.value)} />
        </Field>
        <div className="flex flex-wrap gap-2">
          <button type="button" className={aspect === "16:9" ? btnPrimary : btnGhost} onClick={() => setAspect("16:9")}>
            16:9
          </button>
          <button type="button" className={aspect === "9:16" ? btnPrimary : btnGhost} onClick={() => setAspect("9:16")}>
            9:16
          </button>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Duração na IA" hint={`${duration} s · 480p`}>
            <input
              type="range"
              min={6}
              max={10}
              step={2}
              value={duration}
              onChange={(event) => setDuration(Number(event.target.value))}
            />
          </Field>
          <Field label="Duração do motion" hint={`${localSeconds} s neste aparelho`}>
            <input
              type="range"
              min={8}
              max={30}
              step={2}
              value={localSeconds}
              onChange={(event) => setLocalSeconds(Number(event.target.value))}
            />
          </Field>
        </div>
        <label className="flex items-center gap-3 text-sm text-fg">
          <input type="checkbox" checked={audio} onChange={(event) => setAudio(event.target.checked)} />
          Pedir som na IA (gasta mais)
        </label>
        <div className="flex flex-wrap gap-2">
          <button type="button" className={btnPrimary} disabled={Boolean(busy) || !prompt.trim()} onClick={() => void runAi()}>
            Gerar com IA
          </button>
          <button type="button" className={btnGhost} disabled={Boolean(busy) || !prompt.trim()} onClick={() => void runLocal()}>
            Motion no aparelho
          </button>
        </div>
        <Status error={error} note={busy || undefined} />
        {url ? (
          <div className="flex flex-col gap-3">
            <video className="w-full rounded-2xl border border-line bg-black" controls src={url} playsInline />
            <button type="button" className={btnGhost} onClick={() => downloadUrl(url, "lumen-video.webm")}>
              Baixar vídeo
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function recordMotion(prompt: string, seconds: number, aspect: "16:9" | "9:16") {
  const canvas = document.createElement("canvas");
  canvas.width = aspect === "16:9" ? 1280 : 720;
  canvas.height = aspect === "16:9" ? 720 : 1280;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Sem canvas.");
  const stream = canvas.captureStream(30);
  const audioCtx = new AudioContext();
  const dest = audioCtx.createMediaStreamDestination();
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  const base = 110 + (hash(prompt) % 80);
  osc.type = "sine";
  osc.frequency.value = base;
  gain.gain.value = 0.05;
  osc.connect(gain);
  gain.connect(dest);
  const fifth = audioCtx.createOscillator();
  fifth.type = "triangle";
  fifth.frequency.value = base * 1.5;
  const gain2 = audioCtx.createGain();
  gain2.gain.value = 0.02;
  fifth.connect(gain2);
  gain2.connect(dest);
  const track = dest.stream.getAudioTracks()[0];
  if (track) stream.addTrack(track);
  const mime = pickMime();
  const recorder = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 1_800_000 });
  const chunks: Blob[] = [];
  recorder.ondataavailable = (event) => {
    if (event.data.size) chunks.push(event.data);
  };
  const done = new Promise<Blob>((resolve) => {
    recorder.onstop = () => resolve(new Blob(chunks, { type: "video/webm" }));
  });
  osc.start();
  fifth.start();
  recorder.start();
  const started = performance.now();
  const words = prompt.split(/\s+/).filter(Boolean).slice(0, 10);
  await new Promise<void>((resolve) => {
    const frame = (now: number) => {
      const t = (now - started) / 1000;
      if (t >= seconds) {
        resolve();
        return;
      }
      drawFrame(ctx, canvas.width, canvas.height, t, seconds, words, hash(prompt));
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  });
  recorder.stop();
  osc.stop();
  fifth.stop();
  await audioCtx.close();
  return done;
}

function drawFrame(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  time: number,
  seconds: number,
  words: string[],
  seed: number,
) {
  ctx.fillStyle = "#12110e";
  ctx.fillRect(0, 0, width, height);
  const count = 5 + (seed % 4);
  for (let i = 0; i < count; i += 1) {
    const angle = time * 0.35 + i + seed;
    const radius = Math.min(width, height) * (0.12 + (i % 3) * 0.08);
    const x = width / 2 + Math.cos(angle) * radius;
    const y = height / 2 + Math.sin(angle * 0.8) * radius * 0.55;
    ctx.beginPath();
    ctx.arc(x, y, 18 + (i % 3) * 14, 0, Math.PI * 2);
    ctx.fillStyle = i % 2 === 0 ? "rgba(226,161,90,0.85)" : "rgba(244,239,230,0.18)";
    ctx.fill();
  }
  const index = Math.min(words.length - 1, Math.floor((time / seconds) * words.length));
  ctx.fillStyle = "#f4efe6";
  ctx.textAlign = "center";
  ctx.font = `560 ${Math.round(Math.min(width, height) * 0.08)}px Fraunces, serif`;
  ctx.fillText(words[index] || "Lúmen", width / 2, height * 0.46);
  ctx.font = "500 22px Outfit, sans-serif";
  ctx.fillStyle = "#a39b8c";
  ctx.fillText(words.filter((_, wordIndex) => wordIndex !== index).slice(0, 4).join("  ·  "), width / 2, height * 0.58);
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.fillRect(0, height - 8, width, 8);
  ctx.fillStyle = "#e2a15a";
  ctx.fillRect(0, height - 8, width * (time / seconds), 8);
}

function hash(text: string) {
  let value = 0;
  for (let i = 0; i < text.length; i += 1) value = (value * 33 + text.charCodeAt(i)) >>> 0;
  return value;
}

function pickMime() {
  const candidates = ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"];
  return candidates.find((item) => MediaRecorder.isTypeSupported(item)) ?? "video/webm";
}
