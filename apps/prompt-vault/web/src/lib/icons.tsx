import type { LucideIcon } from "lucide-react";
import {
  BookOpenText,
  Bot,
  Briefcase,
  Clock3,
  Code2,
  Film,
  FolderOpen,
  ImagePlus,
  LayoutDashboard,
  LayoutTemplate,
  Megaphone,
  MessageSquareText,
  Music4,
  PenTool,
  Search,
  Settings2,
  Sparkles,
  Star,
  WandSparkles,
  Workflow
} from "lucide-react";

const icons: Record<string, LucideIcon> = {
  sparkles: Sparkles,
  film: Film,
  music: Music4,
  messages: MessageSquareText,
  code: Code2,
  megaphone: Megaphone,
  pen: PenTool,
  book: BookOpenText,
  clock: Clock3,
  workflow: Workflow,
  bot: Bot,
  layout: LayoutTemplate,
  search: Search,
  briefcase: Briefcase,
  folder: FolderOpen,
  "layout-dashboard": LayoutDashboard,
  "library-big": BookOpenText,
  folders: FolderOpen,
  star: Star,
  "clock-3": Clock3,
  "settings-2": Settings2,
  image: ImagePlus,
  wand: WandSparkles
};

export function iconFor(name: string): LucideIcon {
  return icons[name] ?? Sparkles;
}
