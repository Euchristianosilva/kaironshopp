import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { X, Rocket, Star, Flame, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { getAdPricing, createAdCheckout } from "@/lib/ads.functions";
import { formatBRL } from "@/lib/mock-data";

type Product = {
  id: string;
  title: string;
  price: number;
  image_url: string | null;
};

type Placement = "card" | "carousel";

function defaultDate(offsetDays: number) {
  const d = new Date(Date.now() + offsetDays * 24 * 60 * 60 * 1000);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16); // yyyy-MM-ddTHH:mm for datetime-local
}

export function TurbinarProductDialog({ product, onClose }: { product: Product; onClose: () => void }) {
  const fetchPricing = useServerFn(getAdPricing);
  const createCheckout = useServerFn(createAdCheckout);

  const { data: pricing = [] } = useQuery({
    queryKey: ["ad-pricing"],
    queryFn: () => fetchPricing(),
  });

  const [placement, setPlacement] = useState<Placement>("card");
  const [startsAt, setStartsAt] = useState(defaultDate(0));
  const [endsAt, setEndsAt] = useState(defaultDate(3));
  const [submitting, setSubmitting] = useState(false);

  const priceRow = pricing.find((p: any) => p.placement === placement);

  const calc = useMemo(() => {
    const s = new Date(startsAt).getTime();
    const e = new Date(endsAt).getTime();
    if (!priceRow || Number.isNaN(s) || Number.isNaN(e) || e <= s) {
      return { hours: 0, days: 0, extraHours: 0, totalCents: 0 };
    }
    const hours = Math.ceil((e - s) / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    const extraHours = hours - days * 24;
    const totalCents =
      days * priceRow.price_per_day_cents + extraHours * priceRow.price_per_hour_cents;
    return { hours, days, extraHours, totalCents };
  }, [startsAt, endsAt, priceRow]);

  const cardPrice = pricing.find((p: any) => p.placement === "card");
  const carouselPrice = pricing.find((p: any) => p.placement === "carousel");

  async function handlePay() {
    try {
      setSubmitting(true);
      const res = await createCheckout({
        data: {
          productId: product.id,
          placement,
          startsAt: new Date(startsAt).toISOString(),
          endsAt: new Date(endsAt).toISOString(),
          origin: window.location.origin,
        },
      });
      if (!res?.url) throw new Error("Falha ao iniciar pagamento");
      window.location.assign(res.url);
      onClose();
    } catch (e: any) {
      console.error("createAdCheckout failed", e);
      toast.error(e?.message ?? "Não foi possível iniciar o pagamento");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 grid place-items-center p-4 overflow-y-auto" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="bg-card border border-border rounded-2xl w-full max-w-2xl p-6 shadow-brand my-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-black flex items-center gap-2">
            <Rocket className="h-5 w-5 text-primary" /> Turbinar produto
          </h2>
          <button onClick={onClose} className="p-2 rounded hover:bg-secondary"><X className="h-4 w-4" /></button>
        </div>

        {/* Produto */}
        <div className="flex items-center gap-3 p-3 bg-secondary/40 rounded-lg mb-5">
          <div className="h-14 w-14 bg-secondary rounded overflow-hidden shrink-0">
            {product.image_url && <img src={product.image_url} alt="" className="w-full h-full object-cover" />}
          </div>
          <div className="min-w-0">
            <p className="font-semibold line-clamp-1">{product.title}</p>
            <p className="text-sm text-muted-foreground">{formatBRL(Number(product.price))}</p>
          </div>
        </div>

        {/* Tipo */}
        <h3 className="text-sm font-bold mb-2">Tipo de divulgação</h3>
        <div className="grid sm:grid-cols-2 gap-3 mb-5">
          <PlacementCard
            active={placement === "card"}
            onClick={() => setPlacement("card")}
            icon={<Star className="h-5 w-5" />}
            title="Card Patrocinado"
            desc="Aparece nas áreas patrocinadas do marketplace"
            price={cardPrice ? `${formatBRL(cardPrice.price_per_day_cents / 100)} / dia` : "—"}
          />
          <PlacementCard
            active={placement === "carousel"}
            onClick={() => setPlacement("carousel")}
            icon={<Flame className="h-5 w-5" />}
            title="Destaque no Carrossel"
            desc="Aparece no carrossel principal da home"
            price={carouselPrice ? `${formatBRL(carouselPrice.price_per_day_cents / 100)} / dia` : "—"}
            premium
          />
        </div>

        {/* Período */}
        <h3 className="text-sm font-bold mb-2">Período da divulgação</h3>
        <div className="grid sm:grid-cols-2 gap-3 mb-5">
          <label className="text-sm">
            <span className="block text-muted-foreground mb-1">Início</span>
            <input
              type="datetime-local"
              value={startsAt}
              onChange={(e) => setStartsAt(e.target.value)}
              className="w-full h-10 px-3 rounded-md border border-border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/40"
            />
          </label>
          <label className="text-sm">
            <span className="block text-muted-foreground mb-1">Término</span>
            <input
              type="datetime-local"
              value={endsAt}
              onChange={(e) => setEndsAt(e.target.value)}
              className="w-full h-10 px-3 rounded-md border border-border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/40"
            />
          </label>
        </div>

        {/* Resumo */}
        <div className="bg-secondary/40 rounded-lg p-4 space-y-1.5 text-sm mb-5">
          <Row label="Tipo" value={placement === "carousel" ? "Carrossel Principal 🔥" : "Card Patrocinado ⭐"} />
          <Row label="Duração" value={calc.hours > 0 ? `${calc.days} dia(s)${calc.extraHours ? ` + ${calc.extraHours}h` : ""}` : "—"} />
          <Row label="Início" value={new Date(startsAt).toLocaleString("pt-BR")} />
          <Row label="Término" value={new Date(endsAt).toLocaleString("pt-BR")} />
          <div className="border-t border-border pt-2 mt-2 flex items-center justify-between">
            <span className="font-bold">Valor total</span>
            <span className="text-lg font-black text-primary">{formatBRL(calc.totalCents / 100)}</span>
          </div>
        </div>

        <button
          onClick={handlePay}
          disabled={submitting || calc.totalCents < 100}
          className="w-full h-11 rounded-lg bg-gradient-brand text-primary-foreground font-bold flex items-center justify-center gap-2 hover:opacity-95 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Rocket className="h-4 w-4" />}
          {submitting ? "Abrindo pagamento..." : `Pagar ${formatBRL(calc.totalCents / 100)} com Stripe`}
        </button>
        <p className="text-xs text-muted-foreground text-center mt-2">
          O anúncio será programado automaticamente após confirmação do pagamento.
        </p>
      </div>
    </div>
  );
}

function PlacementCard({
  active, onClick, icon, title, desc, price, premium,
}: { active: boolean; onClick: () => void; icon: React.ReactNode; title: string; desc: string; price: string; premium?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-left p-4 rounded-lg border-2 transition ${active ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"}`}
    >
      <div className="flex items-center gap-2 mb-1">
        <span className={premium ? "text-orange-500" : "text-amber-500"}>{icon}</span>
        <span className="font-bold">{title}</span>
        {premium && <span className="text-[10px] font-bold text-orange-600 bg-orange-100 px-1.5 py-0.5 rounded">PREMIUM</span>}
      </div>
      <p className="text-xs text-muted-foreground mb-2">{desc}</p>
      <p className="text-sm font-bold">{price}</p>
    </button>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
