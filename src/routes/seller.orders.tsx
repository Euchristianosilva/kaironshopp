import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/hooks/use-auth";
import { listSellerOrders, getSellerOrder, updateFulfillment } from "@/lib/orders.functions";
import { formatBRL } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Package, Truck, CheckCircle2, Clock, X, Printer, Copy, ExternalLink, Download } from "lucide-react";
import { toast } from "sonner";
import { openShippingLabel, downloadLabelHtml, type LabelData } from "@/lib/shipping-label";

export const Route = createFileRoute("/seller/orders")({
  head: () => ({ meta: [{ title: "Pedidos — Kairon Shop" }] }),
  component: SellerOrdersPage,
});

const STATUS: Record<string, { label: string; cls: string; icon: any }> = {
  pending: { label: "Pendente", cls: "bg-muted text-muted-foreground", icon: Clock },
  processing: { label: "Processando", cls: "bg-blue-500/10 text-blue-600", icon: Package },
  shipped: { label: "Enviado", cls: "bg-amber-500/10 text-amber-600", icon: Truck },
  delivered: { label: "Entregue", cls: "bg-success/10 text-success", icon: CheckCircle2 },
  canceled: { label: "Cancelado", cls: "bg-destructive/10 text-destructive", icon: X },
  returned: { label: "Devolvido", cls: "bg-destructive/10 text-destructive", icon: X },
};

function SellerOrdersPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => { if (!loading && !user) navigate({ to: "/auth" }); }, [loading, user, navigate]);

  const list = useServerFn(listSellerOrders);
  const { data, isLoading } = useQuery({
    queryKey: ["seller-orders", status],
    queryFn: () => list({ data: { status } }),
    enabled: !!user,
  });

  if (loading || !user) {
    return <div className="min-h-0"><main className="flex-1 grid place-items-center text-muted-foreground">Carregando...</main></div>;
  }

  return (
    <div className="min-h-0">
      
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
          <h1 className="text-3xl font-black flex items-center gap-2"><Package className="h-7 w-7 text-primary" /> Pedidos</h1>
          <Link to="/seller" className="text-sm text-primary hover:underline">← Voltar ao painel</Link>
        </div>

        <div className="flex gap-2 mb-4 flex-wrap">
          {["all","pending","processing","shipped","delivered","canceled"].map((s) => (
            <button key={s} onClick={() => setStatus(s)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${status === s ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border hover:bg-muted"}`}>
              {s === "all" ? "Todos" : STATUS[s]?.label ?? s}
            </button>
          ))}
        </div>

        <div className="bg-card border border-border rounded-xl overflow-hidden">
          {isLoading ? (
            <div className="p-10 text-center text-muted-foreground">Carregando pedidos...</div>
          ) : (data?.orders ?? []).length === 0 ? (
            <div className="p-10 text-center text-muted-foreground text-sm">Nenhum pedido encontrado.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pedido</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Pagamento</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Rastreio</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data?.orders ?? []).map((o: any) => {
                  const st = STATUS[o.fulfillment_status] ?? STATUS.pending;
                  const Icon = st.icon;
                  return (
                    <TableRow key={o.id}>
                      <TableCell className="font-mono text-xs">#{o.id.slice(0, 8)}</TableCell>
                      <TableCell>{new Date(o.created_at).toLocaleDateString("pt-BR")}</TableCell>
                      <TableCell className="font-semibold">{formatBRL((o.gross_cents ?? 0) / 100)}</TableCell>
                      <TableCell><span className={`text-xs px-2 py-0.5 rounded font-semibold ${o.payment_status === "paid" ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>{o.payment_status}</span></TableCell>
                      <TableCell><span className={`text-xs px-2 py-1 rounded-full font-semibold inline-flex items-center gap-1 ${st.cls}`}><Icon className="h-3 w-3" /> {st.label}</span></TableCell>
                      <TableCell className="text-xs font-mono text-muted-foreground">{o.tracking_code ?? "—"}</TableCell>
                      <TableCell>
                        <div className="flex gap-1 flex-wrap justify-end">
                          {o.tracking_code && (
                            <>
                              <Button size="icon" variant="ghost" title="Copiar rastreio" onClick={() => { navigator.clipboard.writeText(o.tracking_code); toast.success("Rastreio copiado"); }}><Copy className="h-4 w-4" /></Button>
                              <Button size="icon" variant="ghost" title="Abrir rastreamento" asChild><a href={`https://www.linkcorreios.com.br/?id=${encodeURIComponent(o.tracking_code)}`} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-4 w-4" /></a></Button>
                            </>
                          )}
                          <Button size="sm" variant="outline" onClick={() => setSelectedId(o.id)}>Abrir</Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>
      </main>
      
      {selectedId && <OrderDetailDialog orderId={selectedId} onClose={() => setSelectedId(null)} />}
    </div>
  );
}

function OrderDetailDialog({ orderId, onClose }: { orderId: string; onClose: () => void }) {
  const qc = useQueryClient();
  const get = useServerFn(getSellerOrder);
  const upd = useServerFn(updateFulfillment);
  const { data, isLoading } = useQuery({ queryKey: ["seller-order", orderId], queryFn: () => get({ data: { orderId } }) });

  const [fulfillment, setFulfillment] = useState<string>("");
  const [tracking, setTracking] = useState("");
  const [carrier, setCarrier] = useState("");
  const [notes, setNotes] = useState("");
  const [shippingMethod, setShippingMethod] = useState("");
  const [weight, setWeight] = useState<string>("");

  useEffect(() => {
    if (data?.order) {
      const o: any = data.order;
      setFulfillment(o.fulfillment_status ?? "pending");
      setTracking(o.tracking_code ?? "");
      setCarrier(o.carrier ?? "");
      setNotes(o.seller_notes ?? "");
      setShippingMethod(o.shipping_method ?? o.shipping_service_name ?? "");
      setWeight(o.package_weight_grams != null ? String(o.package_weight_grams) : "");
    }
  }, [data?.order]);

  const save = useMutation({
    mutationFn: () => upd({ data: {
      orderId,
      fulfillment_status: fulfillment as any,
      tracking_code: tracking,
      carrier,
      seller_notes: notes,
      shipping_method: shippingMethod,
      package_weight_grams: weight ? parseInt(weight, 10) : undefined,
    } }),
    onSuccess: () => {
      toast.success("Pedido atualizado");
      qc.invalidateQueries({ queryKey: ["seller-orders"] });
      qc.invalidateQueries({ queryKey: ["seller-order", orderId] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const buildLabelData = (): LabelData => {
    const addr: any = data?.order?.shipping_address ?? {};
    const seller: any = (data as any)?.seller ?? {};
    return {
      orderId,
      orderCreatedAt: data?.order?.created_at ?? new Date(),
      trackingCode: tracking,
      carrier,
      shippingMethod,
      fulfillmentStatus: fulfillment,
      packageWeightGrams: weight ? parseInt(weight, 10) : null,
      recipient: {
        name: data?.buyer?.full_name ?? addr.name,
        phone: addr.phone,
        address: addr.line1 ?? addr.address,
        number: addr.number,
        complement: addr.complement,
        neighborhood: addr.neighborhood ?? addr.district,
        city: addr.city,
        state: addr.state,
        zip: addr.zip ?? addr.postal_code,
      },
      sender: {
        name: seller.name,
        phone: seller.phone ?? seller.whatsapp,
        address: seller.origin_address,
        number: seller.origin_number,
        complement: seller.origin_complement,
        neighborhood: seller.origin_district,
        city: seller.origin_city,
        state: seller.origin_state,
        zip: seller.origin_zip,
        logoUrl: seller.logo_url,
      },
      marketplaceName: "Kairon Shop",
      trackingUrl: tracking ? `https://www.linkcorreios.com.br/?id=${encodeURIComponent(tracking)}` : undefined,
      orderUrl: `${window.location.origin}/account`,
    };
  };

  const printLabel = () => openShippingLabel(buildLabelData());
  const downloadLabel = () => downloadLabelHtml(buildLabelData());
  const copyTracking = () => { if (!tracking) return; navigator.clipboard.writeText(tracking); toast.success("Rastreio copiado"); };
  const openTracking = () => { if (!tracking) return; window.open(`https://www.linkcorreios.com.br/?id=${encodeURIComponent(tracking)}`, "_blank"); };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Pedido #{orderId.slice(0, 8)}</DialogTitle></DialogHeader>
        {isLoading || !data ? (
          <div className="py-8 text-center text-muted-foreground">Carregando...</div>
        ) : (
          <div className="space-y-5">
            <section>
              <h3 className="font-bold text-sm mb-2">Cliente</h3>
              <p className="text-sm">{data.buyer?.full_name ?? "—"}</p>
            </section>

            <section>
              <h3 className="font-bold text-sm mb-2">Itens</h3>
              <div className="border border-border rounded-lg divide-y divide-border">
                {data.items.map((it: any) => (
                  <div key={it.id} className="p-3 flex justify-between text-sm">
                    <div>
                      <div className="font-medium">{it.title}</div>
                      {it.variant_label && <div className="text-xs text-muted-foreground">{it.variant_label}</div>}
                      <div className="text-xs text-muted-foreground">Qtd: {it.qty} · {formatBRL(Number(it.unit_price))}</div>
                    </div>
                    <div className="font-semibold">{formatBRL((it.gross_cents ?? 0) / 100)}</div>
                  </div>
                ))}
              </div>
            </section>

            {data.order.shipping_address && (
              <section>
                <h3 className="font-bold text-sm mb-2">Endereço de entrega</h3>
                <p className="text-sm text-muted-foreground whitespace-pre-line">
                  {[(data.order.shipping_address as any).line1, (data.order.shipping_address as any).number, (data.order.shipping_address as any).neighborhood, `${(data.order.shipping_address as any).city ?? ""} - ${(data.order.shipping_address as any).state ?? ""}`, `CEP: ${(data.order.shipping_address as any).zip ?? ""}`].filter(Boolean).join("\n")}
                </p>
              </section>
            )}

            <section className="grid sm:grid-cols-2 gap-3">
              <div>
                <Label>Status</Label>
                <Select value={fulfillment} onValueChange={setFulfillment}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(STATUS).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Transportadora</Label>
                <Select value={carrier} onValueChange={setCarrier}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {["Correios","Jadlog","Loggi","Mercado Envios","Total Express","Melhor Envio","Kangu","Frenet","Própria"].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Serviço / método</Label>
                <Input value={shippingMethod} onChange={(e) => setShippingMethod(e.target.value)} placeholder="PAC, Sedex, .Package..." />
              </div>
              <div>
                <Label>Peso (g)</Label>
                <Input type="number" min={0} value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="500" />
              </div>
              <div className="sm:col-span-2">
                <Label>Código de rastreio</Label>
                <Input value={tracking} onChange={(e) => setTracking(e.target.value)} placeholder="BR123456789BR" />
              </div>
              <div className="sm:col-span-2">
                <Label>Notas internas</Label>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
              </div>
            </section>

            <DialogFooter className="gap-2 flex-wrap">
              <Button variant="outline" size="sm" onClick={copyTracking} disabled={!tracking}><Copy className="h-4 w-4" /> Copiar rastreio</Button>
              <Button variant="outline" size="sm" onClick={openTracking} disabled={!tracking}><ExternalLink className="h-4 w-4" /> Abrir rastreamento</Button>
              <Button variant="outline" size="sm" onClick={downloadLabel}><Download className="h-4 w-4" /> Baixar etiqueta</Button>
              <Button variant="outline" size="sm" onClick={printLabel}><Printer className="h-4 w-4" /> Gerar / imprimir etiqueta</Button>
              <Button onClick={() => save.mutate()} disabled={save.isPending}>{save.isPending ? "Salvando..." : "Salvar alterações"}</Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
