import { createFileRoute, Link } from "@tanstack/react-router";
import { LifeBuoy, Mail, MessageCircle } from "lucide-react";

export const Route = createFileRoute("/seller/support")({
  head: () => ({ meta: [{ title: "Suporte — Painel do Vendedor" }] }),
  component: SellerSupportPage,
});

function SellerSupportPage() {
  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl sm:text-3xl font-black flex items-center gap-2 mb-2">
        <LifeBuoy className="h-7 w-7 text-primary" /> Central de Suporte
      </h1>
      <p className="text-muted-foreground mb-6">
        Precisa de ajuda? Nossa equipe está pronta para atender você.
      </p>

      <div className="grid sm:grid-cols-2 gap-4">
        <a
          href="mailto:kaironshopp@gmail.com"
          className="bg-card border border-border rounded-xl p-6 hover:border-primary/50 transition"
        >
          <Mail className="h-6 w-6 text-primary mb-3" />
          <div className="font-bold mb-1">E-mail</div>
          <div className="text-sm text-muted-foreground">kaironshopp@gmail.com</div>
        </a>

        <Link
          to="/seller/help"
          className="bg-card border border-border rounded-xl p-6 hover:border-primary/50 transition"
        >
          <MessageCircle className="h-6 w-6 text-primary mb-3" />
          <div className="font-bold mb-1">Central de Ajuda</div>
          <div className="text-sm text-muted-foreground">Tutoriais e perguntas frequentes</div>
        </Link>
      </div>

      <div className="mt-8 bg-card border border-border rounded-xl p-6">
        <h2 className="font-bold mb-2">Suporte por chat</h2>
        <p className="text-sm text-muted-foreground">
          Em breve você poderá abrir chamados diretamente por aqui. Por enquanto, entre em contato
          pelo e-mail acima ou através do menu Mensagens.
        </p>
      </div>
    </div>
  );
}
