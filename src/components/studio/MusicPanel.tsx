import { useState } from "react";
import { Field, PanelHeader, Status, btnGhost, btnPrimary, inputClass } from "@/components/studio/ui";
import { downloadBlob } from "@/lib/download";
import {
  audioBufferToMp3,
  audioBufferToWav,
  interpretPrompt,
  renderTrack,
  type GenreId,
  type MusicSettings,
} from "@/lib/music-engine";

const GENRES: { id: GenreId; label: string }[] = [
  { id: "lofi", label: "Lo-fi" },
  { id: "ambiente", label: "Ambiente" },
  { id: "cinema", label: "Cinema" },
  { id: "eletronico", label: "Eletrônico" },
  { id: "piano", label: "Piano" },
];

const ROOTS: MusicSettings["root"][] = ["C", "D", "E", "F", "G", "A"];

export function MusicPanel() {
  const [genre, setGenre] = useState<GenreId>("lofi");
  const [bpm, setBpm] = useState(84);
  const [seconds, setSeconds] = useState(20);
  const [root, setRoot] = useState<MusicSettings["root"]>("A");
  const [energy, setEnergy] = useState(55);
  const [brightness, setBrightness] = useState(60);
  const [seed, setSeed] = useState(7);
  const [prompt, setPrompt] = useState("lo-fi lento para estudar, tom lá, 30 segundos");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [url, setUrl] = useState("");
  const [buffer, setBuffer] = useState<AudioBuffer | null>(null);

  function applyPrompt() {
    const next = interpretPrompt(prompt);
    if (next.genre) setGenre(next.genre);
    if (next.bpm) setBpm(next.bpm);
    if (next.seconds) setSeconds(next.seconds);
    if (next.root) setRoot(next.root);
    if (next.energy != null) setEnergy(next.energy);
    if (next.brightness != null) setBrightness(next.brightness);
    if (next.seed) setSeed(next.seed);
  }

  async function compose() {
    setBusy("Compondo…");
    setError("");
    try {
      const next = await renderTrack({ genre, bpm, seconds, root, energy, brightness, seed });
      setBuffer(next);
      if (url) URL.revokeObjectURL(url);
      setUrl(URL.createObjectURL(audioBufferToWav(next)));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não compôs a faixa.");
    } finally {
      setBusy("");
    }
  }

  async function saveMp3() {
    if (!buffer) return;
    setBusy("Codificando MP3…");
    setError("");
    try {
      const blob = await audioBufferToMp3(buffer);
      downloadBlob(blob, `lumen-${genre}.mp3`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não gerou o MP3. Baixe o WAV.");
    } finally {
      setBusy("");
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PanelHeader
        kicker="Música"
        title="Descreva a faixa. Depois ajuste cada controle."
        text="Escreva o clima em texto. O app traduz para gênero, andamento, tom, energia e duração — e você ainda edita cada slider antes de compor. A faixa sai neste aparelho, em WAV e MP3."
      />
      <Field label="Como você quer a música">
        <textarea
          className={inputClass}
          rows={3}
          maxLength={280}
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          placeholder="Ex.: piano calmo em ré, brilhante, 45 segundos"
        />
      </Field>
      <div className="mt-3 mb-5">
        <button type="button" className={btnGhost} onClick={applyPrompt} disabled={!prompt.trim()}>
          Aplicar texto nos controles
        </button>
      </div>
      <div className="mb-5 flex flex-wrap gap-2">
        {GENRES.map((item) => (
          <button
            key={item.id}
            type="button"
            className={genre === item.id ? btnPrimary : btnGhost}
            onClick={() => setGenre(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Andamento" hint={`${bpm} BPM`}>
          <input type="range" min={68} max={140} value={bpm} onChange={(event) => setBpm(Number(event.target.value))} />
        </Field>
        <Field label="Duração" hint={`${seconds} segundos, até 60`}>
          <input
            type="range"
            min={8}
            max={60}
            step={2}
            value={seconds}
            onChange={(event) => setSeconds(Number(event.target.value))}
          />
        </Field>
        <Field label="Energia">
          <input type="range" min={0} max={100} value={energy} onChange={(event) => setEnergy(Number(event.target.value))} />
        </Field>
        <Field label="Brilho">
          <input
            type="range"
            min={0}
            max={100}
            value={brightness}
            onChange={(event) => setBrightness(Number(event.target.value))}
          />
        </Field>
        <Field label="Tom">
          <select className={inputClass} value={root} onChange={(event) => setRoot(event.target.value as MusicSettings["root"])}>
            {ROOTS.map((note) => (
              <option key={note} value={note}>
                {note}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Variação" hint="O mesmo número repete a faixa.">
          <input
            className={inputClass}
            type="number"
            min={1}
            max={9999}
            value={seed}
            onChange={(event) => setSeed(Number(event.target.value) || 1)}
          />
        </Field>
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        <button type="button" className={btnPrimary} disabled={Boolean(busy)} onClick={() => void compose()}>
          {busy || "Compor faixa"}
        </button>
        <button
          type="button"
          className={btnGhost}
          onClick={() => setSeed((value) => (value + 1) % 9999 || 1)}
        >
          Outra variação
        </button>
        <button type="button" className={btnGhost} disabled={!buffer || Boolean(busy)} onClick={() => void saveMp3()}>
          Baixar MP3
        </button>
        <button
          type="button"
          className={btnGhost}
          disabled={!buffer}
          onClick={() => buffer && downloadBlob(audioBufferToWav(buffer), `lumen-${genre}.wav`)}
        >
          Baixar WAV
        </button>
      </div>
      <div className="mt-4">
        <Status error={error} note={busy ? undefined : "Cada estilo tem harmonia, baixo e, quando cabe, bateria."} />
      </div>
      {url ? <audio className="mt-4 w-full" controls src={url} /> : null}
    </div>
  );
}
