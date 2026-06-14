import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { Flame } from "lucide-react";
import { getActiveSponsoredProducts, trackAdClick, trackAdImpression, type SponsoredItem } from "@/lib/sponsored.functions";
import { formatBRL } from "@/lib/mock-data";

function CarouselSlide({ item }: { item: SponsoredItem }) {
  const ref = useRef<HTMLAnchorElement>(null);
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

  return (
    <Link
      ref={ref}
      to="/product/$id"
      params={{ id: item.product.id }}
      onClick={() => trackAdClick({ data: { campaignId: item.campaignId } }).catch(() => {})}
      className="relative block min-w-[280px] md:min-w-[420px] aspect-[16/7] rounded-2xl overflow-hidden border-2 border-warning/40 group"
    >
      <img src={item.product.image} alt={item.product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
      <span className="absolute top-3 left-3 bg-warning text-warning-foreground text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">
        Patrocinado
      </span>
      <div className="absolute bottom-3 left-4 right-4 text-white">
        <h3 className="text-lg md:text-xl font-bold line-clamp-2">{item.product.name}</h3>
        <p className="text-2xl font-black mt-1">{formatBRL(item.product.price)}</p>
      </div>
    </Link>
  );
}

export function SponsoredCarousel() {
  const { data: items = [] } = useQuery({
    queryKey: ["sponsored", "carousel"],
    queryFn: () => getActiveSponsoredProducts({ data: { placement: "carousel", limit: 6 } }),
    staleTime: 60_000,
  });

  if (items.length === 0) return null;

  return (
    <section className="container mx-auto px-4 mt-10">
      <div className="flex items-center gap-2 mb-4">
        <Flame className="h-6 w-6 text-warning" />
        <h2 className="text-2xl font-black">Destaques patrocinados</h2>
      </div>
      <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-2 -mx-4 px-4">
        {items.map((it) => (
          <div key={it.campaignId} className="snap-start">
            <CarouselSlide item={it} />
          </div>
        ))}
      </div>
    </section>
  );
}
