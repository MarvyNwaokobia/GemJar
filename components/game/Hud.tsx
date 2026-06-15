"use client";

import { motion } from "framer-motion";
import { Crown, Hourglass, Trophy } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface StatCardProps {
  label: string;
  value: number;
  icon: typeof Trophy;
  tone?: "default" | "warning";
}

function StatCard({ label, value, icon: Icon, tone = "default" }: StatCardProps) {
  return (
    <div className="flex flex-1 flex-col items-center gap-1 rounded-clay-sm bg-white/70 px-3 py-2.5 shadow-clay-sm">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        <Icon className={cn("h-3.5 w-3.5", tone === "warning" && "text-destructive")} strokeWidth={2.5} />
        <span className="text-[11px] font-bold uppercase tracking-wide">{label}</span>
      </div>
      <motion.span
        key={value}
        initial={{ scale: 1.25 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 400, damping: 18 }}
        className={cn(
          "tabular font-display text-2xl font-extrabold text-foreground",
          tone === "warning" && "text-destructive",
        )}
      >
        {value}
      </motion.span>
    </div>
  );
}

interface HudProps {
  score: number;
  movesLeft: number;
  bestScore: number;
}

export function Hud({ score, movesLeft, bestScore }: HudProps) {
  return (
    <div className="flex w-full max-w-[420px] items-stretch gap-2.5">
      <StatCard label="Score" value={score} icon={Trophy} />
      <StatCard label="Moves" value={movesLeft} icon={Hourglass} tone={movesLeft <= 5 ? "warning" : "default"} />
      <StatCard label="Best" value={bestScore} icon={Crown} />
    </div>
  );
}
