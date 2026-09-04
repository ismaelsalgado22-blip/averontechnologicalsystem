import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileDown, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, EmptyState } from "@/components/page-header";
import { WhatsAppButton } from "@/components/whatsapp-button";
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
import { dateBR, today } from "@/lib/format";
import { reportPdf } from "@/lib/pdf";
import { useCompany, FALLBACK_COMPANY } from "@/hooks/use-company";

export const Route = createFileRoute("/_authenticated/laudos")({
  head: () => ({
    meta: [
      { title: "Laudos técnicos | MEC Frio Refrigeração" },
      { name: "description", content: "Emita laudos técnicos com checklist de inspeção, medições, diagnóstico e recomendações." },
      { property: "og:title", content: "Laudos técnicos | MEC Frio Refrigeração" },
      { property: "og:description", content: "Checklist completo de inspeção em refrigeração com laudo em PDF." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ReportsPage,
});

const CHECK_FIELDS: [string, string][] = [
  ["general_condition", "Condição geral"],
  ["compressor", "Compressor"],
  ["condenser", "Condensador"],
  ["evaporator", "Evaporador"],
  ["fans", "Ventiladores"],
  ["controller", "Controlador"],
  ["sensors", "Sensores"],
  ["thermostat", "Termostato"],
  ["electrical_system", "Sistema elétrico"],
  ["piping", "Tubulação"],
  ["insulation", "Isolamento"],
  ["drain", "Dreno"],
  ["defrost_system", "Sistema de degelo"],
  ["refrigerant_leak", "Vazamento de gás"],
];

const MEASURE_FIELDS: [string, string][] = [
  ["pressures", "Pressões"],
  ["temperatures", "Temperaturas"],
  ["current_reading", "Amperagem"],
  ["voltage", "Tensão"],
  ["refrigerant_state", "Estado do gás"],
];

const CONDITIONS = ["Bom", "Regular", "Ruim", "Substituir", "Não se aplica"];

const emptyForm: Record<string, string> = {
  client_id: "",
  equipment_id: "",
  work_order_id: "",
  inspection_date: today(),
  location: "",
  technician_name: "",
  diagnosis: "",
  probable_cause: "",
  recommendation: "",
  recommended_service: "",
  ...Object.fromEntries(CHECK_FIELDS.map(([k]) => [k, ""])),
  ...Object.fromEntries(MEASURE_FIELDS.map(([k]) => [k, ""])),
};

function ReportsPage() {
  const qc = useQueryClient();
  const { data: company } = useCompany();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [photos, setPhotos] = useState<string[]>([]);

  const { data: reports } = useQuery({
    queryKey: ["technical_reports"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("technical_reports")
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

  const save = useMutation({
    mutationFn: async () => {
      if (!form["client_id"]) throw new Error("Selecione o cliente");
      const payload: any = Object.fromEntries(
        Object.entries(form).map(([k, v]) => [k, v === "" ? null : v]),
      );
      payload.inspection_date = form["inspection_date"];
      payload.photos = photos;
      const { error } = editId
        ? await supabase.from("technical_reports").update(payload).eq("id", editId)
        : await supabase.from("technical_reports").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Laudo salvo");
      setOpen(false);
      setForm(emptyForm);
      setPhotos([]);
      setEditId(null);
      qc.invalidateQueries({ queryKey: ["technical_reports"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Falha ao salvar laudo"),
  });

  const downloadPdf = async (report: any) => {
    const { data: client } = await supabase.from("clients").select("*").eq("id", report.client_id).maybeSingle();
    const eq = report.equipment_id
      ? (await supabase.from("equipment").select("*").eq("id", report.equipment_id).maybeSingle()).data
      : null;
    await reportPdf({ company: company ?? FALLBACK_COMPANY, report, client, equipment: eq });
  };

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return (reports ?? []).filter((r: any) =>
      !term
        ? true
        : [r.number, r.clients?.name, r.diagnosis, r.technician_name]
            .filter(Boolean)
            .some((v: string) => String(v).toLowerCase().includes(term)),
    );
  }, [reports, q]);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const clientEquip = (equipment ?? []).filter((e: any) => e.client_id === form["client_id"]);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Laudos técnicos"
        description="Inspeção item por item, medições e recomendação técnica em PDF."
        actions={
          <Button
            onClick={() => {
              setForm(emptyForm);
              setPhotos([]);
              setEditId(null);
              setOpen(true);
            }}
          >
            <Plus className="size-4" />
            Novo laudo
          </Button>
        }
      />

      <div className="relative">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por número, cliente, técnico ou diagnóstico"
          className="pl-9"
          maxLength={80}
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="Nenhum laudo emitido" description="Emita laudos para justificar trocas e orçamentos." />
      ) : (
        <div className="space-y-3">
          {filtered.map((r: any) => (
            <div key={r.id} className="surface-panel p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-display text-base font-bold">{r.number}</p>
                  <p className="text-sm font-semibold">{r.clients?.name}</p>
                  <p className="text-xs text-muted-foreground">
                    Inspeção em {dateBR(r.inspection_date)}
                    {r.equipment ? ` • ${r.equipment.type}` : ""}
                    {r.technician_name ? ` • ${r.technician_name}` : ""}
                  </p>
                  {r.diagnosis && <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{r.diagnosis}</p>}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      const next: Record<string, string> = { ...emptyForm };
                      Object.keys(emptyForm).forEach((k) => (next[k] = r[k] ?? ""));
                      setForm(next);
                      setPhotos(r.photos ?? []);
                      setEditId(r.id);
                      setOpen(true);
                    }}
                  >
                    Editar
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => downloadPdf(r)}>
                    <FileDown className="size-4" />
                    PDF
                  </Button>
                  <WhatsAppButton
                    phone={r.clients?.whatsapp ?? r.clients?.phone}
                    template="laudo"
                    vars={{
                      nome: r.clients?.name,
                      documento: r.number,
                      equipamento: r.equipment ? `${r.equipment.type} ${r.equipment.brand ?? ""}` : "",
                    }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editId ? "Editar laudo técnico" : "Novo laudo técnico"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Cliente *">
                <Select
                  value={form["client_id"]}
                  onValueChange={(v) => setForm((f) => ({ ...f, client_id: v, equipment_id: "" }))}
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
                <Select value={form["equipment_id"] ?? ""} onValueChange={(v) => set("equipment_id", v)}>
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
              <Field label="Data da inspeção">
                <Input
                  type="date"
                  value={form["inspection_date"]}
                  onChange={(e) => set("inspection_date", e.target.value)}
                />
              </Field>
              <Field label="Local">
                <Input value={form["location"]} maxLength={140} onChange={(e) => set("location", e.target.value)} />
              </Field>
              <Field label="Técnico responsável">
                <Input
                  value={form["technician_name"]}
                  maxLength={120}
                  onChange={(e) => set("technician_name", e.target.value)}
                />
              </Field>
            </div>

            <div>
              <h3 className="kpi-label mb-2">Checklist de inspeção</h3>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {CHECK_FIELDS.map(([k, label]) => (
                  <Field key={k} label={label}>
                    <Select value={form[k] ?? ""} onValueChange={(v) => set(k, v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Avaliar" />
                      </SelectTrigger>
                      <SelectContent>
                        {CONDITIONS.map((c) => (
                          <SelectItem key={c} value={c}>
                            {c}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                ))}
              </div>
            </div>

            <div>
              <h3 className="kpi-label mb-2">Medições</h3>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {MEASURE_FIELDS.map(([k, label]) => (
                  <Field key={k} label={label}>
                    <Input value={form[k]} maxLength={80} onChange={(e) => set(k, e.target.value)} />
                  </Field>
                ))}
              </div>
            </div>

            <Field label="Diagnóstico">
              <Textarea value={form["diagnosis"]} rows={3} maxLength={1500} onChange={(e) => set("diagnosis", e.target.value)} />
            </Field>
            <Field label="Causa provável">
              <Textarea
                value={form["probable_cause"]}
                rows={2}
                maxLength={1000}
                onChange={(e) => set("probable_cause", e.target.value)}
              />
            </Field>
            <Field label="Recomendação técnica">
              <Textarea
                value={form["recommendation"]}
                rows={3}
                maxLength={1500}
                onChange={(e) => set("recommendation", e.target.value)}
              />
            </Field>
            <Field label="Serviço recomendado">
              <Input
                value={form["recommended_service"]}
                maxLength={200}
                onChange={(e) => set("recommended_service", e.target.value)}
              />
            </Field>

            <PhotoUpload label="Fotos da inspeção" folder="laudos" paths={photos} onChange={setPhotos} />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={() => save.mutate()} disabled={save.isPending}>
              Salvar laudo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
