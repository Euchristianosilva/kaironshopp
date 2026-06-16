import { Link } from "@tanstack/react-router";
import { Facebook, Instagram, Youtube, Twitter, ShieldCheck, Truck, CreditCard, Headphones } from "lucide-react";

export function Footer() {
  return (
    <footer className="mt-16 bg-foreground text-background">
      <div className="border-b border-background/10">
        <div className="container mx-auto px-4 py-8 grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            { i: Truck, t: "Frete grátis", d: "Em compras acima de R$ 199" },
            { i: ShieldCheck, t: "Compra segura", d: "Garantia em todas as compras" },
            { i: CreditCard, t: "Parcele em até 12x", d: "Cartão, PIX, boleto" },
            { i: Headphones, t: "Atendimento", d: "Suporte 24/7" },
          ].map((b) => (
            <div key={b.t} className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-gradient-brand grid place-items-center text-primary-foreground">
                <b.i className="h-5 w-5" />
              </div>
              <div>
                <div className="font-bold">{b.t}</div>
                <div className="text-xs opacity-70">{b.d}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="container mx-auto px-4 py-12 grid grid-cols-2 md:grid-cols-5 gap-8 text-sm">
        <div className="col-span-2">
          <div className="flex items-center gap-2 mb-3">
            <div className="h-9 w-9 rounded-lg bg-gradient-brand grid place-items-center text-primary-foreground font-black">M</div>
            <span className="font-black text-xl">Kairon Shop</span>
          </div>
          <p className="opacity-70 max-w-sm">O marketplace que conecta milhares de vendedores e compradores em todo o Brasil com segurança, agilidade e melhores preços.</p>
          <div className="flex gap-3 mt-4">
            {[Facebook, Instagram, Youtube, Twitter].map((I, i) => (
              <a key={i} href="#" className="h-9 w-9 rounded-full bg-background/10 grid place-items-center hover:bg-primary transition">
                <I className="h-4 w-4" />
              </a>
            ))}
          </div>
        </div>
        {[
          { t: "Institucional", l: ["Sobre", "Carreiras", "Imprensa", "Blog"] },
          { t: "Ajuda", l: ["Central de ajuda", "Como comprar", "Devoluções", "Fale conosco"] },
          { t: "Vendedores", l: ["Anuncie aqui", "Painel do vendedor", "Programa de afiliados", "Cashback"] },
        ].map((col) => (
          <div key={col.t}>
            <h4 className="font-bold mb-3">{col.t}</h4>
            <ul className="space-y-2 opacity-80">
              {col.l.map((x) => (
                <li key={x}><Link to="/" className="hover:text-brand-orange">{x}</Link></li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-background/10 py-5 text-center text-xs opacity-60">
        © {new Date().getFullYear()} Kairon Shop — Todos os direitos reservados · CNPJ 00.000.000/0001-00
      </div>
    </footer>
  );
}
