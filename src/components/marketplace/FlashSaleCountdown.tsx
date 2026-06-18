import { useEffect, useState } from "react";

function diff(endIso: string) {
  const ms = Math.max(0, new Date(endIso).getTime() - Date.now());
  const s = Math.floor(ms / 1000);
  return {
    ms,
    d: Math.floor(s / 86400),
    h: Math.floor((s % 86400) / 3600),
    m: Math.floor((s % 3600) / 60),
    s: s % 60,
  };
}

export function FlashSaleCountdown({
  endIso,
  onEnd,
  compact = false,
  className = "",
}: {
  endIso: string;
  onEnd?: () => void;
  compact?: boolean;
  className?: string;
}) {
  const [t, setT] = useState(() => diff(endIso));

  useEffect(() => {
    setT(diff(endIso));
    const id = window.setInterval(() => {
      const next = diff(endIso);
      setT(next);
      if (next.ms <= 0) {
        window.clearInterval(id);
        onEnd?.();
      }
    }, 1000);
    return () => window.clearInterval(id);
  }, [endIso, onEnd]);

  if (t.ms <= 0) return null;

  const pad = (n: number) => String(n).padStart(2, "0");

  if (compact) {
    return (
      <span className={`tabular-nums font-bold ${className}`} aria-label="Tempo restante">
        {t.d > 0 ? `${t.d}d ` : ""}
        {pad(t.h)}:{pad(t.m)}:{pad(t.s)}
      </span>
    );
  }

  const Cell = ({ v, l }: { v: string; l: string }) => (
    <div className="flex flex-col items-center">
      <span className="bg-foreground text-background rounded px-1.5 py-0.5 text-sm font-black tabular-nums min-w-[26px] text-center">
        {v}
      </span>
      <span className="text-[9px] text-muted-foreground uppercase mt-0.5">{l}</span>
    </div>
  );

  return (
    <div className={`flex items-center gap-1 ${className}`} aria-label="Tempo restante da oferta">
      {t.d > 0 && <Cell v={pad(t.d)} l="d" />}
      <Cell v={pad(t.h)} l="h" />
      <Cell v={pad(t.m)} l="m" />
      <Cell v={pad(t.s)} l="s" />
    </div>
  );
}
