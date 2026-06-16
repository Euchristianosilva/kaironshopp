import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/hooks/use-auth";
import { listSellerReviews, replyReview } from "@/lib/marketing.functions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Star, MessageSquare } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/seller/reviews")({
  head: () => ({ meta: [{ title: "Avaliações — Kairon Shop" }] }),
  component: Page,
});

function Page() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  useEffect(() => { if (!loading && !user) navigate({ to: "/auth" }); }, [loading, user, navigate]);

  const qc = useQueryClient();
  const list = useServerFn(listSellerReviews);
  const reply = useServerFn(replyReview);

  const { data, isLoading } = useQuery({ queryKey: ["seller-reviews"], queryFn: () => list(), enabled: !!user });
  const [replying, setReplying] = useState<Record<string, string>>({});

  const replyMut = useMutation({
    mutationFn: ({ id, text }: { id: string; text: string }) => reply({ data: { id, reply: text } }),
    onSuccess: () => { toast.success("Resposta enviada"); qc.invalidateQueries({ queryKey: ["seller-reviews"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  if (loading || !user) return <Shell><p className="text-muted-foreground">Carregando...</p></Shell>;

  return (
    <Shell>
      <div className="flex items-center justify-between mb-6 gap-3">
        <h1 className="text-3xl font-black flex items-center gap-2"><MessageSquare className="h-7 w-7 text-primary" /> Avaliações</h1>
        <Link to="/seller" className="text-sm text-primary hover:underline">← Painel</Link>
      </div>

      <div className="grid sm:grid-cols-2 gap-4 mb-6">
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="text-xs text-muted-foreground uppercase">Total de avaliações</div>
          <div className="text-3xl font-black mt-1">{data?.total ?? 0}</div>
        </div>
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="text-xs text-muted-foreground uppercase">Nota média</div>
          <div className="text-3xl font-black mt-1 flex items-center gap-2">
            {data?.avg.toFixed(1) ?? "0.0"}
            <Stars value={Math.round(data?.avg ?? 0)} />
          </div>
        </div>
      </div>

      {isLoading ? <p className="text-muted-foreground">Carregando...</p>
        : !data?.reviews.length ? <p className="text-muted-foreground p-8 text-center bg-card border border-border rounded-xl">Nenhuma avaliação ainda.</p>
        : (
        <div className="space-y-4">
          {data.reviews.map((r: any) => (
            <div key={r.id} className="bg-card border border-border rounded-xl p-5">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div>
                  <div className="font-semibold">{r.buyer_name}</div>
                  <div className="text-xs text-muted-foreground">{r.product_title} · {new Date(r.created_at).toLocaleDateString("pt-BR")}</div>
                </div>
                <Stars value={r.rating} />
              </div>
              {r.comment && <p className="text-sm mt-2">{r.comment}</p>}
              {r.seller_reply ? (
                <div className="mt-3 border-l-2 border-primary pl-3">
                  <div className="text-xs font-semibold text-primary">Sua resposta:</div>
                  <p className="text-sm">{r.seller_reply}</p>
                </div>
              ) : (
                <div className="mt-3 space-y-2">
                  <Textarea
                    placeholder="Responder a esta avaliação..."
                    value={replying[r.id] ?? ""}
                    onChange={(e) => setReplying({ ...replying, [r.id]: e.target.value })}
                  />
                  <Button size="sm" disabled={!replying[r.id]?.trim() || replyMut.isPending}
                    onClick={() => replyMut.mutate({ id: r.id, text: replying[r.id] })}>
                    Responder
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </Shell>
  );
}

function Stars({ value }: { value: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} className={`h-4 w-4 ${i <= value ? "fill-yellow-500 text-yellow-500" : "text-muted-foreground"}`} />
      ))}
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-0">
      
      <main className="flex-1 container mx-auto px-4 py-8">{children}</main>
      
    </div>
  );
}
