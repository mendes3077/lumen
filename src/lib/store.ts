import { create } from "zustand";
import {
  defaultPersonality,
  loadPersonality,
  savePersonality,
  type Personality,
} from "@/lib/personality";

export type TabId =
  | "chat"
  | "imagem"
  | "musica"
  | "video"
  | "clipe"
  | "avatar"
  | "livros"
  | "tom";

type StudioState = {
  tab: TabId;
  setTab: (tab: TabId) => void;
  personality: Personality;
  setPersonality: (personality: Personality) => void;
  hydrate: () => void;
};

export const useStudio = create<StudioState>((set, get) => ({
  tab: "chat",
  setTab: (tab) => set({ tab }),
  personality: defaultPersonality,
  setPersonality: (personality) => {
    savePersonality(personality);
    set({ personality });
  },
  hydrate: () => {
    const current = get().personality;
    const loaded = loadPersonality();
    if (
      current.name === loaded.name &&
      current.preset === loaded.preset &&
      current.instructions === loaded.instructions &&
      current.brevity === loaded.brevity &&
      current.warmth === loaded.warmth &&
      current.creativity === loaded.creativity
    ) {
      return;
    }
    set({ personality: loaded });
  },
}));
