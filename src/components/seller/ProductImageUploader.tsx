import { useCallback, useEffect, useRef, useState } from "react";
import imageCompression from "browser-image-compression";
import { supabase } from "@/integrations/supabase/client";
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, rectSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Upload, X, Star, GripVertical, ImagePlus, Loader2 } from "lucide-react";
import { toast } from "sonner";

export type UploadedImage = {
  id: string;
  url: string;
  storage_path: string;
  is_primary: boolean;
};

type PendingImage = {
  id: string;
  previewUrl: string;
  fileName: string;
};

const MAX_IMAGES = 10;
const MAX_SIZE_MB = 10;
const ACCEPTED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const ACCEPT_ATTR = ".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp";

type Props = {
  sellerId: string;
  value: UploadedImage[];
  onChange: (next: UploadedImage[]) => void;
};

export function ProductImageUploader({ sellerId, value, onChange }: Props) {
  const [pending, setPending] = useState<PendingImage[]>([]);
  const [drag, setDrag] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  useEffect(() => {
    if (value.length === 0) return;
    if (!value.some((i) => i.is_primary)) {
      onChange(value.map((i, idx) => ({ ...i, is_primary: idx === 0 })));
    }
  }, [value, onChange]);

  // cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      pending.forEach((p) => URL.revokeObjectURL(p.previewUrl));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const upload = useCallback(
    async (files: File[]) => {
      const slots = MAX_IMAGES - value.length - pending.length;
      if (slots <= 0) {
        toast.error(`Máximo de ${MAX_IMAGES} imagens`);
        return;
      }
      const list = files.slice(0, slots).filter((f) => {
        const ok = ACCEPTED_TYPES.includes(f.type.toLowerCase()) || /\.(jpe?g|png|webp)$/i.test(f.name);
        if (!ok) toast.error(`"${f.name}": formato não suportado (use JPG, PNG ou WEBP)`);
        return ok;
      });
      if (list.length === 0) return;

      const withTimeout = <T,>(p: Promise<T>, ms: number, label: string): Promise<T> =>
        Promise.race([
          p,
          new Promise<T>((_, rej) => setTimeout(() => rej(new Error(`timeout: ${label}`)), ms)),
        ]);

      const added: UploadedImage[] = [];

      for (const file of list) {
        const pendingItem: PendingImage = {
          id: crypto.randomUUID(),
          previewUrl: URL.createObjectURL(file),
          fileName: file.name,
        };
        setPending((p) => [...p, pendingItem]);

        try {
          if (file.size > MAX_SIZE_MB * 1024 * 1024) {
            toast.error(`"${file.name}": máximo ${MAX_SIZE_MB}MB`);
            continue;
          }

          let toUpload: File | Blob = file;
          let contentType = file.type || "image/jpeg";
          // Compressão best-effort com timeout; sem web worker (evita travamentos em dev/preview)
          try {
            const compressed = await withTimeout(
              imageCompression(file, {
                maxSizeMB: 1.5,
                maxWidthOrHeight: 1920,
                useWebWorker: false,
                fileType: file.type,
              }),
              15000,
              "compressão",
            );
            toUpload = compressed;
            contentType = compressed.type || contentType;
          } catch (err) {
            console.warn("[ProductImageUploader] compressão ignorada:", err);
          }

          const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
          const path = `${sellerId}/${crypto.randomUUID()}.${ext}`;

          const { error: upErr } = await withTimeout(
            supabase.storage
              .from("product-images")
              .upload(path, toUpload, { contentType, upsert: true, cacheControl: "31536000" }),
            60000,
            "upload",
          );

          if (upErr) {
            console.error("[ProductImageUploader] upload error:", upErr);
            const msg = upErr.message?.toLowerCase() ?? "";
            if (msg.includes("row-level security") || msg.includes("not authorized") || msg.includes("permission")) {
              toast.error(`"${file.name}": permissão negada. Verifique se a loja está ativa.`);
            } else if (msg.includes("bucket") && msg.includes("not found")) {
              toast.error('Bucket "product-images" não encontrado.');
            } else if (msg.includes("payload too large") || msg.includes("exceeded")) {
              toast.error(`"${file.name}": arquivo muito grande.`);
            } else {
              toast.error(`"${file.name}": ${upErr.message || "falha no upload"}`);
            }
            continue;
          }

          const { data: signed, error: sErr } = await withTimeout(
            supabase.storage.from("product-images").createSignedUrl(path, 60 * 60 * 24 * 365 * 10),
            15000,
            "signed url",
          );

          if (sErr || !signed?.signedUrl) {
            console.error("[ProductImageUploader] signed URL error:", sErr);
            toast.error(`"${file.name}": imagem enviada mas URL não gerada`);
            continue;
          }

          added.push({
            id: crypto.randomUUID(),
            url: signed.signedUrl,
            storage_path: path,
            is_primary: false,
          });
        } catch (e: any) {
          console.error("[ProductImageUploader] falha:", e);
          toast.error(`"${file.name}": ${e?.message ?? "falha no upload"}`);
        } finally {
          // Sempre limpa o preview pendente (sucesso, erro ou timeout)
          setPending((p) => p.filter((x) => x.id !== pendingItem.id));
          URL.revokeObjectURL(pendingItem.previewUrl);
        }
      }

      if (added.length > 0) {
        const next = [...value, ...added];
        if (!next.some((i) => i.is_primary) && next[0]) next[0].is_primary = true;
        onChange(next);
        toast.success(`${added.length} imagem(ns) enviada(s)`);
      }
    },
    [sellerId, value, pending.length, onChange],
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

  const busy = pending.length > 0;
  const total = value.length + pending.length;

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
          accept={ACCEPT_ATTR}
          multiple
          hidden
          onChange={onPick}
          disabled={total >= MAX_IMAGES}
        />
        <ImagePlus className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
        <p className="text-sm font-medium">Arraste imagens aqui ou</p>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={total >= MAX_IMAGES}
          className="mt-2 inline-flex items-center gap-2 h-9 px-4 rounded-lg bg-gradient-brand text-primary-foreground text-sm font-semibold disabled:opacity-60"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          {busy ? "Enviando..." : "Selecionar imagens"}
        </button>
        <p className="text-xs text-muted-foreground mt-2">
          {total}/{MAX_IMAGES} · JPG, PNG ou WEBP · até {MAX_SIZE_MB}MB cada
        </p>
      </div>

      {(value.length > 0 || pending.length > 0) && (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={value.map((i) => i.id)} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 mt-4">
              {value.map((img) => (
                <ImageTile key={img.id} img={img} onRemove={() => remove(img)} onPrimary={() => setPrimary(img)} />
              ))}
              {pending.map((p) => (
                <div key={p.id} className="relative aspect-square rounded-lg overflow-hidden border border-border bg-secondary/30">
                  <img src={p.previewUrl} alt={p.fileName} className="w-full h-full object-cover opacity-60" />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                    <Loader2 className="h-6 w-6 text-white animate-spin" />
                  </div>
                </div>
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
      <img src={img.url} alt="" className="w-full h-full object-cover" loading="lazy" />
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
