import { useEffect, useRef, useState } from "react";
import { Field, PanelHeader, Status, btnGhost, btnPrimary, inputClass } from "@/components/studio/ui";
import { downloadUrl } from "@/lib/download";
import { isSexualRequest, SEXUAL_BLOCK } from "@/lib/policy";
import { editImage, generateImage } from "@/lib/studio-ai";

type FilterName = "none" | "pb" | "sepia" | "fade" | "cinema";

type Adjustments = {
  exposure: number;
  contrast: number;
  saturation: number;
  warmth: number;
  vignette: number;
  grain: number;
  filter: FilterName;
  text: string;
};

const DEFAULTS: Adjustments = {
  exposure: 1,
  contrast: 1,
  saturation: 1,
  warmth: 0,
  vignette: 0,
  grain: 0,
  filter: "none",
  text: "",
};

type MadeImage = { src: string; mime: string };

export function ImagePanel() {
  const [mode, setMode] = useState<"ajustes" | "gerar" | "editar">("ajustes");
  const [source, setSource] = useState<HTMLImageElement | null>(null);
  const [adj, setAdj] = useState<Adjustments>(DEFAULTS);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [prompt, setPrompt] = useState("");
  const [aspect, setAspect] = useState("1:1");
  const [detail, setDetail] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [made, setMade] = useState<MadeImage | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !source) return;
    paint(canvas, source, adj);
  }, [source, adj, mode]);

  async function onFile(file: File | undefined) {
    if (!file) return;
    setError("");
    try {
      const dataUrl = await fileToJpeg(file, 1400);
      setSource(await loadImage(dataUrl));
      setAdj(DEFAULTS);
      setMode("ajustes");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não abriu a imagem.");
    }
  }

  async function runGenerate() {
    if (isSexualRequest(prompt)) {
      setError(SEXUAL_BLOCK);
      return;
    }
    setBusy(true);
    setError("");
    try {
      const result = await generateImage({ data: { prompt, aspect, detail } });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setMade(toMade(result));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "A geração falhou.");
    } finally {
      setBusy(false);
    }
  }

  async function runEdit() {
    if (!source || !canvasRef.current) {
      setError("Abra uma foto antes de pedir a edição.");
      return;
    }
    if (isSexualRequest(prompt)) {
      setError(SEXUAL_BLOCK);
      return;
    }
    setBusy(true);
    setError("");
    try {
      const image = canvasRef.current.toDataURL("image/jpeg", 0.82);
      const result = await editImage({ data: { prompt, image } });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setMade(toMade(result));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "A edição falhou.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl">
      <PanelHeader
        kicker="Imagem"
        title="Ajuste qualquer foto. A IA muda o que a política permite."
        text="Luz, cor, corte e texto rodam neste aparelho, na hora, em qualquer imagem que você enviar. Gerar e editar com IA segue a política do modelo: nudez e sexo explícito não entram."
      />
      <div className="mb-5 flex flex-wrap gap-2">
        {(
          [
            ["ajustes", "Ajustes"],
            ["gerar", "Gerar"],
            ["editar", "Editar com IA"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={mode === id ? btnPrimary : btnGhost}
            onClick={() => setMode(id)}
          >
            {label}
          </button>
        ))}
      </div>

      {mode === "ajustes" ? (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
          <div>
            <input
              className="mb-4 block w-full text-sm text-muted file:mr-3 file:h-11 file:rounded-xl file:border-0 file:bg-accent file:px-4 file:font-medium file:text-accent-ink"
              type="file"
              accept="image/*"
              onChange={(event) => void onFile(event.target.files?.[0])}
            />
            {source ? (
              <canvas ref={canvasRef} className="w-full rounded-2xl border border-line bg-raised" />
            ) : (
              <div className="flex h-64 items-center justify-center rounded-2xl border border-dashed border-line text-sm text-muted">
                Nenhuma foto ainda.
              </div>
            )}
            {source ? (
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" className={btnGhost} onClick={() => void crop(source, 1, setSource)}>
                  Corte 1:1
                </button>
                <button type="button" className={btnGhost} onClick={() => void crop(source, 16 / 9, setSource)}>
                  Corte 16:9
                </button>
                <button type="button" className={btnGhost} onClick={() => void rotate(source, setSource)}>
                  Girar
                </button>
                <button
                  type="button"
                  className={btnPrimary}
                  onClick={() => {
                    const canvas = canvasRef.current;
                    if (!canvas) return;
                    downloadUrl(canvas.toDataURL("image/png"), "lumen-foto.png");
                  }}
                >
                  Baixar PNG
                </button>
              </div>
            ) : null}
          </div>
          <div className="flex flex-col gap-4">
            <Range label="Exposição" min={0.6} max={1.6} step={0.02} value={adj.exposure} onChange={(exposure) => setAdj({ ...adj, exposure })} />
            <Range label="Contraste" min={0.6} max={1.6} step={0.02} value={adj.contrast} onChange={(contrast) => setAdj({ ...adj, contrast })} />
            <Range label="Saturação" min={0} max={2} step={0.02} value={adj.saturation} onChange={(saturation) => setAdj({ ...adj, saturation })} />
            <Range label="Calor" min={-40} max={40} step={1} value={adj.warmth} onChange={(warmth) => setAdj({ ...adj, warmth })} />
            <Range label="Vinheta" min={0} max={0.75} step={0.01} value={adj.vignette} onChange={(vignette) => setAdj({ ...adj, vignette })} />
            <Range label="Grão" min={0} max={0.45} step={0.01} value={adj.grain} onChange={(grain) => setAdj({ ...adj, grain })} />
            <Field label="Filtro">
              <select
                className={inputClass}
                value={adj.filter}
                onChange={(event) => setAdj({ ...adj, filter: event.target.value as FilterName })}
              >
                <option value="none">Nenhum</option>
                <option value="pb">Preto e branco</option>
                <option value="sepia">Sépia</option>
                <option value="fade">Fade</option>
                <option value="cinema">Cinema</option>
              </select>
            </Field>
            <Field label="Texto na imagem">
              <input
                className={inputClass}
                value={adj.text}
                maxLength={80}
                onChange={(event) => setAdj({ ...adj, text: event.target.value })}
              />
            </Field>
            <button type="button" className={btnGhost} onClick={() => setAdj(DEFAULTS)}>
              Zerar ajustes
            </button>
          </div>
        </div>
      ) : null}

      {mode !== "ajustes" ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="flex flex-col gap-4">
            {mode === "editar" ? (
              <>
                <input
                  className="block w-full text-sm text-muted file:mr-3 file:h-11 file:rounded-xl file:border-0 file:bg-accent file:px-4 file:font-medium file:text-accent-ink"
                  type="file"
                  accept="image/*"
                  onChange={(event) => void onFile(event.target.files?.[0])}
                />
                {source ? (
                  <canvas ref={canvasRef} className="w-full rounded-2xl border border-line" />
                ) : (
                  <p className="text-sm text-muted">Suba a foto que quer mudar. Os ajustes locais entram junto.</p>
                )}
              </>
            ) : null}
            <Field label={mode === "gerar" ? "O que criar" : "O que mudar"}>
              <textarea
                className={inputClass}
                rows={4}
                value={prompt}
                placeholder={
                  mode === "gerar"
                    ? "Um farol ao amanhecer, óleo sobre tela, luz lateral."
                    : "Transforme em desenho a lápis, mantendo o enquadramento."
                }
                onChange={(event) => setPrompt(event.target.value)}
              />
            </Field>
            {mode === "gerar" ? (
              <div className="flex flex-wrap gap-2">
                {["1:1", "16:9", "9:16", "4:3"].map((value) => (
                  <button
                    key={value}
                    type="button"
                    className={aspect === value ? btnPrimary : btnGhost}
                    onClick={() => setAspect(value)}
                  >
                    {value}
                  </button>
                ))}
              </div>
            ) : null}
            {mode === "gerar" ? (
              <label className="flex items-center gap-3 text-sm text-fg">
                <input type="checkbox" checked={detail} onChange={(event) => setDetail(event.target.checked)} />
                Mais detalhe (gasta mais da cota)
              </label>
            ) : null}
            <button
              type="button"
              className={btnPrimary}
              disabled={busy || !prompt.trim()}
              onClick={() => void (mode === "gerar" ? runGenerate() : runEdit())}
            >
              {busy ? "Gerando…" : mode === "gerar" ? "Gerar imagem" : "Aplicar edição"}
            </button>
            <Status error={error} />
          </div>
          <div>
            {made ? (
              <figure className="flex flex-col gap-3">
                <img src={made.src} alt="Resultado da IA" className="w-full rounded-2xl border border-line" />
                <div className="flex flex-wrap gap-2">
                  <button type="button" className={btnPrimary} onClick={() => downloadUrl(made.src, "lumen-imagem.png")}>
                    Baixar
                  </button>
                  <button
                    type="button"
                    className={btnGhost}
                    onClick={() => {
                      void loadImage(made.src).then((image) => {
                        setSource(image);
                        setAdj(DEFAULTS);
                        setMode("ajustes");
                      });
                    }}
                  >
                    Abrir nos ajustes
                  </button>
                </div>
              </figure>
            ) : (
              <div className="flex h-64 items-center justify-center rounded-2xl border border-dashed border-line text-sm text-muted">
                O resultado aparece aqui.
              </div>
            )}
          </div>
        </div>
      ) : (
        <Status error={error} />
      )}
    </div>
  );
}

function Range({
  label,
  min,
  max,
  step,
  value,
  onChange,
}: {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="flex flex-col gap-2 text-sm">
      <span className="flex justify-between font-medium text-fg">
        {label}
        <span className="font-normal text-muted tabular-nums">{value.toFixed(2)}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}

function paint(canvas: HTMLCanvasElement, image: HTMLImageElement, adj: Adjustments) {
  const scale = Math.min(1, 1400 / Math.max(image.width, 1));
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  let filter = `brightness(${adj.exposure}) contrast(${adj.contrast}) saturate(${adj.saturation})`;
  if (adj.filter === "pb") filter += " grayscale(1)";
  if (adj.filter === "sepia") filter += " sepia(0.8)";
  if (adj.filter === "fade") filter += " contrast(0.92) saturate(0.8)";
  if (adj.filter === "cinema") filter += " contrast(1.12) saturate(0.86)";
  ctx.filter = filter;
  ctx.drawImage(image, 0, 0, width, height);
  ctx.filter = "none";
  if (adj.warmth !== 0) {
    ctx.save();
    ctx.globalCompositeOperation = "overlay";
    ctx.fillStyle =
      adj.warmth > 0
        ? `rgba(226, 120, 60, ${Math.abs(adj.warmth) / 140})`
        : `rgba(70, 110, 170, ${Math.abs(adj.warmth) / 140})`;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  }
  if (adj.vignette > 0) {
    const gradient = ctx.createRadialGradient(width / 2, height / 2, width * 0.2, width / 2, height / 2, width * 0.72);
    gradient.addColorStop(0, "rgba(0,0,0,0)");
    gradient.addColorStop(1, `rgba(0,0,0,${adj.vignette})`);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
  }
  if (adj.grain > 0) {
    const noise = document.createElement("canvas");
    noise.width = 96;
    noise.height = 96;
    const ng = noise.getContext("2d");
    if (ng) {
      const pixels = ng.createImageData(96, 96);
      for (let i = 0; i < pixels.data.length; i += 4) {
        const value = 80 + Math.random() * 120;
        pixels.data[i] = value;
        pixels.data[i + 1] = value;
        pixels.data[i + 2] = value;
        pixels.data[i + 3] = 255;
      }
      ng.putImageData(pixels, 0, 0);
      const pattern = ctx.createPattern(noise, "repeat");
      if (pattern) {
        ctx.save();
        ctx.globalAlpha = adj.grain;
        ctx.fillStyle = pattern;
        ctx.fillRect(0, 0, width, height);
        ctx.restore();
      }
    }
  }
  if (adj.text.trim()) {
    ctx.fillStyle = "#f4efe6";
    ctx.font = "600 42px Outfit, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(adj.text.trim(), width / 2, height - 36);
  }
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Não abriu a imagem."));
    image.src = src;
  });
}

async function fileToJpeg(file: Blob, max: number) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Não deu para ler a imagem.");
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas.toDataURL("image/jpeg", 0.86);
}

async function crop(image: HTMLImageElement, aspect: number, setSource: (image: HTMLImageElement) => void) {
  const width = image.naturalWidth || image.width;
  const height = image.naturalHeight || image.height;
  let cropW = width;
  let cropH = height;
  if (width / height > aspect) cropW = height * aspect;
  else cropH = width / aspect;
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(cropW));
  canvas.height = Math.max(1, Math.round(cropH));
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.drawImage(image, (width - cropW) / 2, (height - cropH) / 2, cropW, cropH, 0, 0, canvas.width, canvas.height);
  setSource(await loadImage(canvas.toDataURL("image/jpeg", 0.92)));
}

async function rotate(image: HTMLImageElement, setSource: (image: HTMLImageElement) => void) {
  const canvas = document.createElement("canvas");
  canvas.width = image.height;
  canvas.height = image.width;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate(Math.PI / 2);
  ctx.drawImage(image, -image.width / 2, -image.height / 2);
  setSource(await loadImage(canvas.toDataURL("image/jpeg", 0.92)));
}

function toMade(result: { mime: string; b64: string; url: string }): MadeImage {
  if (result.b64) return { src: `data:${result.mime || "image/png"};base64,${result.b64}`, mime: result.mime };
  return { src: result.url, mime: result.mime };
}
