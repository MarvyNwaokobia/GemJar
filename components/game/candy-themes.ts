import { Diamond, Gem, Hexagon, Octagon, Star, Triangle, type LucideIcon } from "lucide-react";
import type { CandyType } from "@/lib/game/types";

export interface CandyTheme {
  name: string;
  icon: LucideIcon;
  /** Tailwind `from-*`/`to-*` gradient stops for the tile face. */
  gradient: string;
  /** Tailwind shadow color used for the resting glow. */
  glow: string;
}

/** Visuals for each CandyType (0-5) - distinct shape + color per gem so matches read clearly. */
export const CANDY_THEMES: Record<CandyType, CandyTheme> = {
  0: { name: "Ruby", icon: Gem, gradient: "from-rose-400 to-pink-600", glow: "shadow-pink-400/50" },
  1: { name: "Sapphire", icon: Hexagon, gradient: "from-sky-400 to-blue-600", glow: "shadow-blue-400/50" },
  2: { name: "Topaz", icon: Star, gradient: "from-amber-300 to-orange-500", glow: "shadow-amber-400/50" },
  3: { name: "Amethyst", icon: Diamond, gradient: "from-purple-400 to-violet-600", glow: "shadow-purple-400/50" },
  4: { name: "Emerald", icon: Triangle, gradient: "from-emerald-400 to-green-600", glow: "shadow-emerald-400/50" },
  5: { name: "Peridot", icon: Octagon, gradient: "from-lime-300 to-green-500", glow: "shadow-lime-400/50" },
};
