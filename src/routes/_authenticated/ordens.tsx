import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileDown, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, StatusPill, EmptyState } from "@/components/page-header";
import { WhatsAppButton } from "@/components/whatsapp-button";
import { PhotoUpload } from "@/components/photo-upload";
import { SignaturePad } from "@/components/signature-pad";
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
import { WO_STATUS, brl, dateBR, num, today } from "@/lib/format";
import { workOrderPdf } from "@/lib/pdf";
import { useCompany, FALLBACK_COMPANY } from "@/hooks/use-company";
import { DeleteButton } from "@/components/delete-button";

export const Route = createFileRoute("/_authenticated/ordens")({
  head: () => ({
    meta: [
      { title: "Ordens de serviço | Averon" },
      { name: "description", content: "Execute ordens de serviço com diagnóstico, medições, fotos antes e depois e assinatura digital do cliente." },
      { property: "og:title", content: "Ordens de serviço | Averon" },
      { property: "og:description", content: "Controle completo do atendimento técnico em refrigeração, do diagnóstico à conclusão." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: OrdersPage,
});

const SERVICE_TYPES = ["Manutenção corretiva", "Manutenção preventiva", "Instalação", "Higienização", "Diagnóstico", "Carga de gás"];

const emptyForm = {
  client_id: "",
  equipment_id: "",
  service_date: today(),
  service_time: "",
  service_type: SERVICE_TYPES[0],
  technician_name: "",
  reported_problem: "",
  diagnosis: "",
  executed_service: "",
  refrigerant: "",
  refrigerant_amount: "",
  pressures: "",
  compressor_current: "",
  temperatures: "",
  tests: "",
  notes: "",
  status: "aberta",
};

type Item = { description: string; quantity: string; unit_price: string; product_id?: string | null };

function OrdersPage() {
  const qc = useQueryClient();
  const { data: company } = useCompany();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("todos");
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [items, setItems] = useState<Item[]>([]);
  const [before, setBefore] = useState<string[]>([]);
  const [during, setDuring] = useState<string[]>([]);
  const [after, setAfter] = useState<string[]>([]);
  const [signature, setSignature] = useState<string | null>(null);

  const { data: orders } = useQuery({
    queryKey: ["work_orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("work_orders")
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
  const { data: products } = useQuery({
    queryKey: ["products", "list"],
    queryFn: async () => (await supabase.from("products").select("id, name, price").order("name")).data ?? [],
  });

  const total = items.reduce((a, i) => a + num(i.quantity) * num(i.unit_price), 0);

  const save = useMutation({
    mutationFn: async () => {
      if (!form.client_id) throw new Error("Selecione o cliente");
      const payload: any = {
        client_id: form.client_id,
        equipment_id: form.equipment_id || null,
        service_date: form.service_date,
        service_time: form.service_time || null,
        service_type: form.service_type || null,
        technician_name: form.technician_name || null,
        reported_problem: form.reported_problem || null,
        diagnosis: form.diagnosis || null,
        executed_service: form.executed_service || null,
        refrigerant: form.refrigerant || null,
        refrigerant_amount: form.refrigerant_amount || null,
        pressures: form.pressures || null,
        compressor_current: form.compressor_current || null,
        temperatures: form.temperatures || null,
        tests: form.tests || null,
        notes: form.notes || null,
        status: form.status,
        photos_before: before,
        photos_during: during,
        photos_after: after,
        total,
      };
      if (signature) {
        payload.signature = signature;
        payload.signed_at = new Date().toISOString();
      }
      if (editId) {
        const { error } = await supabase.from("work_orders").update(payload).eq("id", editId);
        if (error) throw error;
        return;
      }
      const { data, error } = await supabase.from("work_orders").insert(payload).select("id").single();
      if (error) throw error;
      if (items.length) {
        const { error: e2 } = await supabase.from("work_order_items").insert(
          items.map((i) => ({
            work_order_id: data.id,
            kind: i.product_id ? "peca" : "servico",
            description: i.description,
            quantity: num(i.quantity),
            unit_price: num(i.unit_price),
            total: num(i.quantity) * num(i.unit_price),
            product_id: i.product_id || null,
          })),
        );
        if (e2) throw e2;
      }
    },
    onSuccess: () => {
      toast.success(editId ? "Ordem atualizada" : "Ordem de serviço criada");
      setOpen(false);
      reset();
      qc.invalidateQueries({ queryKey: ["work_orders"] });
      qc.invalidateQueries({ queryKey: ["products"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Falha ao salvar ordem"),
  });

  const changeStatus = useMutation({
    mutationFn: async ({ id, value }: { id: string; value: string }) => {
      const { error } = await supabase.from("work_orders").update({ status: value as any }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Status atualizado");
      qc.invalidateQueries({ queryKey: ["work_orders"] });
    },
    onError: () => toast.error("Falha ao atualizar status"),
  });

  const reset = () => {
    setForm(emptyForm);
    setItems([]);
    setBefore([]);
    setDuring([]);
    setAfter([]);
    setSignature(null);
    setEditId(null);
  };

  const buildPdf = async (order: any) => {
    const { data: oItems } = await supabase.from("work_order_items").select("*").eq("work_order_id", order.id);
    const { data: client } = await supabase.from("clients").select("*").eq("id", order.client_id).maybeSingle();
    const eq = order.equipment_id
      ? (await supabase.from("equipment").select("*").eq("id", order.equipment_id).maybeSingle()).data
      : null;
    await workOrderPdf({
      company: company ?? FALLBACK_COMPANY,
      order,
      items: oItems ?? [],
      client,
      equipment: eq,
    });
  };

  const downloadPdf = async (item: any) => {
    try {
      await buildPdf(item);
    } catch (e: any) {
      toast.error(e?.message ?? "Não foi possível gerar o PDF");
    }
  };

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return (orders ?? []).filter((o: any) => {
      const okStatus = status === "todos" || o.status === status;
      const okTerm =
        !term ||
        [o.number, o.clients?.name, o.reported_problem, o.technician_name]
          .filter(Boolean)
          .some((v: string) => String(v).toLowerCase().includes(term));
      return okStatus && okTerm;
    });
  }, [orders, q, status]);

  const set = (k: keyof typeof emptyForm, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const clientEquip = (equipment ?? []).filter((e: any) => e.client_id === form.client_id);

  const openEdit = (o: any) => {
    setForm({
      client_id: o.client_id,
      equipment_id: o.equipment_id ?? "",
      service_date: o.service_date,
      service_time: o.service_time ?? "",
      service_type: o.service_type ?? SERVICE_TYPES[0],
      technician_name: o.technician_name ?? "",
      reported_problem: o.reported_problem ?? "",
      diagnosis: o.diagnosis ?? "",
      executed_service: o.executed_service ?? "",
      refrigerant: o.refrigerant ?? "",
      refrigerant_amount: o.refrigerant_amount ?? "",
      pressures: o.pressures ?? "",
      compressor_current: o.compressor_current ?? "",
      temperatures: o.temperatures ?? "",
      tests: o.tests ?? "",
      notes: o.notes ?? "",
      status: o.status,
    });
    setBefore(o.photos_before ?? []);
    setDuring(o.photos_during ?? []);
    setAfter(o.photos_after ?? []);
    setSignature(o.signature ?? null);
    setItems([]);
    setEditId(o.id);
    setOpen(true);
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Ordens de serviço"
        description="Registro técnico completo do atendimento, com fotos e assinatura do cliente."
        actions={
          <Button
            onClick={() => {
              reset();
              setOpen(true);
            }}
          >
            <Plus className="size-4" />
            Nova OS
          </Button>
        }
      />

      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por número, cliente, técnico ou problema"
            className="pl-9"
            maxLength={80}
          />
        </div>
        <Select value={status ?? ""} onValueChange={setStatus}>
          <SelectTrigger className="sm:w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os status</SelectItem>
            {Object.entries(WO_STATUS).map(([k, v]) => (
              <SelectItem key={k} value={k}>
                {v.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="Nenhuma ordem de serviço" description="Abra a primeira OS para registrar um atendimento." />
      ) : (
        <div className="space-y-3">
          {filtered.map((o: any) => (
            <div key={o.id} className="surface-panel p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-display text-base font-bold">{o.number}</span>
                    <StatusPill label={WO_STATUS[o.status]?.label ?? o.status} tone={WO_STATUS[o.status]?.tone ?? ""} />
                  </div>
                  <p className="text-sm font-semibold">{o.clients?.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {dateBR(o.service_date)}
                    {o.service_time ? ` às ${o.service_time}` : ""}
                    {o.equipment ? ` • ${o.equipment.type}` : ""}
                    {o.technician_name ? ` • ${o.technician_name}` : ""}
                  </p>
                  {o.reported_problem && (
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{o.reported_problem}</p>
                  )}
                </div>
                <div className="text-right">
                  <p className="kpi-label">Total</p>
                  <p className="font-display text-lg font-bold text-primary">{brl(o.total)}</p>
                  {o.signed_at && <p className="text-[11px] text-success">Assinada</p>}
                </div>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Select value={o.status ?? ""} onValueChange={(value) => changeStatus.mutate({ id: o.id, value })}>
                  <SelectTrigger className="h-8 w-44 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(WO_STATUS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>
                        {v.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button size="sm" variant="secondary" onClick={() => openEdit(o)}>
                  Executar / editar
                </Button>
                <Button size="sm" variant="outline" onClick={() => downloadPdf(o)}>
                  <FileDown className="size-4" />
                  PDF
                </Button>
                <WhatsAppButton
                  phone={o.clients?.whatsapp ?? o.clients?.phone}
                  template="concluido"
                  vars={{
                    nome: o.clients?.name,
                    documento: o.number,
                    valor: brl(o.total),
                    equipamento: o.equipment ? `${o.equipment.type} ${o.equipment.brand ?? ""}` : "",
                  }}
                />
                <DeleteButton
                  table="work_orders"
                  id={o.id}
                  what="Ordem de serviço"
                  name={o.number}
                  invalidate={["work_orders", "dashboard", "payments"]}
                  withLabel
                />
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editId ? "Ordem de serviço" : "Nova ordem de serviço"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Cliente *">
                <Select
                  value={form.client_id}
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
              <Field label="Data">
                <Input type="date" value={form.service_date} onChange={(e) => set("service_date", e.target.value)} />
              </Field>
              <Field label="Horário">
                <Input type="time" value={form.service_time} onChange={(e) => set("service_time", e.target.value)} />
              </Field>
              <Field label="Tipo de atendimento">
                <Select value={form.service_type ?? ""} onValueChange={(v) => set("service_type", v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SERVICE_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Técnico responsável">
                <Input
                  value={form.technician_name}
                  maxLength={120}
                  onChange={(e) => set("technician_name", e.target.value)}
                />
              </Field>
              <Field label="Status">
                <Select value={form.status ?? ""} onValueChange={(v) => set("status", v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(WO_STATUS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>
                        {v.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>

            <div className="grid gap-3">
              <Field label="Problema relatado">
                <Textarea
                  value={form.reported_problem}
                  rows={2}
                  maxLength={1200}
                  onChange={(e) => set("reported_problem", e.target.value)}
                />
              </Field>
              <Field label="Diagnóstico técnico">
                <Textarea value={form.diagnosis} rows={2} maxLength={1200} onChange={(e) => set("diagnosis", e.target.value)} />
              </Field>
              <Field label="Serviço executado">
                <Textarea
                  value={form.executed_service}
                  rows={2}
                  maxLength={1200}
                  onChange={(e) => set("executed_service", e.target.value)}
                />
              </Field>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Gás utilizado">
                <Input value={form.refrigerant} maxLength={40} onChange={(e) => set("refrigerant", e.target.value)} />
              </Field>
              <Field label="Quantidade de gás">
                <Input
                  value={form.refrigerant_amount}
                  maxLength={40}
                  onChange={(e) => set("refrigerant_amount", e.target.value)}
                />
              </Field>
              <Field label="Pressões (alta/baixa)">
                <Input value={form.pressures} maxLength={60} onChange={(e) => set("pressures", e.target.value)} />
              </Field>
              <Field label="Amperagem do compressor">
                <Input
                  value={form.compressor_current}
                  maxLength={40}
                  onChange={(e) => set("compressor_current", e.target.value)}
                />
              </Field>
              <Field label="Temperaturas">
                <Input value={form.temperatures} maxLength={80} onChange={(e) => set("temperatures", e.target.value)} />
              </Field>
              <Field label="Testes realizados">
                <Input value={form.tests} maxLength={120} onChange={(e) => set("tests", e.target.value)} />
              </Field>
            </div>

            {!editId && (
              <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="kpi-label">Peças e serviços utilizados</h3>
                  <div className="flex gap-2">
                    <Select
                      value=""
                      onValueChange={(id) => {
                        const p = (products ?? []).find((x: any) => x.id === id);
                        if (p)
                          setItems((prev) => [
                            ...prev,
                            { description: p.name, quantity: "1", unit_price: String(p.price), product_id: p.id },
                          ]);
                      }}
                    >
                      <SelectTrigger className="h-8 w-40 text-xs">
                        <SelectValue placeholder="+ Peça (baixa estoque)" />
                      </SelectTrigger>
                      <SelectContent>
                        {(products ?? []).map((p: any) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setItems((p) => [...p, { description: "", quantity: "1", unit_price: "0" }])}
                    >
                      Item livre
                    </Button>
                  </div>
                </div>
                {items.map((it, idx) => (
                  <div key={idx} className="grid gap-2 rounded-md border border-border p-2 sm:grid-cols-[1fr_5rem_7rem_6rem_2.5rem]">
                    <Input
                      value={it.description}
                      maxLength={160}
                      placeholder="Descrição"
                      onChange={(e) =>
                        setItems((p) => p.map((x, i) => (i === idx ? { ...x, description: e.target.value } : x)))
                      }
                    />
                    <Input
                      inputMode="decimal"
                      value={it.quantity}
                      onChange={(e) => setItems((p) => p.map((x, i) => (i === idx ? { ...x, quantity: e.target.value } : x)))}
                    />
                    <Input
                      inputMode="decimal"
                      value={it.unit_price}
                      onChange={(e) =>
                        setItems((p) => p.map((x, i) => (i === idx ? { ...x, unit_price: e.target.value } : x)))
                      }
                    />
                    <div className="flex items-center text-sm font-semibold">
                      {brl(num(it.quantity) * num(it.unit_price))}
                    </div>
                    <Button size="icon" variant="ghost" onClick={() => setItems((p) => p.filter((_, i) => i !== idx))}>
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                ))}
                <p className="text-right text-sm">
                  Total: <strong className="text-primary">{brl(total)}</strong>
                </p>
              </div>
            )}

            <div className="grid gap-4 lg:grid-cols-3">
              <PhotoUpload label="Fotos antes" folder="os/antes" paths={before} onChange={setBefore} />
              <PhotoUpload label="Fotos durante" folder="os/durante" paths={during} onChange={setDuring} />
              <PhotoUpload label="Fotos depois" folder="os/depois" paths={after} onChange={setAfter} />
            </div>

            <Field label="Observações">
              <Textarea value={form.notes} rows={2} maxLength={800} onChange={(e) => set("notes", e.target.value)} />
            </Field>

            <SignaturePad value={signature} onChange={setSignature} />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={() => save.mutate()} disabled={save.isPending}>
              Salvar ordem
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
