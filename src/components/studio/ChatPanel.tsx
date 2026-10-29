import { useEffect, useRef, useState } from "react";
import { PanelHeader, Status, btnPrimary, inputClass } from "@/components/studio/ui";
import { buildSystem } from "@/lib/personality";
import { useStudio } from "@/lib/store";
import { askStudio } from "@/lib/studio-ai";

type ChatMessage = { role: "user" | "assistant"; content: string };

const STORAGE = "lumen-chat-v1";

const STARTERS = [
  "Explique fotossíntese como se eu fosse revisar uma apostila hoje.",
  "Me dê três ideias de clipe para uma música lenta.",
  "Como organizar a leitura de um livro longo em uma semana?",
];

export function ChatPanel() {
  const personality = useStudio((state) => state.personality);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE);
      if (!raw) return;
      const parsed = JSON.parse(raw) as ChatMessage[];
      if (Array.isArray(parsed)) setMessages(parsed.slice(-40));
    } catch {
      /* ignore broken storage */
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE, JSON.stringify(messages.slice(-40)));
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight });
  }, [messages, busy]);

  async function send(text: string) {
    const content = text.trim();
    if (!content || busy) return;
    const history = [...messages, { role: "user" as const, content }];
    setMessages(history);
    setDraft("");
    setError("");
    setBusy(true);
    try {
      const result = await askStudio({
        data: {
          messages: history,
          system: buildSystem(personality),
          temperature: 0.3 + (personality.creativity / 100) * 0.8,
        },
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setMessages([...history, { role: "assistant", content: result.text }]);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível conversar.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex h-full min-h-[32rem] max-w-3xl flex-col">
      <PanelHeader
        kicker="Conversa"
        title={`${personality.name} está no tom ${labelOf(personality.preset)}.`}
        text="O jeito de falar muda em Tom. A conversa usa a IA da conta; se a cota acabar, o aviso aparece aqui e o resto do estúdio segue no aparelho."
      />
      <div
        ref={scroller}
        className="flex min-h-64 flex-1 flex-col gap-3 overflow-y-auto rounded-2xl border border-line bg-surface p-4"
      >
        {messages.length === 0 ? (
          <div className="flex flex-col gap-2">
            <p className="text-sm text-muted">Comece por um destes pedidos, ou escreva o seu.</p>
            {STARTERS.map((starter) => (
              <button
                key={starter}
                type="button"
                className="rounded-xl border border-line bg-raised px-3 py-3 text-left text-sm text-fg"
                onClick={() => setDraft(starter)}
              >
                {starter}
              </button>
            ))}
          </div>
        ) : null}
        {messages.map((message, index) => (
          <div
            key={`${message.role}-${index}`}
            className={
              message.role === "user"
                ? "ml-auto max-w-[40rem] rounded-2xl bg-accent px-4 py-3 text-sm text-pretty text-accent-ink"
                : "max-w-[40rem] rounded-2xl border border-line bg-raised px-4 py-3 text-sm text-pretty text-fg"
            }
          >
            {message.content}
          </div>
        ))}
        {busy ? <p className="text-sm text-muted">Pensando…</p> : null}
      </div>
      <div className="mt-3 flex flex-col gap-3">
        <Status error={error} />
        <form
          className="flex flex-col gap-2 sm:flex-row"
          onSubmit={(event) => {
            event.preventDefault();
            void send(draft);
          }}
        >
          <textarea
            className={`${inputClass} min-h-12 sm:min-h-11`}
            rows={2}
            value={draft}
            placeholder="Escreva para o estúdio"
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void send(draft);
              }
            }}
          />
          <div className="flex gap-2">
            <button className={btnPrimary} type="submit" disabled={busy || !draft.trim()}>
              Enviar
            </button>
            <button
              className="inline-flex h-11 items-center px-2 text-sm text-muted"
              type="button"
              onClick={() => {
                setMessages([]);
                setError("");
              }}
            >
              Limpar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function labelOf(preset: string) {
  const map: Record<string, string> = {
    direto: "direto",
    professor: "de professor",
    criativo: "criativo",
    formal: "formal",
    sarcastico: "sarcástico",
    calmo: "calmo",
  };
  return map[preset] ?? "direto";
}
