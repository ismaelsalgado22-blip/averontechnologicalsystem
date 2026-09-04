import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, EmptyState } from "@/components/page-header";
import { PhotoUpload } from "@/components/photo-upload";
import { Field } from "./clientes.index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EQUIPMENT_TYPES, dateBR } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/equipamentos")({
  head: () => ({
    meta: [
      { title: "Equipamentos | MEC Frio Refrigeração" },
      { name: "description", content: "Cadastro técnico de equipamentos de refrigeração por cliente, com fotos e histórico." },
      { property: "og:title", content: "Equipamentos | MEC Frio Refrigeração" },
      { property: "og:description", content: "Marca, modelo, número de série, gás refrigerante e fotos de cada equipamento." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: EquipmentPage,
});

const empty = {
  client_id: "",
  type: "Geladeira Expositora",
  brand: "",
  model: "",
  serial_number: "",
  asset_tag: "",
  capacity: "",
  voltage: "",
  refrigerant: "",
  refrigerant_amount: "",
  compressor: "",
  install_location: "",
  install_date: "",
  condition: "",
  notes: "",
  photos: [] as string[],
};

const schema = z.object({
  client_id: z.string().uuid("Selecione o cliente"),
  type: z.string().trim().min(2).max(80),
});

function EquipmentPage() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<typeof empty>(empty);
  const [editId, setEditId] = useState<string | null>(null);

  const { data: clients } = useQuery({
    queryKey: ["clients"],
    queryFn: async () => (await supabase.from("clients").select("id, name").order("name")).data ?? [],
  });

  const { data: items } = useQuery({
    queryKey: ["equipment"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("equipment")
        .select("*, clients(name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      const parsed = schema.safeParse(form);
      if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Dados inválidos");
      const payload: any = Object.fromEntries(
        Object.entries(form).map(([k, v]) => [k, v === "" ? null : v]),
      );
      payload.photos = form.photos;
      const { error } = editId
        ? await supabase.from("equipment").update(payload).eq("id", editId)
        : await supabase.from("equipment").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(editId ? "Equipamento atualizado" : "Equipamento cadastrado");
      setOpen(false);
      setForm(empty);
      setEditId(null);
      qc.invalidateQueries({ queryKey: ["equipment"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Falha ao salvar equipamento"),
  });

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return items ?? [];
    return (items ?? []).filter((e: any) =>
      [e.type, e.brand, e.model, e.serial_number, e.clients?.name, e.install_location]
        .filter(Boolean)
        .some((v: string) => String(v).toLowerCase().includes(term)),
    );
  }, [items, q]);

  const set = (k: keyof typeof empty, v: any) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="space-y-5">
      <PageHeader
        title="Equipamentos"
        description="Ficha técnica de cada equipamento atendido, com fotos e histórico."
        actions={
          <Button
            onClick={() => {
              setForm(empty);
              setEditId(null);
              setOpen(true);
            }}
          >
            <Plus className="size-4" />
            Novo equipamento
          </Button>
        }
      />

      <div className="relative">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por tipo, marca, modelo, série ou cliente"
          className="pl-9"
          maxLength={80}
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="Nenhum equipamento cadastrado" description="Vincule equipamentos aos clientes para montar o histórico técnico." />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((e: any) => (
            <div key={e.id} className="surface-panel space-y-2 p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="kpi-label">{e.type}</p>
                  <p className="truncate font-display text-base font-semibold">
                    {[e.brand, e.model].filter(Boolean).join(" ") || "Sem marca informada"}
                  </p>
                  <Link
                    to="/clientes/$id"
                    params={{ id: e.client_id }}
                    className="text-xs font-semibold text-primary"
                  >
                    {e.clients?.name}
                  </Link>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => {
                    const { id, created_at, updated_at, clients, ...rest } = e;
                    setForm({
                      ...empty,
                      ...Object.fromEntries(Object.entries(rest).map(([k, v]) => [k, v ?? ""])),
                      photos: e.photos ?? [],
                    } as typeof empty);
                    setEditId(e.id);
                    setOpen(true);
                  }}
                >
                  <Pencil className="size-4" />
                </Button>
              </div>
              <div className="space-y-0.5 text-xs text-muted-foreground">
                {e.serial_number && <p>Série: {e.serial_number}</p>}
                {e.refrigerant && <p>Gás: {e.refrigerant} {e.refrigerant_amount ?? ""}</p>}
                {e.install_location && <p>Local: {e.install_location}</p>}
                {e.install_date && <p>Instalado em {dateBR(e.install_date)}</p>}
                {e.condition && <p>Estado: {e.condition}</p>}
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editId ? "Editar equipamento" : "Novo equipamento"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Cliente *">
                <Select value={form.client_id} onValueChange={(v) => set("client_id", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {(clients ?? []).map((c: any) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Tipo de equipamento *">
                <Select value={form.type} onValueChange={(v) => set("type", v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EQUIPMENT_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Marca">
                <Input value={form.brand} maxLength={80} onChange={(e) => set("brand", e.target.value)} />
              </Field>
              <Field label="Modelo">
                <Input value={form.model} maxLength={80} onChange={(e) => set("model", e.target.value)} />
              </Field>
              <Field label="Número de série">
                <Input value={form.serial_number} maxLength={80} onChange={(e) => set("serial_number", e.target.value)} />
              </Field>
              <Field label="Patrimônio / etiqueta">
                <Input value={form.asset_tag} maxLength={60} onChange={(e) => set("asset_tag", e.target.value)} />
              </Field>
              <Field label="Capacidade">
                <Input value={form.capacity} maxLength={60} onChange={(e) => set("capacity", e.target.value)} />
              </Field>
              <Field label="Tensão">
                <Input value={form.voltage} maxLength={30} onChange={(e) => set("voltage", e.target.value)} />
              </Field>
              <Field label="Gás refrigerante">
                <Input value={form.refrigerant} maxLength={40} onChange={(e) => set("refrigerant", e.target.value)} />
              </Field>
              <Field label="Quantidade de gás">
                <Input
                  value={form.refrigerant_amount}
                  maxLength={40}
                  onChange={(e) => set("refrigerant_amount", e.target.value)}
                />
              </Field>
              <Field label="Compressor">
                <Input value={form.compressor} maxLength={80} onChange={(e) => set("compressor", e.target.value)} />
              </Field>
              <Field label="Local de instalação">
                <Input
                  value={form.install_location}
                  maxLength={120}
                  onChange={(e) => set("install_location", e.target.value)}
                />
              </Field>
              <Field label="Data de instalação">
                <Input type="date" value={form.install_date} onChange={(e) => set("install_date", e.target.value)} />
              </Field>
              <Field label="Estado de conservação">
                <Input value={form.condition} maxLength={80} onChange={(e) => set("condition", e.target.value)} />
              </Field>
            </div>
            <Field label="Observações técnicas">
              <Textarea value={form.notes} rows={3} maxLength={1000} onChange={(e) => set("notes", e.target.value)} />
            </Field>
            <PhotoUpload
              label="Fotos do equipamento"
              folder="equipamentos"
              paths={form.photos}
              onChange={(p) => set("photos", p)}
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={() => save.mutate()} disabled={save.isPending}>
              Salvar equipamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
