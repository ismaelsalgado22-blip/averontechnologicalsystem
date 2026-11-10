import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarClock, Plus, Pencil } from "lucide-react";
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
import { dateBR, today } from "@/lib/format";
import { DeleteButton } from "@/components/delete-button";
import { localDateTime } from "@/lib/validation";
import { CepInput } from "@/components/cep-input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/_authenticated/agenda")({
  head: () => ({
    meta: [
      { title: "Agenda de atendimentos | Averon" },
      { name: "description", content: "Agende visitas técnicas e manutenções preventivas com confirmação por WhatsApp." },
      { property: "og:title", content: "Agenda de atendimentos | Averon" },
      { property: "og:description", content: "Visitas técnicas, manutenções preventivas e rota do dia da equipe." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SchedulePage,
});

const STATUS: Record<string, { label: string; tone: string }> = {
  agendado: { label: "Agendado", tone: "bg-primary/15 text-primary" },
  confirmado: { label: "Confirmado", tone: "bg-success/15 text-success" },
  realizado: { label: "Realizado", tone: "bg-muted text-muted-foreground" },
  cancelado: { label: "Cancelado", tone: "bg-destructive/15 text-destructive" },
};

const emptyForm = {
  client_id: "",
  equipment_id: "",
  title: "Visita técnica",
  technician_name: "",
  date: today(),
  time: "09:00",
  duration_minutes: "60",
  address: "",
  status: "agendado",
  reported_problem: "",
  cep: "", number: "", district: "", city: "", state: "", complement: "",
  contact_name: "",
  contact_phone: "",
  notes: "",
};

function SchedulePage() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState("todos");
  const [dateFilter, setDateFilter] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [source, setSource] = useState<"appointments" | "guest_appointments">("appointments");
  const [editingId, setEditingId] = useState<string | null>(null);

  const { data: appointments } = useQuery({
    queryKey: ["appointments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appointments")
        .select("*, clients(name, phone, whatsapp, address, number, district, city, state, complement, zip_code), equipment(type, brand)")
        .order("scheduled_at");
      if (error) throw error;
      const { data: guests, error: guestError } = await supabase.from("guest_appointments").select("*").order("scheduled_at");
      if (guestError) throw guestError;
      return [
        ...(data ?? []).map((a) => ({ ...a, source: "appointments" as const })),
        ...(guests ?? []).map((a) => ({ ...a, source: "guest_appointments" as const, clients: { name: a.contact_name, phone: a.contact_phone, whatsapp: a.contact_phone }, equipment: null })),
      ].sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at));
    },
  });
  const { data: clients } = useQuery({
    queryKey: ["clients", "agenda"],
    queryFn: async () =>
      (await supabase.from("clients").select("*").order("name")).data ?? [],
  });
  const { data: equipment } = useQuery({
    queryKey: ["equipment", "all"],
    queryFn: async () => (await supabase.from("equipment").select("id, client_id, type, brand")).data ?? [],
  });

  const create = useMutation({
    mutationFn: async () => {
      if (source === "appointments" && !form.client_id) throw new Error("Selecione o cliente");
      if (source === "guest_appointments" && (!form.contact_name.trim() || !form.contact_phone.trim())) throw new Error("Informe nome e telefone");
      const scheduled = new Date(`${form.date}T${form.time || "09:00"}:00`);
      if (Number.isNaN(scheduled.getTime())) throw new Error("Informe uma data e horário válidos");
      const common = {
        title: form.title.trim() || "Visita técnica",
        technician_name: form.technician_name || null,
        scheduled_at: scheduled.toISOString(),
        duration_minutes: Number(form.duration_minutes) || 60,
        address: [form.address, form.number, form.district, form.city, form.state, form.complement, form.cep ? `CEP ${form.cep}` : ""].filter(Boolean).join(", ") || null,
        status: form.status,
        reported_problem: form.reported_problem.trim() || null,
        notes: form.notes || null,
      };
      const result = source === "appointments"
        ? await (editingId
            ? supabase.from("appointments").update({ ...common, client_id: form.client_id, equipment_id: form.equipment_id || null }).eq("id", editingId)
            : supabase.from("appointments").insert({ ...common, client_id: form.client_id, equipment_id: form.equipment_id || null })).select("id")
        : await (editingId
            ? supabase.from("guest_appointments").update({ ...common, contact_name: form.contact_name.trim(), contact_phone: form.contact_phone.trim() }).eq("id", editingId)
            : supabase.from("guest_appointments").insert({ ...common, contact_name: form.contact_name.trim(), contact_phone: form.contact_phone.trim() })).select("id");
      const { data, error } = result;
      if (error) throw error;
      if (!data?.length) throw new Error("Não foi possível salvar o agendamento");
    },
    onSuccess: () => {
      toast.success(editingId ? "Agendamento atualizado" : "Atendimento agendado");
      setOpen(false);
      setForm(emptyForm);
      setEditingId(null);
      qc.invalidateQueries({ queryKey: ["appointments"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["alerts"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Falha ao agendar"),
  });

  const changeStatus = useMutation({
    mutationFn: async ({ id, value, source }: { id: string; value: string; source: "appointments" | "guest_appointments" }) => {
      const { error } = await supabase.from(source).update({ status: value }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["appointments"] }),
    onError: () => toast.error("Falha ao atualizar status"),
  });

  const groups = useMemo(() => {
    const map = new Map<string, any[]>();
    (appointments ?? []).forEach((a: any) => {
      const day = localDateTime(a.scheduled_at).date;
      if (filter !== "todos" && a.status !== filter) return;
      if (dateFilter && day !== dateFilter) return;
      map.set(day, [...(map.get(day) ?? []), a]);
    });
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [appointments, filter, dateFilter]);

  const set = (k: keyof typeof emptyForm, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const clientEquip = ((equipment as any[]) ?? []).filter((e: any) => e.client_id === form.client_id);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Agenda"
        description="Visitas técnicas e manutenções preventivas, com confirmação por WhatsApp."
        actions={
          <Button
            onClick={() => {
              setForm(emptyForm);
              setEditingId(null);
              setSource("appointments");
              setOpen(true);
            }}
          >
            <Plus className="size-4" />
            Novo agendamento
          </Button>
        }
      />

      <div className="flex flex-wrap gap-2"><Input aria-label="Filtrar por data" type="date" className="w-auto" value={dateFilter} onChange={e => setDateFilter(e.target.value)}/>{dateFilter && <Button variant="ghost" onClick={() => setDateFilter("")}>Todas as datas</Button>}<Select value={filter} onValueChange={setFilter}><SelectTrigger className="w-44" aria-label="Filtrar por status"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="todos">Todos os status</SelectItem>{Object.entries(STATUS).map(([key,v]) => <SelectItem key={key} value={key}>{v.label}</SelectItem>)}</SelectContent></Select></div>
      {groups.length === 0 ? (
        <EmptyState title="Agenda vazia" description="Agende a primeira visita técnica." />
      ) : (
        <div className="space-y-5">
          {groups.map(([day, list]) => (
            <div key={day} className="space-y-2">
              <h2 className={`flex items-center gap-2 text-xl font-bold ${day === today() ? "text-destructive" : day > today() ? "text-success" : "text-muted-foreground"}`}>
                <CalendarClock className="size-3.5" />
                {dateBR(day)} {day === today() && <span className="text-xs">HOJE</span>}
              </h2>
              <div className="space-y-2">
                {list.map((a: any) => (
                  <div key={a.id} className="surface-panel flex flex-wrap items-start justify-between gap-3 p-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-display text-sm font-bold">
                          {localDateTime(a.scheduled_at).time}
                        </span>
                        <StatusPill label={STATUS[a.status]?.label ?? a.status} tone={STATUS[a.status]?.tone ?? ""} />
                      </div>
                      <p className="text-sm font-semibold">{a.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {a.clients?.name}
                        {a.equipment ? ` • ${a.equipment.type}` : ""}
                        {a.technician_name ? ` • ${a.technician_name}` : ""}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {a.address ?? ([a.clients?.address, a.clients?.city].filter(Boolean).join(", ") || "Endereço não informado")}
                      </p>
                        <div className="mt-2 rounded-md bg-muted/60 p-2">
                          <p className="text-xs font-semibold">Problema relatado</p>
                          <p className="whitespace-pre-wrap break-words text-xs text-muted-foreground">{a.reported_problem?.trim() || "Não informado"}</p>
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {(a.address || a.clients?.address) && <><Button size="sm" variant="outline" asChild><a target="_blank" rel="noopener noreferrer" href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(a.address || [a.clients?.address,a.clients?.number,a.clients?.district,a.clients?.city,a.clients?.state].filter(Boolean).join(', '))}`}>Maps</a></Button><Button size="sm" variant="outline" asChild><a target="_blank" rel="noopener noreferrer" href={`https://waze.com/ul?q=${encodeURIComponent(a.address || [a.clients?.address,a.clients?.number,a.clients?.district,a.clients?.city,a.clients?.state].filter(Boolean).join(', '))}&navigate=yes`}>Waze</a></Button></>}

                      <Button variant="outline" size="sm" onClick={() => {
                        const local = new Date(a.scheduled_at);
                        const pad = (n: number) => String(n).padStart(2, "0");
                        setSource(a.source);
                        setEditingId(a.id);
                        setForm({ ...emptyForm, client_id: a.client_id ?? "", equipment_id: a.equipment_id ?? "", title: a.title, technician_name: a.technician_name ?? "", date: `${local.getFullYear()}-${pad(local.getMonth() + 1)}-${pad(local.getDate())}`, time: `${pad(local.getHours())}:${pad(local.getMinutes())}`, duration_minutes: String(a.duration_minutes), address: a.address ?? "", status: a.status, reported_problem: a.reported_problem ?? "", contact_name: a.contact_name ?? "", contact_phone: a.contact_phone ?? "", notes: a.notes ?? "" });
                        setOpen(true);
                      }}><Pencil className="size-4" />Editar</Button>
                      <Select value={a.status ?? ""} onValueChange={(value) => changeStatus.mutate({ id: a.id, value, source: a.source })}>
                        <SelectTrigger className="h-8 w-36 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(STATUS).map(([k, v]) => (
                            <SelectItem key={k} value={k}>
                              {v.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <WhatsAppButton
                        phone={a.clients?.whatsapp ?? a.clients?.phone}
                        template="agendamento"
                        vars={{
                          nome: a.clients?.name,
                          data: dateBR(localDateTime(a.scheduled_at).date),
                          horario: localDateTime(a.scheduled_at).time,
                        }}
                      />
                      <DeleteButton
                        table={a.source}
                        id={a.id}
                        what="Agendamento"
                        name={a.title}
                        invalidate={["appointments", "dashboard"]}
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
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar agendamento" : "Novo agendamento"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Tabs value={source} onValueChange={(value) => { setSource(value === "guest_appointments" ? "guest_appointments" : "appointments"); setForm(emptyForm); }}>
              <TabsList>
                <TabsTrigger value="appointments" disabled={Boolean(editingId)}>Cliente cadastrado</TabsTrigger>
                <TabsTrigger value="guest_appointments" disabled={Boolean(editingId)}>Sem cadastro</TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="grid gap-3 sm:grid-cols-2">
              {source === "guest_appointments" ? <>
                <Field label="Nome *"><Input aria-label="Nome do contato" value={form.contact_name} onChange={(e) => set("contact_name", e.target.value)} /></Field>
                <Field label="Telefone *"><Input aria-label="Telefone do contato" type="tel" value={form.contact_phone} onChange={(e) => set("contact_phone", e.target.value)} /></Field>
              </> : <>
              <Field label="Cliente *">
                <Select
                  value={form.client_id}
                  onValueChange={(v) => {
                    const c = (clients ?? []).find((x: any) => x.id === v);
                    setForm((f) => ({
                      ...f,
                      client_id: v,
                      equipment_id: "",
                      address: c?.address ?? "", number: c?.number ?? "", district: c?.district ?? "", city: c?.city ?? "", state: c?.state ?? "", complement: c?.complement ?? "", cep: c?.zip_code ?? "",
                    }));
                  }}
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
                        {[e.type, e.brand].filter(Boolean).join(" ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              </>}
              <Field label="Título">
                <Input value={form.title} maxLength={120} onChange={(e) => set("title", e.target.value)} />
              </Field>
              <Field label="Técnico">
                <Input
                  value={form.technician_name}
                  maxLength={120}
                  onChange={(e) => set("technician_name", e.target.value)}
                />
              </Field>
              <Field label="Data">
                <Input type="date" value={form.date} onChange={(e) => set("date", e.target.value)} />
              </Field>
              <Field label="Horário">
                <Input type="time" value={form.time} onChange={(e) => set("time", e.target.value)} />
              </Field>
              <Field label="Duração (minutos)">
                <Input
                  inputMode="numeric"
                  value={form.duration_minutes}
                  onChange={(e) => set("duration_minutes", e.target.value)}
                />
              </Field>
              <Field label="Status">
                <Select value={form.status ?? ""} onValueChange={(v) => set("status", v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(STATUS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>
                        {v.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>
            <div className="grid gap-3 sm:grid-cols-2"><Field label="CEP"><CepInput value={form.cep} onChange={v => set("cep",v)} onAddress={v => setForm(f => ({ ...f, ...v, address: v.address || f.address, district: v.district || f.district }))}/></Field>{([['number','Número'],['district','Bairro'],['city','Cidade'],['state','UF'],['complement','Complemento']] as const).map(([key,label]) => <Field key={key} label={label}><Input aria-label={label} value={form[key]} onChange={e => set(key,e.target.value)}/></Field>)}</div>
            <Field label="Endereço do atendimento">
              <Input value={form.address} maxLength={200} onChange={(e) => set("address", e.target.value)} />
            </Field>
            <Field label="Problema relatado">
              <Textarea
                aria-label="Problema relatado"
                value={form.reported_problem}
                rows={3}
                maxLength={1200}
                placeholder="Descreva o problema informado pelo cliente"
                onChange={(e) => set("reported_problem", e.target.value)}
              />
            </Field>
            <Field label="Observações">
              <Textarea value={form.notes} rows={2} maxLength={600} onChange={(e) => set("notes", e.target.value)} />
            </Field>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={() => create.mutate()} disabled={create.isPending}>
              {editingId ? "Salvar alterações" : "Agendar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
