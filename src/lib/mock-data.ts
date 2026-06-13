export type Category = {
  slug: string;
  name: string;
  icon: string; // lucide icon name
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

export type Product = {
  id: string;
  name: string;
  price: number;
  oldPrice?: number;
  rating: number;
  sold: number;
  category: string;
  seller: string;
  image: string;
  freeShipping?: boolean;
};

const img = (q: string, seed: number) =>
  `https://images.unsplash.com/photo-${q}?auto=format&fit=crop&w=600&q=70&seed=${seed}`;

export const products: Product[] = [
  {
    id: "p1",
    name: "Smartphone Galaxy Ultra 256GB Tela 6.8\" Câmera 200MP",
    price: 4299,
    oldPrice: 5499,
    rating: 4.8,
    sold: 1240,
    category: "celulares",
    seller: "TechStore BR",
    image: img("1511707171634-5f897ff02aa9", 1),
    freeShipping: true,
  },
  {
    id: "p2",
    name: "Notebook Gamer RTX 4060 16GB SSD 1TB Intel i7",
    price: 6890,
    oldPrice: 8499,
    rating: 4.9,
    sold: 540,
    category: "informatica",
    seller: "MegaInfo",
    image: img("1496181133206-80ce9b88a853", 2),
    freeShipping: true,
  },
  {
    id: "p3",
    name: "Fone Bluetooth Premium ANC Cancelamento de Ruído",
    price: 399,
    oldPrice: 699,
    rating: 4.7,
    sold: 3200,
    category: "eletronicos",
    seller: "AudioPro",
    image: img("1505740420928-5e560c06d30e", 3),
    freeShipping: true,
  },
  {
    id: "p4",
    name: "Smart TV 55\" 4K UHD HDR Sistema Android",
    price: 2599,
    oldPrice: 3299,
    rating: 4.6,
    sold: 890,
    category: "eletronicos",
    seller: "TV House",
    image: img("1593359677879-a4bb92f829d1", 4),
  },
  {
    id: "p5",
    name: "Tênis Esportivo Corrida Profissional Ultra Leve",
    price: 289,
    oldPrice: 459,
    rating: 4.5,
    sold: 5400,
    category: "esportes",
    seller: "Sport Zone",
    image: img("1542291026-7eec264c27ff", 5),
    freeShipping: true,
  },
  {
    id: "p6",
    name: "Cafeteira Espresso Automática Pressão 19 Bar",
    price: 1199,
    oldPrice: 1599,
    rating: 4.8,
    sold: 670,
    category: "casa",
    seller: "Casa & Cia",
    image: img("1495474472287-4d71bcdd2085", 6),
  },
  {
    id: "p7",
    name: "Console Next-Gen 1TB + 2 Controles + 3 Jogos",
    price: 3799,
    oldPrice: 4299,
    rating: 4.9,
    sold: 2100,
    category: "games",
    seller: "GameWorld",
    image: img("1486401899868-0e435ed85128", 7),
    freeShipping: true,
  },
  {
    id: "p8",
    name: "Perfume Importado 100ml Eau de Parfum Luxo",
    price: 549,
    oldPrice: 799,
    rating: 4.7,
    sold: 1800,
    category: "beleza",
    seller: "Beauty Shop",
    image: img("1541643600914-78b084683601", 8),
  },
  {
    id: "p9",
    name: "Jaqueta Masculina Corta Vento Impermeável",
    price: 219,
    oldPrice: 349,
    rating: 4.4,
    sold: 950,
    category: "moda-masculina",
    seller: "Moda Urbana",
    image: img("1551028719-00167b16eac5", 9),
  },
  {
    id: "p10",
    name: "Vestido Feminino Midi Elegante Festa",
    price: 189,
    oldPrice: 289,
    rating: 4.6,
    sold: 1300,
    category: "moda-feminina",
    seller: "Fashion Br",
    image: img("1496747611176-843222e1e57c", 10),
  },
  {
    id: "p11",
    name: "Kit Ferramentas Profissional 150 Peças Maleta",
    price: 459,
    oldPrice: 699,
    rating: 4.7,
    sold: 410,
    category: "ferramentas",
    seller: "Mestre Obra",
    image: img("1581244277943-fe4a9c777189", 11),
  },
  {
    id: "p12",
    name: "Ração Premium Cães Adultos 15kg Sabor Frango",
    price: 189,
    oldPrice: 249,
    rating: 4.9,
    sold: 2800,
    category: "petshop",
    seller: "Mundo Pet",
    image: img("1601758228041-f3b2795255f1", 12),
    freeShipping: true,
  },
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
