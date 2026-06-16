import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Zap, Sparkles, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { fetchActivePromotions, fetchPromotionProducts, type Promotion, type PromotionType } from "@/lib/promotions";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ProductCard } from "@/components/marketplace/ProductCard";
import { formatBRL } from "@/lib/mock-data";
import { Link } from "@tanstack/react-router";

function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}

function formatRemaining(ms: number) {
  if (ms <= 0) return "Encerrada";
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  if (d > 0) return `${d}d ${pad(h)}h ${pad(m)}m ${pad(sec)}s`;
  return `${pad(h)}h ${pad(m)}m ${pad(sec)}s`;
}

export function PromotionsSection() {
  const qc = useQueryClient();
  const { data: promos = [] } = useQuery({
    queryKey: ["public-promotions"],
    queryFn: fetchActivePromotions,
    refetchInterval: 60_000,
  });

  // Realtime updates
  useEffect(() => {
    const channel = supabase
      .channel("public-promotions-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "promotions" }, () => {
        qc.invalidateQueries({ queryKey: ["public-promotions"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [qc]);

  const now = useNow(1000);

  // Filter out expired client-side (so they disappear without refresh)
  const active = useMemo(
    () => promos.filter((p) => new Date(p.ends_at).getTime() > now && new Date(p.starts_at).getTime() <= now),
    [promos, now],
  );

  const flash = active.find((p) => p.type === "flash");
  const exclusive = active.find((p) => p.type === "exclusive");

  if (!flash && !exclusive) return null;

  return (
    <section className="container mx-auto px-4 mt-10 grid grid-cols-1 md:grid-cols-2 gap-4">
      {flash && <PromoBanner promo={flash} now={now} variant="flash" />}
      {exclusive && <PromoBanner promo={exclusive} now={now} variant="exclusive" />}
    </section>
  );
}

function PromoBanner({ promo, now, variant }: { promo: Promotion; now: number; variant: PromotionType }) {
  const [open, setOpen] = useState(false);
  const remaining = new Date(promo.ends_at).getTime() - now;
  const Icon = variant === "flash" ? Zap : Sparkles;
  const label = variant === "flash" ? "Oferta Relâmpago" : "Oferta Exclusiva";
  const bg = variant === "flash"
    ? "bg-gradient-brand text-primary-foreground shadow-brand"
    : "bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white shadow-lg";

  return (
    <>
      <div className={`rounded-2xl p-6 md:p-7 flex flex-col md:flex-row items-center justify-between gap-4 ${bg}`}>
        <div className="flex-1">
          <div className="text-xs font-bold tracking-widest uppercase opacity-90 flex items-center gap-1.5">
            <Icon className="h-4 w-4" /> {label}
          </div>
          <h3 className="text-xl md:text-2xl font-black mt-1">{promo.name}</h3>
          <p className="opacity-90 mt-1 text-sm">Até {promo.discount_percent}% OFF — termina em</p>
          <div className="mt-2 flex items-center gap-2 font-mono text-lg md:text-xl font-bold tabular-nums">
            <Clock className="h-5 w-5" /> {formatRemaining(remaining)}
          </div>
        </div>
        <button
          onClick={() => setOpen(true)}
          className="bg-background text-foreground font-bold px-6 py-3 rounded-lg hover:scale-105 transition-transform whitespace-nowrap"
        >
          Ver ofertas
        </button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Icon className="h-5 w-5" /> {label} — {promo.name}
            </DialogTitle>
          </DialogHeader>
          <PromoProducts promo={promo} />
        </DialogContent>
      </Dialog>
    </>
  );
}

function PromoProducts({ promo }: { promo: Promotion }) {
  const { data: products = [], isLoading } = useQuery({
    queryKey: ["promo-products", promo.id],
    queryFn: () => fetchPromotionProducts([promo.product_id]),
  });

  if (isLoading) return <p className="text-center py-8 text-muted-foreground">Carregando...</p>;
  if (!products.length) return <p className="text-center py-8 text-muted-foreground">Nenhum produto disponível.</p>;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mt-2">
      {products.map((p) => {
        const discounted = p.price * (1 - promo.discount_percent / 100);
        return (
          <Link
            key={p.id}
            to="/product/$id"
            params={{ id: p.id }}
            className="group rounded-xl border border-border overflow-hidden bg-card hover:shadow-brand transition"
          >
            <div className="aspect-square bg-secondary/30 relative">
              <img src={p.image} alt={p.name} className="w-full h-full object-cover" loading="lazy" />
              <span className="absolute top-2 left-2 bg-primary text-primary-foreground text-[11px] font-bold px-2 py-0.5 rounded">
                -{promo.discount_percent}%
              </span>
              <span className="absolute top-2 right-2 bg-background/90 backdrop-blur text-foreground text-[10px] font-bold px-2 py-0.5 rounded">
                {promo.type === "flash" ? "Relâmpago" : "Exclusiva"}
              </span>
            </div>
            <div className="p-3">
              <div className="text-sm line-clamp-2 min-h-[2.5rem]">{p.name}</div>
              <div className="text-xs text-muted-foreground line-through">{formatBRL(p.price)}</div>
              <div className="text-lg font-black text-primary">{formatBRL(discounted)}</div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
