import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, EmptyState } from "@/components/page-header";
import { Field } from "./clientes.index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SERVICE_CATEGORIES, brl, num } from "@/lib/format";
import { DeleteButton } from "@/components/delete-button";

export const Route = createFileRoute("/_authenticated/servicos")({
  head: () => ({
    meta: [
      { title: "Tabela de serviços | MEC Frio Refrigeração" },
      { name: "description", content: "Tabela de preços de mão de obra por categoria de equipamento e tipo de serviço." },
      { property: "og:title", content: "Tabela de serviços | MEC Frio Refrigeração" },
      { property: "og:description", content: "Preços de mão de obra usados nos orçamentos e ordens de serviço." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ServicesPage,
});

const empty = {
  name: "",
  category: SERVICE_CATEGORIES[0]!,
  description: "",
  labor_price: "0",
  estimated_time: "",
  notes: "",
  active: true,
};

function ServicesPage() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<typeof empty>(empty);

  const { data: services } = useQuery({
    queryKey: ["services"],
    queryFn: async () => {
      const { data, error } = await supabase.from("services").select("*").order("category").order("name");
      if (error) throw error;
      return data;
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      const parsed = z
        .object({
          name: z.string().trim().min(3, "Informe o nome do serviço").max(140),
          category: z.string().trim().min(2).max(80),
        })
        .safeParse(form);
      if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Dados inválidos");
      const payload = {
        name: form.name.trim(),
        category: form.category,
        description: form.description || null,
        labor_price: num(form.labor_price),
        estimated_time: form.estimated_time || null,
        notes: form.notes || null,
        active: form.active,
      };
      const { error } = editId
        ? await supabase.from("services").update(payload).eq("id", editId)
        : await supabase.from("services").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Serviço salvo");
      setOpen(false);
      setForm(empty);
      setEditId(null);
      qc.invalidateQueries({ queryKey: ["services"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Falha ao salvar serviço"),
  });

  const grouped = useMemo(() => {
    const term = q.trim().toLowerCase();
    const list = (services ?? []).filter((s: any) =>
      !term ? true : [s.name, s.category, s.description].filter(Boolean).some((v: string) => String(v).toLowerCase().includes(term)),
    );
    const map = new Map<string, any[]>();
    list.forEach((s: any) => map.set(s.category, [...(map.get(s.category) ?? []), s]));
    return [...map.entries()];
  }, [services, q]);

  const set = (k: keyof typeof empty, v: any) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="space-y-5">
      <PageHeader
        title="Tabela de serviços"
        description="Preços de mão de obra por categoria, usados nos orçamentos e ordens de serviço."
        actions={
          <Button
            onClick={() => {
              setForm(empty);
              setEditId(null);
              setOpen(true);
            }}
          >
            <Plus className="size-4" />
            Novo serviço
          </Button>
        }
      />

      <div className="relative">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar serviço ou categoria"
          className="pl-9"
          maxLength={80}
        />
      </div>

      {grouped.length === 0 ? (
        <EmptyState title="Nenhum serviço cadastrado" description="Monte sua tabela de preços de mão de obra." />
      ) : (
        <div className="space-y-5">
          {grouped.map(([cat, list]) => (
            <div key={cat} className="space-y-2">
              <h2 className="kpi-label">{cat}</h2>
              <div className="grid gap-2 md:grid-cols-2">
                {list.map((s: any) => (
                  <div key={s.id} className="surface-panel flex items-start justify-between gap-3 p-4">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">
                        {s.name} {!s.active && <span className="text-xs text-muted-foreground">(inativo)</span>}
                      </p>
                      {s.description && <p className="text-xs text-muted-foreground">{s.description}</p>}
                      {s.estimated_time && (
                        <p className="text-xs text-muted-foreground">Tempo estimado: {s.estimated_time}</p>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="font-display text-sm font-bold text-primary">{brl(s.labor_price)}</span>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => {
                          setForm({
                            name: s.name,
                            category: s.category,
                            description: s.description ?? "",
                            labor_price: String(s.labor_price ?? 0),
                            estimated_time: s.estimated_time ?? "",
                            notes: s.notes ?? "",
                            active: s.active,
                          });
                          setEditId(s.id);
                          setOpen(true);
                        }}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <DeleteButton
                        table="services"
                        id={s.id}
                        what="Serviço"
                        name={s.name}
                        invalidate={["services"]}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{editId ? "Editar serviço" : "Novo serviço"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Field label="Nome do serviço *">
              <Input value={form.name} maxLength={140} onChange={(e) => set("name", e.target.value)} />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Categoria *">
                <Select value={form.category ?? ""} onValueChange={(v) => set("category", v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SERVICE_CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Valor da mão de obra (R$)">
                <Input
                  inputMode="decimal"
                  value={form.labor_price}
                  onChange={(e) => set("labor_price", e.target.value)}
                />
              </Field>
              <Field label="Tempo estimado">
                <Input
                  value={form.estimated_time}
                  maxLength={60}
                  onChange={(e) => set("estimated_time", e.target.value)}
                  placeholder="Ex.: 2 horas"
                />
              </Field>
              <Field label="Serviço ativo">
                <div className="flex h-9 items-center">
                  <Switch checked={form.active} onCheckedChange={(v) => set("active", v)} />
                </div>
              </Field>
            </div>
            <Field label="Descrição">
              <Textarea value={form.description} rows={3} maxLength={600} onChange={(e) => set("description", e.target.value)} />
            </Field>
            <Field label="Observações">
              <Textarea value={form.notes} rows={2} maxLength={600} onChange={(e) => set("notes", e.target.value)} />
            </Field>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={() => save.mutate()} disabled={save.isPending}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
