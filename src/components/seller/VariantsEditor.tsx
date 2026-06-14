import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";

export type VariantDraft = {
  id?: string;
  option1_name: string;
  option1_value: string;
  option2_name: string;
  option2_value: string;
  sku: string;
  price: string;
  stock: string;
  min_stock: string;
  is_active: boolean;
};

export function emptyVariant(): VariantDraft {
  return {
    option1_name: "Cor",
    option1_value: "",
    option2_name: "Tamanho",
    option2_value: "",
    sku: "",
    price: "",
    stock: "0",
    min_stock: "0",
    is_active: true,
  };
}

type Props = {
  value: VariantDraft[];
  onChange: (v: VariantDraft[]) => void;
};

export function VariantsEditor({ value, onChange }: Props) {
  const [rows, setRows] = useState<VariantDraft[]>(value ?? []);
  useEffect(() => setRows(value ?? []), [value]);

  function update(idx: number, patch: Partial<VariantDraft>) {
    const next = rows.map((r, i) => (i === idx ? { ...r, ...patch } : r));
    setRows(next);
    onChange(next);
  }
  function add() {
    const next = [...rows, emptyVariant()];
    setRows(next);
    onChange(next);
  }
  function remove(idx: number) {
    const next = rows.filter((_, i) => i !== idx);
    setRows(next);
    onChange(next);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          Adicione variações (ex: Cor + Tamanho). Cada linha vira uma SKU vendável com preço e estoque próprios.
        </p>
        <button type="button" onClick={add} className="h-9 px-3 rounded-lg border border-border text-sm font-semibold inline-flex items-center gap-1 hover:bg-secondary">
          <Plus className="h-4 w-4" /> Adicionar
        </button>
      </div>

      {rows.length === 0 && (
        <p className="text-sm text-muted-foreground italic">Nenhuma variação. O produto será vendido em versão única.</p>
      )}

      <div className="space-y-2">
        {rows.map((r, idx) => (
          <div key={idx} className="grid grid-cols-12 gap-2 items-end p-3 rounded-lg border border-border bg-secondary/30">
            <div className="col-span-3">
              <label className="text-[10px] font-semibold uppercase text-muted-foreground">{r.option1_name || "Opção 1"}</label>
              <input value={r.option1_value} onChange={(e) => update(idx, { option1_value: e.target.value })} placeholder="ex: Preto" className="input" />
            </div>
            <div className="col-span-3">
              <label className="text-[10px] font-semibold uppercase text-muted-foreground">{r.option2_name || "Opção 2"}</label>
              <input value={r.option2_value} onChange={(e) => update(idx, { option2_value: e.target.value })} placeholder="ex: M" className="input" />
            </div>
            <div className="col-span-2">
              <label className="text-[10px] font-semibold uppercase text-muted-foreground">SKU</label>
              <input value={r.sku} onChange={(e) => update(idx, { sku: e.target.value })} className="input" />
            </div>
            <div className="col-span-2">
              <label className="text-[10px] font-semibold uppercase text-muted-foreground">Preço</label>
              <input type="number" min="0" step="0.01" value={r.price} onChange={(e) => update(idx, { price: e.target.value })} placeholder="opcional" className="input" />
            </div>
            <div className="col-span-1">
              <label className="text-[10px] font-semibold uppercase text-muted-foreground">Estoque</label>
              <input type="number" min="0" value={r.stock} onChange={(e) => update(idx, { stock: e.target.value })} className="input" />
            </div>
            <div className="col-span-1 flex justify-end">
              <button type="button" onClick={() => remove(idx)} className="h-10 w-10 rounded-lg border border-border grid place-items-center text-destructive hover:bg-destructive/10">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
