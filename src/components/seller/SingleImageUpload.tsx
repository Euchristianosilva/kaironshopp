import { useRef, useState } from "react";
import imageCompression from "browser-image-compression";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Upload, X, ImagePlus } from "lucide-react";
import { toast } from "sonner";

const ACCEPTED = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const MAX_MB = 10;

type Props = {
  /** Used as the top-level folder in the `product-images` bucket so RLS allows the write. */
  sellerId: string;
  /** Sub-folder inside the seller folder (e.g. "branding/logo"). */
  folder: string;
  value: string | null | undefined;
  onChange: (url: string | null) => void;
  aspect?: "square" | "banner" | "free";
  label?: string;
};

const withTimeout = <T,>(p: Promise<T>, ms: number, label: string): Promise<T> =>
  Promise.race([p, new Promise<T>((_, rej) => setTimeout(() => rej(new Error(`timeout: ${label}`)), ms))]);

export function SingleImageUpload({ sellerId, folder, value, onChange, aspect = "square", label }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);

  const upload = async (file: File) => {
    const ok = ACCEPTED.includes(file.type.toLowerCase()) || /\.(jpe?g|png|webp)$/i.test(file.name);
    if (!ok) return toast.error("Formato não suportado (JPG, PNG ou WEBP)");
    if (file.size > MAX_MB * 1024 * 1024) return toast.error(`Máximo ${MAX_MB}MB`);

    setBusy(true);
    setProgress(10);
    try {
      let toUpload: File | Blob = file;
      let contentType = file.type || "image/jpeg";
      try {
        const compressed = await withTimeout(
          imageCompression(file, { maxSizeMB: 1.2, maxWidthOrHeight: 1600, useWebWorker: false, fileType: file.type }),
          15000,
          "compressão",
        );
        toUpload = compressed;
        contentType = compressed.type || contentType;
      } catch (e) {
        console.warn("[SingleImageUpload] compressão ignorada:", e);
      }
      setProgress(45);

      const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
      const path = `${sellerId}/${folder}/${crypto.randomUUID()}.${ext}`;

      const { error: upErr } = await withTimeout(
        supabase.storage.from("product-images").upload(path, toUpload, { contentType, upsert: true, cacheControl: "31536000" }),
        60000,
        "upload",
      );
      if (upErr) throw upErr;
      setProgress(80);

      const { data: signed, error: sErr } = await withTimeout(
        supabase.storage.from("product-images").createSignedUrl(path, 60 * 60 * 24 * 365 * 10),
        15000,
        "url",
      );
      if (sErr || !signed?.signedUrl) throw sErr || new Error("URL não gerada");

      onChange(signed.signedUrl);
      setProgress(100);
      toast.success("Imagem enviada");
    } catch (e: any) {
      console.error("[SingleImageUpload] erro:", e);
      toast.error(e?.message || "Falha no upload");
    } finally {
      setBusy(false);
      setTimeout(() => setProgress(0), 600);
    }
  };

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (f) void upload(f);
  };

  const boxClass =
    aspect === "banner"
      ? "aspect-[4/1] w-full"
      : aspect === "free"
        ? "min-h-32 w-full"
        : "h-32 w-32";

  return (
    <div className="space-y-2">
      {label && <div className="text-sm font-semibold">{label}</div>}
      <div className={`relative ${boxClass} rounded-xl border-2 border-dashed border-border bg-secondary/30 overflow-hidden grid place-items-center`}>
        {value ? (
          <>
            <img src={value} alt="" className="absolute inset-0 w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => onChange(null)}
              className="absolute top-2 right-2 p-1.5 rounded-full bg-black/70 text-white hover:bg-black"
              title="Remover"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </>
        ) : (
          <div className="text-muted-foreground flex flex-col items-center gap-1 text-xs">
            <ImagePlus className="h-6 w-6" />
            <span>Sem imagem</span>
          </div>
        )}
        {busy && (
          <div className="absolute inset-0 bg-black/50 grid place-items-center text-white">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        )}
      </div>
      {busy && (
        <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
          <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
        </div>
      )}
      <div className="flex gap-2">
        <input ref={inputRef} type="file" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" hidden onChange={onPick} />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="h-9 px-3 inline-flex items-center gap-2 rounded-md bg-gradient-brand text-primary-foreground text-sm font-semibold disabled:opacity-60"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          {value ? "Trocar imagem" : "Selecionar imagem"}
        </button>
        <span className="text-xs text-muted-foreground self-center">JPG, PNG ou WEBP · até {MAX_MB}MB</span>
      </div>
    </div>
  );
}
