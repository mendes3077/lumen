import { useEffect } from "react";
import {
  AudioLines,
  Clapperboard,
  Image as ImageIcon,
  Library,
  MessageCircle,
  Music,
  PersonStanding,
  SlidersHorizontal,
} from "lucide-react";
import { AvatarPanel } from "@/components/studio/AvatarPanel";
import { ChatPanel } from "@/components/studio/ChatPanel";
import { ClipPanel } from "@/components/studio/ClipPanel";
import { ImagePanel } from "@/components/studio/ImagePanel";
import { LibraryPanel } from "@/components/studio/LibraryPanel";
import { MusicPanel } from "@/components/studio/MusicPanel";
import { PersonalityPanel } from "@/components/studio/PersonalityPanel";
import { VideoPanel } from "@/components/studio/VideoPanel";
import { useStudio, type TabId } from "@/lib/store";

const NAV: { id: TabId; label: string; icon: typeof Music }[] = [
  { id: "chat", label: "Conversa", icon: MessageCircle },
  { id: "imagem", label: "Imagem", icon: ImageIcon },
  { id: "musica", label: "Música", icon: Music },
  { id: "video", label: "Vídeo", icon: Clapperboard },
  { id: "clipe", label: "Clipe", icon: AudioLines },
  { id: "avatar", label: "Avatar", icon: PersonStanding },
  { id: "livros", label: "Livros", icon: Library },
  { id: "tom", label: "Tom", icon: SlidersHorizontal },
];

export function Shell() {
  const tab = useStudio((state) => state.tab);
  const setTab = useStudio((state) => state.setTab);
  const hydrate = useStudio((state) => state.hydrate);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  return (
    <div className="flex h-dvh flex-col bg-bg text-fg">
      <header className="flex items-center justify-between border-b border-line px-4 py-3 md:hidden">
        <div>
          <p className="font-display text-2xl leading-none">Lúmen</p>
          <p className="mt-1 text-xs text-muted">Estúdio criativo</p>
        </div>
      </header>
      <div className="flex min-h-0 flex-1">
        <aside className="hidden w-56 shrink-0 flex-col border-r border-line md:flex">
          <div className="px-5 pt-7 pb-4">
            <p className="font-display text-4xl leading-none">Lúmen</p>
            <p className="mt-2 text-sm text-muted">Estúdio criativo</p>
          </div>
          <nav className="flex flex-1 flex-col gap-1 px-3 pb-6" aria-label="Seções">
            {NAV.map((item) => (
              <NavButton key={item.id} item={item} active={tab === item.id} onSelect={setTab} />
            ))}
          </nav>
        </aside>
        <div className="flex min-w-0 flex-1 flex-col">
          <nav
            className="flex gap-2 overflow-x-auto border-b border-line px-3 py-2 md:hidden"
            aria-label="Seções"
          >
            {NAV.map((item) => (
              <NavButton key={item.id} item={item} active={tab === item.id} onSelect={setTab} compact />
            ))}
          </nav>
          <main className="min-h-0 flex-1 overflow-y-auto px-4 py-5 md:px-8 md:py-8">
            {tab === "chat" ? <ChatPanel /> : null}
            {tab === "imagem" ? <ImagePanel /> : null}
            {tab === "musica" ? <MusicPanel /> : null}
            {tab === "video" ? <VideoPanel /> : null}
            {tab === "clipe" ? <ClipPanel /> : null}
            {tab === "avatar" ? <AvatarPanel /> : null}
            {tab === "livros" ? <LibraryPanel /> : null}
            {tab === "tom" ? <PersonalityPanel /> : null}
          </main>
        </div>
      </div>
    </div>
  );
}

function NavButton({
  item,
  active,
  compact,
  onSelect,
}: {
  item: (typeof NAV)[number];
  active: boolean;
  compact?: boolean;
  onSelect: (tab: TabId) => void;
}) {
  const Icon = item.icon;
  return (
    <button
      type="button"
      aria-current={active ? "page" : undefined}
      onClick={() => onSelect(item.id)}
      className={
        "flex h-11 shrink-0 items-center gap-3 rounded-xl px-3 text-left text-sm font-medium " +
        (active ? "bg-raised text-fg" : "text-muted") +
        (compact ? "" : " w-full")
      }
    >
      <Icon className="size-4 shrink-0" aria-hidden="true" />
      {item.label}
    </button>
  );
}
