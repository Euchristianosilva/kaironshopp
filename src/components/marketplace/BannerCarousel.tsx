import { useEffect, useState } from "react";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { banners } from "@/lib/mock-data";

export function BannerCarousel() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((p) => (p + 1) % banners.length), 5000);
    return () => clearInterval(t);
  }, []);

  return (
    <section className="container mx-auto px-4 mt-4">
      <div className="relative rounded-2xl overflow-hidden h-[280px] md:h-[380px] shadow-brand">
        {banners.map((b, idx) => (
          <div
            key={b.id}
            className={`absolute inset-0 transition-opacity duration-700 ${idx === i ? "opacity-100" : "opacity-0 pointer-events-none"}`}
          >
            <img src={b.image} alt={b.title} className="absolute inset-0 w-full h-full object-cover" />
            <div className={`absolute inset-0 bg-gradient-to-r ${b.gradient} opacity-85`} />
            <div className="relative h-full container mx-auto px-6 md:px-12 flex flex-col justify-center text-primary-foreground max-w-2xl">
              <span className="text-xs md:text-sm font-semibold tracking-wider uppercase opacity-90">
                Patrocinado · Oferta exclusiva
              </span>
              <h2 className="mt-2 text-3xl md:text-5xl font-black leading-tight drop-shadow">
                {b.title}
              </h2>
              <p className="mt-3 text-base md:text-lg opacity-95 max-w-lg">{b.subtitle}</p>
              <a
                href={b.href}
                className="mt-6 inline-flex w-fit items-center gap-2 bg-background text-primary font-bold px-6 py-3 rounded-lg hover:scale-105 transition shadow-lg"
              >
                {b.cta}
              </a>
            </div>
          </div>
        ))}
        <button
          onClick={() => setI((p) => (p - 1 + banners.length) % banners.length)}
          aria-label="Anterior"
          className="absolute left-3 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-background/70 backdrop-blur grid place-items-center hover:bg-background transition"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <button
          onClick={() => setI((p) => (p + 1) % banners.length)}
          aria-label="Próximo"
          className="absolute right-3 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-background/70 backdrop-blur grid place-items-center hover:bg-background transition"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
          {banners.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setI(idx)}
              aria-label={`Banner ${idx + 1}`}
              className={`h-1.5 rounded-full transition-all ${idx === i ? "w-8 bg-background" : "w-1.5 bg-background/60"}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
