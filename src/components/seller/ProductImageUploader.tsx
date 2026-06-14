import { useCallback, useEffect, useRef, useState } from "react";
import imageCompression from "browser-image-compression";
import { supabase } from "@/integrations/supabase/client";
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, rectSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Upload, X, Star, GripVertical, ImagePlus, Loader2 } from "lucide-react";
import { toast } from "sonner";

export type UploadedImage = {
  id: string; // local id for dnd
  url: string;
  storage_path: string;
  is_primary: boolean;
};

const MAX_IMAGES = 10;
const MAX_SIZE_MB = 1;

type Props = {
  sellerId: string;
  value: UploadedImage[];
  onChange: (next: UploadedImage[]) => void;
};

export function ProductImageUploader({ sellerId, value, onChange }: Props) {
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  // garantir que sempre exista uma primária
  useEffect(() => {
    if (value.length === 0) return;
    if (!value.some((i) => i.is_primary)) {
      onChange(value.map((i, idx) => ({ ...i, is_primary: idx === 0 })));
    }
  }, [value, onChange]);

  const upload = useCallback(
    async (files: File[]) => {
      const slots = MAX_IMAGES - value.length;
      if (slots <= 0) {
        toast.error(`Máximo de ${MAX_IMAGES} imagens`);
        return;
      }
      const list = files.slice(0, slots).filter((f) => f.type.startsWith("image/"));
      if (list.length === 0) return;

      setBusy(true);
      const added: UploadedImage[] = [];
      try {
        for (const file of list) {
          if (file.size > 10 * 1024 * 1024) {
            toast.error(`"${file.name}": arquivo muito grande (máx 10MB antes da compressão)`);
            continue;
          }
          let compressed: File | Blob = file;
          try {
            compressed = await imageCompression(file, {
              maxSizeMB: MAX_SIZE_MB,
              maxWidthOrHeight: 1600,
              useWebWorker: true,
            });
          } catch {
            // se a compressão falhar, segue com o arquivo original
          }
          const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
          const path = `${sellerId}/${crypto.randomUUID()}.${ext}`;
          const { error: upErr } = await supabase.storage
            .from("product-images")
            .upload(path, compressed, { contentType: file.type || "image/jpeg", upsert: true });
          if (upErr) {
            const msg = upErr.message?.toLowerCase() ?? "";
            if (msg.includes("row-level security") || msg.includes("not authorized")) {
              throw new Error("Permissão negada para enviar imagem. Verifique se a loja está ativa.");
            }
            if (msg.includes("bucket") && msg.includes("not found")) {
              throw new Error('Bucket "product-images" não encontrado.');
            }
            if (msg.includes("payload too large") || msg.includes("exceeded")) {
              throw new Error("Arquivo muito grande.");
            }
            throw new Error(upErr.message || "Erro ao enviar imagem.");
          }
          // Bucket é privado neste workspace — gera URL assinada de longa duração
          const { data: signed, error: sErr } = await supabase.storage
            .from("product-images")
            .createSignedUrl(path, 60 * 60 * 24 * 365);
          if (sErr || !signed?.signedUrl) {
            throw new Error("Imagem enviada, mas não foi possível gerar a URL: " + (sErr?.message ?? ""));
          }
          added.push({
            id: crypto.randomUUID(),
            url: signed.signedUrl,
            storage_path: path,
            is_primary: false,
          });
        }
        if (added.length === 0) return;
        const next = [...value, ...added];
        if (!next.some((i) => i.is_primary) && next[0]) next[0].is_primary = true;
        onChange(next);
        toast.success(`${added.length} imagem(ns) enviada(s)`);
      } catch (e: any) {
        console.error("[ProductImageUploader] upload error:", e);
        toast.error(e?.message ?? "Falha no upload");
      } finally {
        setBusy(false);
      }
    },
    [sellerId, value, onChange],
  );


  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDrag(false);
    void upload(Array.from(e.dataTransfer.files));
  };

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    void upload(Array.from(e.target.files ?? []));
    e.target.value = "";
  };

  const remove = async (img: UploadedImage) => {
    try {
      await supabase.storage.from("product-images").remove([img.storage_path]);
    } catch {/* ignore */}
    const next = value.filter((i) => i.id !== img.id);
    if (img.is_primary && next[0]) next[0].is_primary = true;
    onChange(next);
  };

  const setPrimary = (img: UploadedImage) => {
    onChange(value.map((i) => ({ ...i, is_primary: i.id === img.id })));
  };

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIdx = value.findIndex((i) => i.id === active.id);
    const newIdx = value.findIndex((i) => i.id === over.id);
    onChange(arrayMove(value, oldIdx, newIdx));
  };

  return (
    <div>
      <div
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={onDrop}
        className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors ${
          drag ? "border-primary bg-primary/5" : "border-border bg-secondary/20"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={onPick}
          disabled={busy || value.length >= MAX_IMAGES}
        />
        <ImagePlus className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
        <p className="text-sm font-medium">Arraste imagens aqui ou</p>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy || value.length >= MAX_IMAGES}
          className="mt-2 inline-flex items-center gap-2 h-9 px-4 rounded-lg bg-gradient-brand text-primary-foreground text-sm font-semibold disabled:opacity-60"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          Selecionar imagens
        </button>
        <p className="text-xs text-muted-foreground mt-2">
          {value.length}/{MAX_IMAGES} · até {MAX_SIZE_MB}MB cada · compressão automática
        </p>
      </div>

      {value.length > 0 && (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={value.map((i) => i.id)} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 mt-4">
              {value.map((img) => (
                <ImageTile key={img.id} img={img} onRemove={() => remove(img)} onPrimary={() => setPrimary(img)} />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
      {value.length > 0 && (
        <p className="text-xs text-muted-foreground mt-2">
          Arraste para reordenar · clique na ⭐ para definir a imagem principal
        </p>
      )}
    </div>
  );
}

function ImageTile({ img, onRemove, onPrimary }: { img: UploadedImage; onRemove: () => void; onPrimary: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: img.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };
  return (
    <div ref={setNodeRef} style={style} className="relative group aspect-square rounded-lg overflow-hidden border border-border bg-secondary/30">
      <img src={img.url} alt="" className="w-full h-full object-cover" />
      {img.is_primary && (
        <div className="absolute top-1 left-1 bg-primary text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded">
          PRINCIPAL
        </div>
      )}
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="absolute top-1 right-8 p-1 rounded bg-black/60 text-white opacity-0 group-hover:opacity-100 cursor-grab"
        title="Arrastar"
      >
        <GripVertical className="h-3 w-3" />
      </button>
      <button
        type="button"
        onClick={onRemove}
        className="absolute top-1 right-1 p-1 rounded bg-black/60 text-white opacity-0 group-hover:opacity-100"
        title="Remover"
      >
        <X className="h-3 w-3" />
      </button>
      {!img.is_primary && (
        <button
          type="button"
          onClick={onPrimary}
          className="absolute bottom-1 left-1 p-1 rounded bg-black/60 text-white opacity-0 group-hover:opacity-100"
          title="Tornar principal"
        >
          <Star className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}
