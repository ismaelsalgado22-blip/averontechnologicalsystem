import { useEffect, useState } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { removeFile, signedUrls, uploadFile } from "@/lib/storage";
import { Button } from "@/components/ui/button";

export function PhotoUpload({
  label,
  folder,
  paths,
  onChange,
}: {
  label: string;
  folder: string;
  paths: string[];
  onChange: (paths: string[]) => void;
}) {
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!paths.length) return setUrls({});
    signedUrls(paths).then(setUrls);
  }, [paths.join("|")]);

  const handle = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy(true);
    try {
      const added: string[] = [];
      for (const file of Array.from(files)) {
        added.push(await uploadFile(file, folder));
      }
      onChange([...paths, ...added]);
      toast.success(`${added.length} foto(s) enviada(s)`);
    } catch (e: any) {
      toast.error(e?.message ?? "Falha ao enviar foto");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="kpi-label">{label}</p>
        <Button type="button" variant="secondary" size="sm" disabled={busy} asChild>
          <label className="cursor-pointer">
            {busy ? <Loader2 className="size-4 animate-spin" /> : <ImagePlus className="size-4" />}
            Adicionar
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => handle(e.target.files)}
            />
          </label>
        </Button>
      </div>
      {paths.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border px-3 py-6 text-center text-xs text-muted-foreground">
          Nenhuma foto anexada
        </p>
      ) : (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {paths.map((p) => (
            <div key={p} className="group relative overflow-hidden rounded-lg border border-border">
              {urls[p] ? (
                <img src={urls[p]} alt="Foto do equipamento" className="aspect-square w-full object-cover" />
              ) : (
                <div className="aspect-square w-full animate-pulse bg-muted" />
              )}
              <button
                type="button"
                onClick={async () => {
                  onChange(paths.filter((x) => x !== p));
                  await removeFile(p);
                }}
                className="absolute right-1 top-1 grid size-6 place-items-center rounded-md bg-background/85 text-foreground opacity-0 transition-opacity group-hover:opacity-100"
                aria-label="Remover foto"
              >
                <X className="size-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function PhotoGallery({ paths }: { paths: string[] }) {
  const [urls, setUrls] = useState<Record<string, string>>({});
  useEffect(() => {
    if (paths.length) signedUrls(paths).then(setUrls);
  }, [paths.join("|")]);
  if (!paths.length) return null;
  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
      {paths.map((p) => (
        <a
          key={p}
          href={urls[p] || "#"}
          target="_blank"
          rel="noopener"
          className="overflow-hidden rounded-lg border border-border"
        >
          {urls[p] ? (
            <img src={urls[p]} alt="Foto do atendimento" className="aspect-square w-full object-cover" />
          ) : (
            <div className="aspect-square w-full animate-pulse bg-muted" />
          )}
        </a>
      ))}
    </div>
  );
}
