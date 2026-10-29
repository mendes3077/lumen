import { PanelHeader, btnGhost, inputClass } from "@/components/studio/ui";
import { PRESETS, defaultPersonality, type PresetId } from "@/lib/personality";
import { useStudio } from "@/lib/store";

export function PersonalityPanel() {
  const personality = useStudio((state) => state.personality);
  const setPersonality = useStudio((state) => state.setPersonality);

  return (
    <div className="mx-auto max-w-3xl">
      <PanelHeader
        kicker="Personalidade"
        title="O tom muda. Os limites, não."
        text="Igual a um ajuste de personalidade: nome, preset e instruções suas entram em toda conversa e no resumo com IA. Estilo não libera conteúdo sexual nem pedido de crime."
      />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {PRESETS.map((preset) => {
          const active = personality.preset === preset.id;
          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => setPersonality({ ...personality, preset: preset.id as PresetId })}
              className={
                "rounded-2xl border px-4 py-4 text-left " +
                (active ? "border-accent bg-raised" : "border-line bg-surface")
              }
            >
              <span className="block font-medium text-fg">{preset.label}</span>
              <span className="mt-1 block text-sm text-muted">{preset.blurb}</span>
            </button>
          );
        })}
      </div>
      <div className="mt-6 grid gap-5">
        <label className="flex flex-col gap-2 text-sm">
          <span className="font-medium text-fg">Nome do assistente</span>
          <input
            className={inputClass}
            value={personality.name}
            maxLength={40}
            onChange={(event) => setPersonality({ ...personality, name: event.target.value })}
          />
        </label>
        <label className="flex flex-col gap-2 text-sm">
          <span className="font-medium text-fg">Instruções suas</span>
          <textarea
            className={inputClass}
            rows={5}
            maxLength={800}
            placeholder="Ex.: trate-me por você, use exemplos do cotidiano brasileiro e termine com uma pergunta curta."
            value={personality.instructions}
            onChange={(event) =>
              setPersonality({ ...personality, instructions: event.target.value })
            }
          />
        </label>
        <Slider
          label="Concisão"
          low="Desenvolve"
          high="Breve"
          value={personality.brevity}
          onChange={(brevity) => setPersonality({ ...personality, brevity })}
        />
        <Slider
          label="Calor"
          low="Sóbrio"
          high="Caloroso"
          value={personality.warmth}
          onChange={(warmth) => setPersonality({ ...personality, warmth })}
        />
        <Slider
          label="Invenção"
          low="Contido"
          high="Solto"
          value={personality.creativity}
          onChange={(creativity) => setPersonality({ ...personality, creativity })}
        />
        <div>
          <button
            type="button"
            className={btnGhost}
            onClick={() => setPersonality(defaultPersonality)}
          >
            Restaurar padrão
          </button>
        </div>
      </div>
    </div>
  );
}

function Slider({
  label,
  low,
  high,
  value,
  onChange,
}: {
  label: string;
  low: string;
  high: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="flex flex-col gap-2 text-sm">
      <span className="flex items-center justify-between font-medium text-fg">
        {label}
        <span className="font-normal text-muted tabular-nums">
          {low} · {high}
        </span>
      </span>
      <input
        type="range"
        min={0}
        max={100}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}
