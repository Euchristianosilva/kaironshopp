import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { LifeBuoy, ChevronDown, Mail, MessageSquare } from "lucide-react";

export const Route = createFileRoute("/seller/help")({
  head: () => ({ meta: [{ title: "Central de Ajuda — Painel do Vendedor" }] }),
  component: Page,
});

const FAQ = [
  { q: "Como começo a vender?", a: "Crie sua loja no painel, configure o Stripe Connect para receber pagamentos e cadastre seus produtos com fotos, preço, estoque e variações." },
  { q: "Como recebo o dinheiro das vendas?", a: "Os repasses são feitos diretamente pelo Stripe Connect na sua conta bancária. Acesse Financeiro ou o Painel Stripe para detalhes." },
  { q: "Qual é a taxa cobrada por venda?", a: "Cobramos uma comissão da plataforma sobre o valor bruto de cada venda. O valor líquido aparece em cada pedido e nos relatórios financeiros." },
  { q: "Como faço para fazer upload de fotos dos produtos?", a: "Ao criar ou editar um produto, abra a aba Mídia e selecione as imagens (JPG/PNG/WebP). A primeira imagem será a capa." },
  { q: "Posso oferecer cupons de desconto?", a: "Sim. Em Cupons, você cria códigos com desconto fixo ou percentual, validade e limite de uso." },
  { q: "Como controlo o estoque?", a: "Em Estoque você registra entradas, saídas e ajustes. O sistema também alerta quando produtos atingirem o estoque mínimo." },
  { q: "O que é o modo férias?", a: "Em Configurações, ative o modo férias para pausar temporariamente as vendas sem precisar desativar cada produto." },
  { q: "Como respondo a um cliente?", a: "Em Mensagens você vê todas as conversas iniciadas a partir das páginas dos seus produtos." },
];

function Page() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  useEffect(() => { if (!loading && !user) navigate({ to: "/auth" }); }, [loading, user, navigate]);
  const [open, setOpen] = useState<number | null>(0);

  if (loading || !user) return (
    <div className="min-h-0">
      <main className="flex-1 grid place-items-center text-muted-foreground">Carregando...</main>
    </div>
  );

  return (
    <div className="min-h-0">
      
      <main className="flex-1 container mx-auto px-4 py-8 space-y-6 max-w-3xl">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-3xl font-black flex items-center gap-2"><LifeBuoy className="h-7 w-7 text-primary" /> Central de Ajuda</h1>
          <Link to="/seller" className="text-sm text-primary hover:underline">← Painel</Link>
        </div>

        <div className="bg-card border border-border rounded-xl overflow-hidden">
          {FAQ.map((item, i) => (
            <div key={i} className="border-b border-border last:border-b-0">
              <button onClick={() => setOpen(open === i ? null : i)} className="w-full px-5 py-4 flex items-center justify-between gap-3 text-left hover:bg-muted/40">
                <span className="font-semibold">{item.q}</span>
                <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${open === i ? "rotate-180" : ""}`} />
              </button>
              {open === i && <div className="px-5 pb-4 text-sm text-muted-foreground">{item.a}</div>}
            </div>
          ))}
        </div>

        <div className="bg-card border border-border rounded-xl p-6">
          <h2 className="font-bold mb-2">Ainda precisa de ajuda?</h2>
          <p className="text-sm text-muted-foreground mb-4">Fale com nosso time de suporte.</p>
          <div className="flex flex-wrap gap-3">
            <a href="mailto:suporte@kaironshop.com" className="h-11 px-5 rounded-lg border border-border font-semibold text-sm inline-flex items-center gap-2 hover:bg-muted">
              <Mail className="h-4 w-4" /> suporte@kaironshop.com
            </a>
            <Link to="/messages" className="h-11 px-5 rounded-lg bg-gradient-brand text-primary-foreground font-semibold text-sm inline-flex items-center gap-2">
              <MessageSquare className="h-4 w-4" /> Mensagens
            </Link>
          </div>
        </div>
      </main>
      
    </div>
  );
}
