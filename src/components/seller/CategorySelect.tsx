import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMemo } from "react";

type Cat = { id: string; parent_id: string | null; slug: string; name: string };

type Props = {
  value: { categoryId: string | null; categorySlug: string };
  onChange: (v: { categoryId: string | null; categorySlug: string }) => void;
};

export function CategorySelect({ value, onChange }: Props) {
  const { data: cats = [] } = useQuery({
    queryKey: ["categories-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("id,parent_id,slug,name")
        .order("position");
      if (error) throw error;
      return (data ?? []) as Cat[];
    },
  });

  const roots = useMemo(() => cats.filter((c) => !c.parent_id), [cats]);
  const selected = cats.find((c) => c.id === value.categoryId) ?? cats.find((c) => c.slug === value.categorySlug);
  const rootId = selected?.parent_id ?? selected?.id ?? "";
  const subs = useMemo(() => cats.filter((c) => c.parent_id === rootId), [cats, rootId]);

  return (
    <div className="grid grid-cols-2 gap-2">
      <select
        value={rootId}
        onChange={(e) => {
          const root = cats.find((c) => c.id === e.target.value);
          if (root) onChange({ categoryId: root.id, categorySlug: root.slug });
        }}
        className="input"
      >
        <option value="">Categoria</option>
        {roots.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>
      <select
        value={selected?.parent_id ? selected.id : ""}
        onChange={(e) => {
          const sub = cats.find((c) => c.id === e.target.value);
          if (sub) onChange({ categoryId: sub.id, categorySlug: sub.slug });
        }}
        disabled={!rootId || subs.length === 0}
        className="input"
      >
        <option value="">Subcategoria (opcional)</option>
        {subs.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>
    </div>
  );
}
