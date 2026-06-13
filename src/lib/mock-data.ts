export type Category = {
  slug: string;
  name: string;
  icon: string;
};

export const categories: Category[] = [
  { slug: "eletronicos", name: "Eletrônicos", icon: "Tv" },
  { slug: "celulares", name: "Celulares", icon: "Smartphone" },
  { slug: "informatica", name: "Informática", icon: "Laptop" },
  { slug: "moda-masculina", name: "Moda Masculina", icon: "Shirt" },
  { slug: "moda-feminina", name: "Moda Feminina", icon: "Sparkles" },
  { slug: "beleza", name: "Beleza", icon: "Heart" },
  { slug: "casa", name: "Casa e Decoração", icon: "Sofa" },
  { slug: "esportes", name: "Esportes", icon: "Dumbbell" },
  { slug: "automotivo", name: "Automotivo", icon: "Car" },
  { slug: "ferramentas", name: "Ferramentas", icon: "Wrench" },
  { slug: "infantil", name: "Infantil", icon: "Baby" },
  { slug: "games", name: "Games", icon: "Gamepad2" },
  { slug: "livros", name: "Livros", icon: "BookOpen" },
  { slug: "petshop", name: "Pet Shop", icon: "PawPrint" },
  { slug: "saude", name: "Saúde", icon: "Stethoscope" },
  { slug: "alimentacao", name: "Alimentação", icon: "UtensilsCrossed" },
];

export type Banner = {
  id: string;
  title: string;
  subtitle: string;
  cta: string;
  href: string;
  gradient: string;
  image: string;
};

export const banners: Banner[] = [
  {
    id: "b1",
    title: "Mega Promoção de Eletrônicos",
    subtitle: "Até 60% OFF em smartphones, notebooks e mais",
    cta: "Aproveitar agora",
    href: "/category/eletronicos",
    gradient: "from-primary to-brand-orange",
    image: "https://images.unsplash.com/photo-1498049794561-7780e7231661?auto=format&fit=crop&w=1600&q=70",
  },
  {
    id: "b2",
    title: "Moda em Alta",
    subtitle: "Coleção exclusiva com frete grátis Brasil",
    cta: "Ver coleção",
    href: "/category/moda-feminina",
    gradient: "from-brand-orange to-primary",
    image: "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1600&q=70",
  },
  {
    id: "b3",
    title: "Games & Consoles",
    subtitle: "Lançamentos com desconto exclusivo",
    cta: "Conferir lançamentos",
    href: "/category/games",
    gradient: "from-primary via-brand-orange to-primary",
    image: "https://images.unsplash.com/photo-1493711662062-fa541adb3fc8?auto=format&fit=crop&w=1600&q=70",
  },
  {
    id: "b4",
    title: "Casa & Decoração",
    subtitle: "Transforme seus ambientes com estilo",
    cta: "Explorar",
    href: "/category/casa",
    gradient: "from-brand-orange to-primary",
    image: "https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=1600&q=70",
  },
  {
    id: "b5",
    title: "Esportes & Fitness",
    subtitle: "Equipamentos com até 50% OFF",
    cta: "Comprar",
    href: "/category/esportes",
    gradient: "from-primary to-brand-orange",
    image: "https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&w=1600&q=70",
  },
];

export const formatBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export type { Product } from "./products";
