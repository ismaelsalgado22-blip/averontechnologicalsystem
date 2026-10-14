import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileDown, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, StatusPill, EmptyState } from "@/components/page-header";
import { WhatsAppButton } from "@/components/whatsapp-button";
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
import { dateBR, today, warrantyState } from "@/lib/format";
import { warrantyPdf } from "@/lib/pdf";
import { useCompany, FALLBACK_COMPANY, companyLogo } from "@/hooks/use-company";
import { usePdfViewer } from "@/components/pdf-view";
import { DeleteButton } from "@/components/delete-button";

export const Route = createFileRoute("/_authenticated/garantias")({
  head: () => ({
    meta: [
      { title: "Garantias | Averon" },
      { name: "description", content: "Emita certificados de garantia com QR Code de validação e controle de vencimento." },
      { property: "og:title", content: "Garantias | Averon" },
      { property: "og:description", content: "Certificados de garantia numerados, com prazo, condições e validação online." },
      { name: "robots", content: "noindex" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: WarrantiesPage,
});

const emptyForm = {
  client_id: "",
  equipment_id: "",
  work_order_id: "",
  service_performed: "",
  parts_used: "",
  service_date: today(),
  start_date: today(),
  days: "90",
  conditions: "",
  exclusions: "",
  notes: "",
};

function WarrantiesPage() {
  const qc = useQueryClient();
  const { data: company } = useCompany();
  const pdf = usePdfViewer();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const { data: warranties } = useQuery({
    queryKey: ["warranties"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("warranties")
        .select("*, clients(name, phone, whatsapp), equipment(type, brand, model)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  const { data: clients } = useQuery({
    queryKey: ["clients"],
    queryFn: async () => (await supabase.from("clients").select("id, name, phone, whatsapp").order("name")).data ?? [],
  });
  const { data: equipment } = useQuery({
    queryKey: ["equipment", "all"],
    queryFn: async () => (await supabase.from("equipment").select("id, client_id, type, brand, model")).data ?? [],
  });
  const { data: orders } = useQuery({
    queryKey: ["work_orders", "list"],
    queryFn: async () =>
      (await supabase.from("work_orders").select("id, number, client_id, executed_service").order("created_at", { ascending: false }))
        .data ?? [],
  });

  const create = useMutation({
    mutationFn: async () => {
      if (!form.client_id) throw new Error("Selecione o cliente");
      const days = Number(form.days);
      if (!days || days < 1) throw new Error("Informe o prazo de garantia em dias");
      const { error } = await supabase.from("warranties").insert({
        client_id: form.client_id,
        equipment_id: form.equipment_id || null,
        work_order_id: form.work_order_id || null,
        service_performed: form.service_performed || null,
        parts_used: form.parts_used || null,
        service_date: form.service_date,
        start_date: form.start_date,
        days,
        conditions: form.conditions || company?.warranty_terms || null,
        exclusions: form.exclusions || null,
        notes: form.notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Certificado de garantia emitido");
      setOpen(false);
      setForm(emptyForm);
      qc.invalidateQueries({ queryKey: ["warranties"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Falha ao emitir garantia"),
  });

  const buildPdf = async (w: any) => {
    const { data: client } = await supabase.from("clients").select("*").eq("id", w.client_id).maybeSingle();
    const eq = w.equipment_id
      ? (await supabase.from("equipment").select("*").eq("id", w.equipment_id).maybeSingle()).data
      : null;
    return await warrantyPdf({
      company: company ?? FALLBACK_COMPANY,
      logo: await companyLogo(company),
      warranty: w,
      client,
      equipment: eq,
      validateUrl: `${window.location.origin}/validar-garantia?numero=${encodeURIComponent(w.number)}`,
    });
  };

  const downloadPdf = (item: any) => pdf.show(() => buildPdf(item));

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return (warranties ?? []).filter((w: any) =>
      !term
        ? true
        : [w.number, w.clients?.name, w.service_performed]
            .filter(Boolean)
            .some((v: string) => String(v).toLowerCase().includes(term)),
    );
  }, [warranties, q]);

  const set = (k: keyof typeof emptyForm, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const clientEquip = (equipment ?? []).filter((e: any) => e.client_id === form.client_id);
  const clientOrders = (orders ?? []).filter((o: any) => o.client_id === form.client_id);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Garantias"
        description="Certificados numerados com QR Code de validação pública."
        actions={
          <Button
            onClick={() => {
              setForm(emptyForm);
              setOpen(true);
            }}
          >
            <Plus className="size-4" />
            Emitir garantia
          </Button>
        }
      />

      <div className="relative">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por número, cliente ou serviço"
          className="pl-9"
          maxLength={80}
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="Nenhuma garantia emitida" description="Emita o certificado após concluir um serviço." />
      ) : (
        <div className="space-y-3">
          {filtered.map((w: any) => {
            const st = warrantyState(w.end_date);
            return (
              <div key={w.id} className="surface-panel p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-display text-base font-bold">{w.number}</span>
                      <StatusPill label={st.label} tone={st.tone} />
                    </div>
                    <p className="text-sm font-semibold">{w.clients?.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {w.days} dias • {dateBR(w.start_date)} até {dateBR(w.end_date)}
                      {w.equipment ? ` • ${w.equipment.type}` : ""}
                    </p>
                    {w.service_performed && (
                      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{w.service_performed}</p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={() => downloadPdf(w)}>
                      <FileDown className="size-4" />
                      Certificado
                    </Button>
                    <WhatsAppButton
                      phone={w.clients?.whatsapp ?? w.clients?.phone}
                      template="garantia"
                      vars={{ nome: w.clients?.name, documento: w.number, data: dateBR(w.end_date) }}
                    />
                    <DeleteButton
                      table="warranties"
                      id={w.id}
                      what="Garantia"
                      name={w.number}
                      invalidate={["warranties", "dashboard"]}
                      withLabel
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Emitir certificado de garantia</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Cliente *">
                <Select
                  value={form.client_id}
                  onValueChange={(v) => setForm((f) => ({ ...f, client_id: v, equipment_id: "", work_order_id: "" }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
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
              <Field label="Equipamento">
                <Select value={form.equipment_id ?? ""} onValueChange={(v) => set("equipment_id", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {clientEquip.map((e: any) => (
                      <SelectItem key={e.id} value={e.id}>
                        {[e.type, e.brand, e.model].filter(Boolean).join(" ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Ordem de serviço">
                <Select
                  value={form.work_order_id}
                  onValueChange={(v) => {
                    const o = clientOrders.find((x: any) => x.id === v);
                    setForm((f) => ({ ...f, work_order_id: v, service_performed: o?.executed_service ?? f.service_performed }));
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {clientOrders.map((o: any) => (
                      <SelectItem key={o.id} value={o.id}>
                        {o.number}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Data do serviço">
                <Input type="date" value={form.service_date} onChange={(e) => set("service_date", e.target.value)} />
              </Field>
              <Field label="Início da garantia">
                <Input type="date" value={form.start_date} onChange={(e) => set("start_date", e.target.value)} />
              </Field>
              <Field label="Prazo (dias)">
                <Select value={form.days ?? ""} onValueChange={(v) => set("days", v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["30", "60", "90", "180", "365"].map((d) => (
                      <SelectItem key={d} value={d}>
                        {d} dias
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>
            <Field label="Serviço realizado">
              <Textarea
                value={form.service_performed}
                rows={2}
                maxLength={1000}
                onChange={(e) => set("service_performed", e.target.value)}
              />
            </Field>
            <Field label="Peças utilizadas">
              <Textarea value={form.parts_used} rows={2} maxLength={800} onChange={(e) => set("parts_used", e.target.value)} />
            </Field>
            <Field label="Condições da garantia">
              <Textarea
                value={form.conditions}
                rows={3}
                maxLength={1200}
                placeholder={company?.warranty_terms ?? "Condições padrão da empresa"}
                onChange={(e) => set("conditions", e.target.value)}
              />
            </Field>
            <Field label="Exclusões">
              <Textarea value={form.exclusions} rows={2} maxLength={1000} onChange={(e) => set("exclusions", e.target.value)} />
            </Field>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={() => create.mutate()} disabled={create.isPending}>
              Emitir certificado
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {pdf.viewer}
    </div>
  );
}
