export const PRESETS = [
  {
    id: "direto",
    label: "Direto",
    blurb: "Frases curtas, sem rodeio.",
    instructions: "Fale de forma direta. Vá ao ponto. Evite introduções longas.",
  },
  {
    id: "professor",
    label: "Professor",
    blurb: "Explica com exemplos e passos.",
    instructions:
      "Ensine com clareza. Use exemplos curtos e, quando couber, passos numerados.",
  },
  {
    id: "criativo",
    label: "Criativo",
    blurb: "Imaginação com utilidade.",
    instructions: "Seja imaginativo. Ofereça ângulos inesperados sem perder o pedido.",
  },
  {
    id: "formal",
    label: "Formal",
    blurb: "Tom profissional e preciso.",
    instructions: "Use um tom profissional, preciso e respeitoso.",
  },
  {
    id: "sarcastico",
    label: "Sarcástico",
    blurb: "Humor seco, ainda útil.",
    instructions: "Use humor seco e leve. Continue sendo útil e concreto.",
  },
  {
    id: "calmo",
    label: "Calmo",
    blurb: "Voz baixa, sem pressa.",
    instructions: "Fale com calma e frases tranquilas.",
  },
] as const;

export type PresetId = (typeof PRESETS)[number]["id"];

export type Personality = {
  name: string;
  preset: PresetId;
  instructions: string;
  brevity: number;
  warmth: number;
  creativity: number;
};

export const defaultPersonality: Personality = {
  name: "Lúmen",
  preset: "direto",
  instructions: "",
  brevity: 55,
  warmth: 50,
  creativity: 55,
};

const KEY = "lumen-personality-v1";

export function loadPersonality(): Personality {
  if (typeof localStorage === "undefined") return defaultPersonality;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultPersonality;
    const parsed = JSON.parse(raw) as Partial<Personality>;
    const preset = PRESETS.some((item) => item.id === parsed.preset)
      ? (parsed.preset as PresetId)
      : defaultPersonality.preset;
    return {
      name: String(parsed.name || defaultPersonality.name).slice(0, 40),
      preset,
      instructions: String(parsed.instructions || "").slice(0, 800),
      brevity: num(parsed.brevity, defaultPersonality.brevity),
      warmth: num(parsed.warmth, defaultPersonality.warmth),
      creativity: num(parsed.creativity, defaultPersonality.creativity),
    };
  } catch {
    return defaultPersonality;
  }
}

export function savePersonality(personality: Personality) {
  localStorage.setItem(KEY, JSON.stringify(personality));
}

export function buildSystem(personality: Personality): string {
  const preset = PRESETS.find((item) => item.id === personality.preset) ?? PRESETS[0];
  const brevity =
    personality.brevity > 66
      ? "Seja bem breve."
      : personality.brevity < 33
        ? "Pode desenvolver com mais detalhe quando ajudar."
        : "Equilibre detalhe e concisão.";
  const warmth =
    personality.warmth > 66
      ? "Tom caloroso."
      : personality.warmth < 33
        ? "Tom sóbrio, pouco emotivo."
        : "Tom cordial.";
  return [
    `Você é ${personality.name || "Lúmen"}, assistente do estúdio criativo Lúmen.`,
    "Responda no idioma da pessoa.",
    preset.instructions,
    personality.instructions.trim()
      ? `Instruções adicionais da pessoa: ${personality.instructions.trim()}`
      : "",
    brevity,
    warmth,
  ]
    .filter(Boolean)
    .join("\n");
}

function num(value: unknown, fallback: number) {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(100, Math.max(0, n));
}
