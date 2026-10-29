import { useEffect, useRef, useState } from "react";
import { Field, PanelHeader, Status, btnGhost, btnPrimary, inputClass } from "@/components/studio/ui";
import { SAMPLE_BOOK, deleteBook, listBooks, saveBook, type Book } from "@/lib/library-db";
import { buildSystem } from "@/lib/personality";
import { extractPdfText } from "@/lib/pdf-text";
import { useStudio } from "@/lib/store";
import { summarizeStudio, speakStudio } from "@/lib/studio-ai";
import { summarizeLocal } from "@/lib/summarize";

const VOICES = [
  { id: "orion", label: "Orion" },
  { id: "luna", label: "Luna" },
  { id: "perseus", label: "Perseus" },
  { id: "altair", label: "Altair" },
  { id: "eve", label: "Eve" },
];

export function LibraryPanel() {
  const personality = useStudio((state) => state.personality);
  const [books, setBooks] = useState<Book[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [summary, setSummary] = useState("");
  const [summaryFrom, setSummaryFrom] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [paste, setPaste] = useState("");
  const [pasteTitle, setPasteTitle] = useState("");
  const [size, setSize] = useState(0);
  const [voice, setVoice] = useState("orion");
  const [passage, setPassage] = useState("");
  const [audioUrl, setAudioUrl] = useState("");
  const reading = useRef(false);
  const sizes = ["text-base", "text-lg", "text-xl"] as const;
  const current = books.find((book) => book.id === currentId) ?? null;

  async function refresh() {
    setBooks(await listBooks());
  }

  useEffect(() => {
    void refresh().catch(() => setError("Não abri a biblioteca neste navegador."));
  }, []);

  useEffect(() => {
    setSummary("");
    setSummaryFrom("");
    setPassage(current ? current.text.slice(0, 700) : "");
    window.speechSynthesis?.cancel();
  }, [currentId, current]);

  async function addBook(book: Book) {
    await saveBook(book);
    await refresh();
    setCurrentId(book.id);
  }

  async function onFile(file: File | undefined) {
    if (!file) return;
    setBusy("Lendo arquivo…");
    setError("");
    try {
      const lower = file.name.toLowerCase();
      let text = "";
      if (lower.endsWith(".pdf")) text = await extractPdfText(await file.arrayBuffer());
      else text = await file.text();
      text = text.trim();
      if (text.length < 20) throw new Error("Arquivo sem texto suficiente.");
      await addBook({
        id: crypto.randomUUID(),
        title: file.name.replace(/\.[^.]+$/, "").slice(0, 80),
        text: text.slice(0, 400_000),
        createdAt: Date.now(),
      });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não li o arquivo.");
    } finally {
      setBusy("");
    }
  }

  function readAloud(text: string) {
    const synth = window.speechSynthesis;
    if (!synth) {
      setError("Este navegador não lê em voz alta.");
      return;
    }
    synth.cancel();
    reading.current = true;
    const chunks = splitChunks(text.slice(0, 12000), 380);
    let index = 0;
    const speakNext = () => {
      if (!reading.current || index >= chunks.length) {
        setBusy("");
        return;
      }
      const utter = new SpeechSynthesisUtterance(chunks[index]);
      utter.lang = "pt-BR";
      utter.rate = 1;
      utter.onend = () => {
        index += 1;
        speakNext();
      };
      utter.onerror = () => setBusy("");
      synth.speak(utter);
    };
    setBusy(text.length > 12000 ? "Lendo os primeiros trechos…" : "Lendo…");
    speakNext();
  }

  async function naturalVoice() {
    const text = passage.trim();
    if (!text) return;
    setBusy("Gerando voz…");
    setError("");
    try {
      const result = await speakStudio({ data: { text: text.slice(0, 1800), voice } });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      const bytes = Uint8Array.from(atob(result.audio), (char) => char.charCodeAt(0));
      const blob = new Blob([bytes], { type: result.mime || "audio/mpeg" });
      const next = URL.createObjectURL(blob);
      setAudioUrl(next);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "A voz natural falhou.");
    } finally {
      setBusy("");
    }
  }

  async function aiSummary(style: "paragrafo" | "topicos" | "fichamento") {
    if (!current) return;
    setBusy("Resumindo com IA…");
    setError("");
    try {
      const result = await summarizeStudio({
        data: {
          text: current.text.slice(0, 12000),
          style,
          tone: buildSystem(personality).slice(0, 400),
        },
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSummary(result.text);
      setSummaryFrom("IA");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "O resumo falhou.");
    } finally {
      setBusy("");
    }
  }

  return (
    <div className="mx-auto max-w-5xl">
      <PanelHeader
        kicker="Biblioteca"
        title="Deixe o texto aqui. Depois, ouça ou resuma."
        text="Suba PDF, TXT ou cole a apostila. O resumo rápido e a leitura usam o aparelho. O resumo com IA e a voz natural usam a cota, num trecho por vez."
      />
      <div className="grid gap-6 lg:grid-cols-[16rem_minmax(0,1fr)]">
        <div className={current ? "hidden lg:block" : ""}>
          <input
            className="mb-3 block w-full text-sm text-muted file:mr-3 file:h-11 file:rounded-xl file:border-0 file:bg-accent file:px-4 file:font-medium file:text-accent-ink"
            type="file"
            accept=".pdf,.txt,.md,text/plain"
            onChange={(event) => void onFile(event.target.files?.[0])}
          />
          <button
            type="button"
            className={`${btnGhost} mb-3 w-full`}
            onClick={() => void addBook({ ...SAMPLE_BOOK, createdAt: Date.now() })}
          >
            Abrir texto de exemplo
          </button>
          <ul className="flex flex-col gap-2">
            {books.map((book) => (
              <li key={book.id} className="flex gap-2">
                <button
                  type="button"
                  className="min-w-0 flex-1 rounded-xl border border-line bg-surface px-3 py-3 text-left text-sm text-fg"
                  onClick={() => setCurrentId(book.id)}
                >
                  <span className="block truncate font-medium">{book.title}</span>
                  <span className="text-xs text-muted tabular-nums">{book.text.length.toLocaleString("pt-BR")} caracteres</span>
                </button>
                <button
                  type="button"
                  className="h-11 px-2 text-sm text-muted"
                  onClick={() => {
                    void deleteBook(book.id).then(refresh);
                    if (currentId === book.id) setCurrentId(null);
                  }}
                >
                  Tirar
                </button>
              </li>
            ))}
          </ul>
          {books.length === 0 ? <p className="mt-3 text-sm text-muted">A estante está vazia.</p> : null}
        </div>
        <div>
          {current ? (
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap items-center gap-2">
                <button type="button" className={`${btnGhost} lg:hidden`} onClick={() => setCurrentId(null)}>
                  Estante
                </button>
                <h2 className="font-display text-2xl text-balance">{current.title}</h2>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className={btnGhost}
                  onClick={() => {
                    setSummary(summarizeLocal(current.text, 5));
                    setSummaryFrom("aparelho");
                  }}
                >
                  Resumo rápido
                </button>
                <button type="button" className={btnGhost} disabled={Boolean(busy)} onClick={() => void aiSummary("paragrafo")}>
                  Resumo com IA
                </button>
                <button type="button" className={btnGhost} disabled={Boolean(busy)} onClick={() => void aiSummary("topicos")}>
                  Tópicos
                </button>
                <button type="button" className={btnGhost} disabled={Boolean(busy)} onClick={() => void aiSummary("fichamento")}>
                  Fichamento
                </button>
                <button type="button" className={btnPrimary} onClick={() => readAloud(current.text)}>
                  Ler em voz alta
                </button>
                <button
                  type="button"
                  className={btnGhost}
                  onClick={() => {
                    reading.current = false;
                    window.speechSynthesis?.cancel();
                    setBusy("");
                  }}
                >
                  Parar
                </button>
                <button type="button" className={btnGhost} onClick={() => setSize((value) => (value + 1) % sizes.length)}>
                  Tipo
                </button>
              </div>
              {summary ? (
                <section className="rounded-2xl border border-line bg-raised p-4">
                  <p className="text-xs tracking-widest text-accent uppercase">Resumo · {summaryFrom}</p>
                  <p className="mt-2 text-sm text-pretty whitespace-pre-wrap text-fg">{summary}</p>
                </section>
              ) : null}
              <article className={`max-w-prose text-pretty whitespace-pre-wrap text-fg ${sizes[size]} leading-relaxed`}>
                {current.text}
              </article>
              <div className="rounded-2xl border border-line bg-surface p-4">
                <Field label="Trecho para voz natural" hint="Até cerca de 1800 caracteres por pedido.">
                  <textarea
                    className={inputClass}
                    rows={5}
                    value={passage}
                    onChange={(event) => setPassage(event.target.value.slice(0, 1800))}
                  />
                </Field>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <select className={inputClass + " max-w-40"} value={voice} onChange={(event) => setVoice(event.target.value)}>
                    {VOICES.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                  <button type="button" className={btnPrimary} disabled={Boolean(busy)} onClick={() => void naturalVoice()}>
                    Ouvir com voz natural
                  </button>
                </div>
                {audioUrl ? <audio className="mt-3 w-full" controls src={audioUrl} /> : null}
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <p className="text-sm text-muted">Ou cole um trecho agora e guarde na estante.</p>
              <Field label="Título">
                <input className={inputClass} value={pasteTitle} onChange={(event) => setPasteTitle(event.target.value)} />
              </Field>
              <textarea
                className={inputClass}
                rows={8}
                placeholder="Cole aqui o capítulo ou a apostila."
                value={paste}
                onChange={(event) => setPaste(event.target.value)}
              />
              <button
                type="button"
                className={btnPrimary}
                disabled={paste.trim().length < 20}
                onClick={() => {
                  void addBook({
                    id: crypto.randomUUID(),
                    title: pasteTitle.trim() || "Texto colado",
                    text: paste.trim().slice(0, 400_000),
                    createdAt: Date.now(),
                  });
                  setPaste("");
                  setPasteTitle("");
                }}
              >
                Guardar na biblioteca
              </button>
            </div>
          )}
          <div className="mt-4">
            <Status error={error} note={busy || undefined} />
          </div>
        </div>
      </div>
    </div>
  );
}

function splitChunks(text: string, size: number) {
  const parts: string[] = [];
  let rest = text.trim();
  while (rest.length) {
    if (rest.length <= size) {
      parts.push(rest);
      break;
    }
    const slice = rest.slice(0, size);
    const cut = Math.max(slice.lastIndexOf("."), slice.lastIndexOf(" "));
    const at = cut > 40 ? cut + 1 : size;
    parts.push(rest.slice(0, at).trim());
    rest = rest.slice(at).trim();
  }
  return parts;
}
