import { useCallback, useState } from "react";
import { Download, ExternalLink, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { PdfResult } from "@/lib/pdf";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/**
 * Mostra o documento gerado dentro do próprio sistema, com botões de baixar
 * e abrir em nova aba (acionados pelo clique do usuário, sem bloqueio de pop-up).
 */
export function usePdfViewer() {
  const [doc, setDoc] = useState<PdfResult | null>(null);
  const [busy, setBusy] = useState(false);

  const close = useCallback(() => {
    setDoc((current) => {
      if (current) setTimeout(() => URL.revokeObjectURL(current.url), 1000);
      return null;
    });
  }, []);

  const show = useCallback(async (build: () => Promise<PdfResult>) => {
    setBusy(true);
    try {
      const result = await build();
      setDoc(result);
    } catch (e: any) {
      toast.error(e?.message ?? "Não foi possível gerar o documento");
    } finally {
      setBusy(false);
    }
  }, []);

  const viewer = (
    <>
      {busy && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-background/70">
          <div className="surface-panel flex items-center gap-3 px-5 py-4 text-sm">
            <Loader2 className="size-4 animate-spin text-primary" />
            Gerando documento…
          </div>
        </div>
      )}
      <Dialog open={!!doc} onOpenChange={(o) => !o && close()}>
        <DialogContent className="max-h-[92vh] max-w-4xl">
          <DialogHeader>
            <DialogTitle className="truncate">{doc?.filename ?? "Documento"}</DialogTitle>
          </DialogHeader>
          {doc && (
            <>
              <iframe
                src={doc.url}
                title={doc.filename}
                className="h-[65vh] w-full rounded-lg border border-border bg-white"
              />
              <DialogFooter className="gap-2 sm:justify-between">
                <p className="text-xs text-muted-foreground">
                  Se a prévia não carregar no celular, use “Baixar PDF”.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" onClick={() => window.open(doc.url, "_blank", "noopener")}>
                    <ExternalLink className="size-4" />
                    Abrir em nova aba
                  </Button>
                  <Button asChild>
                    <a href={doc.url} download={doc.filename}>
                      <Download className="size-4" />
                      Baixar PDF
                    </a>
                  </Button>
                </div>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );

  return { show, viewer, busy };
}
