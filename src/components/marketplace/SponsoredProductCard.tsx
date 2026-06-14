import { useEffect, useRef } from "react";
import { Link } from "@tanstack/react-router";
import { Star, Truck } from "lucide-react";
import type { SponsoredItem } from "@/lib/sponsored.functions";
import { trackAdClick, trackAdImpression } from "@/lib/sponsored.functions";
import { formatBRL } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export function SponsoredProductCard({ item }: { item: SponsoredItem }) {
  const ref = useRef<HTMLElement>(null);
  const seen = useRef(false);

  useEffect(() => {
    if (!ref.current) return;
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting && !seen.current) {
            seen.current = true;
            trackAdImpression({ data: { campaignId: item.campaignId } }).catch(() => {});
            obs.disconnect();
            break;
          }
        }
      },
      { threshold: 0.5 },
    );
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, [item.campaignId]);

  const handleClick = () => {
    trackAdClick({ data: { campaignId: item.campaignId } }).catch(() => {});
  };

  const p = item.product;
  const discount = p.oldPrice ? Math.round(((p.oldPrice - p.price) / p.oldPrice) * 100) : 0;

  return (
    <article
      ref={ref}
      className={cn(
        "group relative bg-card rounded-xl border-2 border-warning/40 overflow-hidden hover:shadow-brand hover:-translate-y-0.5 transition-all duration-200",
      )}
    >
      <span className="absolute top-2 left-2 z-10 bg-warning text-warning-foreground text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider shadow">
        Patrocinado
      </span>
      <Link
        to="/product/$id"
        params={{ id: p.id }}
        onClick={handleClick}
        className="block aspect-square bg-secondary/30 relative overflow-hidden"
      >
        <img
          src={p.image}
          alt={p.name}
          loading="lazy"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        {discount > 0 && (
          <span className="absolute top-2 right-2 bg-primary text-primary-foreground text-[11px] font-bold px-2 py-0.5 rounded">
            -{discount}%
          </span>
        )}
      </Link>
      <div className="p-3 space-y-1.5">
        <Link
          to="/product/$id"
          params={{ id: p.id }}
          onClick={handleClick}
          className="text-sm line-clamp-2 min-h-[2.5rem] hover:text-primary transition"
        >
          {p.name}
        </Link>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Star className="h-3 w-3 fill-warning text-warning" />
          <span className="font-semibold text-foreground">{p.rating}</span>
          <span>· {p.sold.toLocaleString("pt-BR")} vendidos</span>
        </div>
        <div>
          {p.oldPrice && (
            <div className="text-xs text-muted-foreground line-through leading-none">
              {formatBRL(p.oldPrice)}
            </div>
          )}
          <div className="text-lg font-black leading-tight">{formatBRL(p.price)}</div>
          <div className="text-[11px] text-muted-foreground">em até 12x de {formatBRL(p.price / 12)}</div>
        </div>
        {p.freeShipping && (
          <div className="flex items-center gap-1 text-[11px] text-success font-semibold">
            <Truck className="h-3 w-3" /> Frete grátis
          </div>
        )}
      </div>
    </article>
  );
}
