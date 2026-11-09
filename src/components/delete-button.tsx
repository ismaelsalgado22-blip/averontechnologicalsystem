import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type Props = {
  table: string;
  id: string;
  what: string;
  name?: string | null;
  invalidate?: string[];
  onDeleted?: () => void;
  size?: "sm" | "icon";
  withLabel?: boolean;
};

export function DeleteButton({
  table,
  id,
  what,
  name,
  invalidate = [],
  onDeleted,
  size = "icon",
  withLabel = false,
}: Props) {
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();

  const remove = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.from(table as never).delete().eq("id", id).select("id");
      if (error) throw error;
      if (!data?.length) throw new Error("O registro não foi excluído. Verifique seu acesso.");
    },
    onSuccess: () => {
      toast.success(`${what} excluído com sucesso`);
      setOpen(false);
      for (const key of invalidate) qc.invalidateQueries({ queryKey: [key] });
      onDeleted?.();
    },
    onError: (e: unknown) => {
      const msg = e instanceof Error ? e.message : "";
      toast.error(
        msg.toLowerCase().includes("foreign key") || msg.includes("23503")
          ? `Não é possível excluir: existem registros vinculados a este ${what.toLowerCase()}.`
          : `Não foi possível excluir. ${msg}`,
      );
    },
  });

  return (
    <>
      <Button
        size={withLabel ? "sm" : size}
        variant={withLabel ? "outline" : "ghost"}
        title={`Excluir ${what.toLowerCase()}`}
        aria-label={`Excluir ${what.toLowerCase()}`}
        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
        onClick={() => setOpen(true)}
      >
        <Trash2 className="size-4" />
        {withLabel && "Excluir"}
      </Button>

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir {what.toLowerCase()}?</AlertDialogTitle>
            <AlertDialogDescription>
              {name ? `"${name}" será removido` : "O registro será removido"} permanentemente. Esta
              ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={remove.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                remove.mutate();
              }}
              disabled={remove.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {remove.isPending && <Loader2 className="size-4 animate-spin" />}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
