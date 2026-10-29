import { type ComponentType, Component, type ReactNode, useEffect, useState } from "react";
import { PanelHeader, Status, btnGhost, btnPrimary, inputClass } from "@/components/studio/ui";
import type { AvatarSceneProps } from "@/components/studio/AvatarScene";

type FigureId = "michelle" | "xbot";
type Stage = "quente" | "frio" | "noite";

const FIGURES: {
  id: FigureId;
  label: string;
  detail: string;
  url: string;
  recolor: boolean;
  clips: { id: string; label: string }[];
}[] = [
  {
    id: "michelle",
    label: "Michelle",
    detail: "Figura com textura e dança",
    url: "/models/michelle.glb",
    recolor: false,
    clips: [
      { id: "SambaDance", label: "Dança" },
      { id: "TPose", label: "Pose" },
    ],
  },
  {
    id: "xbot",
    label: "Xbot",
    detail: "Gestos, caminhada e corrida",
    url: "/models/xbot.glb",
    recolor: true,
    clips: [
      { id: "idle", label: "Parado" },
      { id: "walk", label: "Andar" },
      { id: "run", label: "Correr" },
      { id: "agree", label: "Concordar" },
      { id: "headShake", label: "Negar" },
      { id: "sad_pose", label: "Triste" },
      { id: "sneak_pose", label: "Sorrateiro" },
    ],
  },
];

const TINTS = ["#ffffff", "#f0c7a8", "#d9a57a", "#8d5a3c", "#c9d4de"];
const KEY = "lumen-avatar-v1";

type Draft = {
  figure: FigureId;
  clip: string;
  name: string;
  stage: Stage;
  tint: string;
  speed: number;
  turn: number;
};

const INITIAL: Draft = {
  figure: "michelle",
  clip: "SambaDance",
  name: "Atlas",
  stage: "quente",
  tint: "#f0c7a8",
  speed: 1,
  turn: 0,
};

export function AvatarPanel() {
  const [draft, setDraft] = useState<Draft>(INITIAL);
  const [Scene, setScene] = useState<ComponentType<AvatarSceneProps> | null>(null);
  const [saved, setSaved] = useState("");
  const [bootError, setBootError] = useState("");
  const figure = FIGURES.find((item) => item.id === draft.figure) ?? FIGURES[0];

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<Draft>;
        setDraft({ ...INITIAL, ...parsed, figure: parsed.figure === "xbot" ? "xbot" : "michelle" });
      }
    } catch {
      /* ignore */
    }
    let cancel = false;
    void import("@/components/studio/AvatarScene")
      .then((mod) => {
        if (!cancel) setScene(() => mod.AvatarScene);
      })
      .catch(() => {
        if (!cancel) setBootError("Não foi possível carregar o estúdio 3D.");
      });
    return () => {
      cancel = true;
    };
  }, []);

  return (
    <div className="mx-auto max-w-5xl">
      <PanelHeader
        kicker="Avatar"
        title="Uma figura 3D que se mexe de verdade."
        text="Michelle é o corpo com textura e dança. Xbot é o humanoide com gestos. Arraste para orbitar. O avatar fica salvo neste navegador."
      />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div>
          {Scene ? (
            <SceneBoundary>
              <Scene
                url={figure.url}
                clip={draft.clip}
                speed={draft.speed}
                stage={draft.stage}
                tint={draft.tint}
                recolor={figure.recolor}
                turn={(draft.turn * Math.PI) / 180}
              />
            </SceneBoundary>
          ) : bootError ? (
            <p className="rounded-2xl border border-line p-6 text-sm text-muted">{bootError}</p>
          ) : (
            <div className="flex h-96 items-center justify-center rounded-2xl border border-line text-sm text-muted">
              Abrindo o estúdio 3D…
            </div>
          )}
          <p className="mt-3 font-display text-2xl">{draft.name || "Sem nome"}</p>
          <p className="text-sm text-muted">{figure.label}</p>
        </div>
        <div className="flex flex-col gap-4">
          <label className="flex flex-col gap-2 text-sm">
            <span className="font-medium text-fg">Nome</span>
            <input
              className={inputClass}
              value={draft.name}
              maxLength={32}
              onChange={(event) => setDraft({ ...draft, name: event.target.value })}
            />
          </label>
          <div className="flex flex-col gap-2">
            {FIGURES.map((item) => (
              <button
                key={item.id}
                type="button"
                className={draft.figure === item.id ? btnPrimary : btnGhost}
                onClick={() => setDraft({ ...draft, figure: item.id, clip: item.clips[0].id })}
              >
                {item.label}
                <span className="ml-2 font-normal opacity-80">{item.detail}</span>
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {figure.clips.map((clip) => (
              <button
                key={clip.id}
                type="button"
                className={draft.clip === clip.id ? btnPrimary : btnGhost}
                onClick={() => setDraft({ ...draft, clip: clip.id })}
              >
                {clip.label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {(["quente", "frio", "noite"] as Stage[]).map((stage) => (
              <button
                key={stage}
                type="button"
                className={draft.stage === stage ? btnPrimary : btnGhost}
                onClick={() => setDraft({ ...draft, stage })}
              >
                {stage}
              </button>
            ))}
          </div>
          {figure.recolor ? (
            <div className="flex gap-2">
              {TINTS.map((tint) => (
                <button
                  key={tint}
                  type="button"
                  aria-label={`Matiz ${tint}`}
                  className="h-11 w-11 rounded-full border-2"
                  style={{ background: tint, borderColor: draft.tint === tint ? "#f4efe6" : "#3a342c" }}
                  onClick={() => setDraft({ ...draft, tint })}
                />
              ))}
            </div>
          ) : null}
          <label className="flex flex-col gap-2 text-sm text-fg">
            Velocidade
            <input
              type="range"
              min={0.5}
              max={1.5}
              step={0.05}
              value={draft.speed}
              onChange={(event) => setDraft({ ...draft, speed: Number(event.target.value) })}
            />
          </label>
          <label className="flex flex-col gap-2 text-sm text-fg">
            Giro
            <input
              type="range"
              min={-180}
              max={180}
              value={draft.turn}
              onChange={(event) => setDraft({ ...draft, turn: Number(event.target.value) })}
            />
          </label>
          <button
            type="button"
            className={btnPrimary}
            onClick={() => {
              localStorage.setItem(KEY, JSON.stringify(draft));
              setSaved("Avatar salvo neste navegador.");
            }}
          >
            Salvar avatar
          </button>
          <Status note={saved} />
        </div>
      </div>
    </div>
  );
}

class SceneBoundary extends Component<{ children: ReactNode }, { error: string }> {
  state = { error: "" };

  static getDerivedStateFromError(error: Error) {
    return { error: error.message || "falha ao abrir o 3D" };
  }

  render() {
    if (this.state.error) {
      return (
        <p className="rounded-2xl border border-line p-6 text-sm text-muted">
          O avatar 3D não abriu neste visor. {this.state.error}
        </p>
      );
    }
    return this.props.children;
  }
}
