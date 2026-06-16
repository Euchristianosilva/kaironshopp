import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/hooks/use-auth";
import { listSellerCustomers } from "@/lib/orders.functions";
import { formatBRL } from "@/lib/mock-data";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users } from "lucide-react";

export const Route = createFileRoute("/seller/customers")({
  head: () => ({ meta: [{ title: "Clientes — Kairon Shop" }] }),
  component: SellerCustomersPage,
});

function SellerCustomersPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  useEffect(() => { if (!loading && !user) navigate({ to: "/auth" }); }, [loading, user, navigate]);

  const list = useServerFn(listSellerCustomers);
  const { data, isLoading } = useQuery({
    queryKey: ["seller-customers"],
    queryFn: () => list(),
    enabled: !!user,
  });

  if (loading || !user) {
    return <div className="min-h-0"><main className="flex-1 grid place-items-center text-muted-foreground">Carregando...</main></div>;
  }

  return (
    <div className="min-h-0">
      
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6 gap-3">
          <h1 className="text-3xl font-black flex items-center gap-2"><Users className="h-7 w-7 text-primary" /> Clientes</h1>
          <Link to="/seller" className="text-sm text-primary hover:underline">← Voltar ao painel</Link>
        </div>

        <div className="bg-card border border-border rounded-xl overflow-hidden">
          {isLoading ? (
            <div className="p-10 text-center text-muted-foreground">Carregando...</div>
          ) : (data?.customers ?? []).length === 0 ? (
            <div className="p-10 text-center text-muted-foreground text-sm">Você ainda não tem clientes.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead className="text-right">Pedidos</TableHead>
                  <TableHead className="text-right">Total gasto</TableHead>
                  <TableHead>Última compra</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data?.customers ?? []).map((c: any) => (
                  <TableRow key={c.buyer_id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {c.profile?.avatar_url ? (
                          <img src={c.profile.avatar_url} alt="" className="h-8 w-8 rounded-full object-cover" />
                        ) : (
                          <div className="h-8 w-8 rounded-full bg-primary/10 grid place-items-center text-xs font-bold text-primary">
                            {(c.profile?.full_name ?? "?").charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <div className="font-medium">{c.profile?.full_name ?? "Cliente"}</div>
                          <div className="text-xs text-muted-foreground font-mono">#{c.buyer_id.slice(0, 8)}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-semibold">{c.orders}</TableCell>
                    <TableCell className="text-right font-semibold text-success">{formatBRL(c.total_cents / 100)}</TableCell>
                    <TableCell>{new Date(c.last_order).toLocaleDateString("pt-BR")}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </main>
      
    </div>
  );
}
