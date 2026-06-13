import { Link } from "@tanstack/react-router";
import * as Icons from "lucide-react";
import { categories } from "@/lib/mock-data";

export function CategoryGrid() {
  return (
    <section className="container mx-auto px-4 mt-10">
      <div className="flex items-end justify-between mb-4">
        <h2 className="text-2xl font-black">Categorias em destaque</h2>
        <Link to="/" className="text-sm text-primary font-semibold hover:underline">
          Ver todas
        </Link>
      </div>
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
        {categories.map((c) => {
          const Icon = (Icons as unknown as Record<string, Icons.LucideIcon>)[c.icon] ?? Icons.Tag;
          return (
            <Link
              key={c.slug}
              to="/category/$slug"
              params={{ slug: c.slug }}
              className="group flex flex-col items-center gap-2 p-4 rounded-xl bg-card border border-border hover:border-primary/40 hover:shadow-brand transition-all"
            >
              <div className="h-12 w-12 rounded-full bg-gradient-brand grid place-items-center text-primary-foreground group-hover:scale-110 transition">
                <Icon className="h-6 w-6" />
              </div>
              <span className="text-xs text-center font-semibold leading-tight">{c.name}</span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
