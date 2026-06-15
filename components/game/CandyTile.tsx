"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils/cn";
import type { Tile } from "@/lib/game/types";
import { CANDY_THEMES } from "./candy-themes";

interface CandyTileProps {
  tile: Tile;
  row: number;
  col: number;
  selected: boolean;
  clearing: boolean;
  shaking: boolean;
  disabled: boolean;
  onTap: () => void;
}

export function CandyTile({ tile, row, col, selected, clearing, shaking, disabled, onTap }: CandyTileProps) {
  const theme = CANDY_THEMES[tile.type];
  const Icon = theme.icon;

  return (
    <motion.button
      type="button"
      aria-label={theme.name}
      aria-pressed={selected}
      disabled={disabled}
      onClick={onTap}
      layout
      style={{ gridRowStart: row + 1, gridColumnStart: col + 1 }}
      initial={{ y: "-130%", opacity: 0, scale: 0.6 }}
      animate={
        clearing
          ? { scale: 0, opacity: 0, rotate: 90, y: 0 }
          : { scale: selected ? 1.12 : 1, opacity: 1, rotate: 0, y: 0 }
      }
      transition={{ type: "spring", stiffness: 420, damping: 26 }}
      className={cn(
        "relative flex h-full w-full items-center justify-center rounded-clay-sm bg-gradient-to-br shadow-clay-sm transition-shadow",
        theme.gradient,
        selected && "ring-4 ring-white ring-offset-2 ring-offset-primary/40",
        !disabled && !selected && "hover:brightness-105",
        shaking && "animate-shake",
      )}
    >
      <Icon className="h-[55%] w-[55%] text-white drop-shadow-[0_2px_3px_rgba(0,0,0,0.25)]" strokeWidth={2.25} />
    </motion.button>
  );
}
