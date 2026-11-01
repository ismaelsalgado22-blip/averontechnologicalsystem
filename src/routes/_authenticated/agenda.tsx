import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarClock, MapPin, Navigation, Pencil, Plus } from "lucide-react";
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
import { dateBR, dateTimeBR, today } from "@/lib/format";
import { DeleteButton } from "@/components/delete-button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { appointmentContact, guestContact, type AppointmentSource } from "@/lib/appointment-contact";
import { CepInput } from "@/components/cep-input";
import { mergePostalAddress } from "@/lib/postal-address";

export const Route = createFileRoute("/_authenticated/agenda")({
  head: () => ({
    meta: [
      { title: "Agenda de atendimentos | Averon" },
      { name: "description", content: "Agende visitas técnicas e manutenções preventivas com confirmação por WhatsApp." },
      { property: "og:title", content: "Agenda de atendimentos | Averon" },
      { property: "og:description", content: "Visitas técnicas, manutenções preventivas e rota do dia da equipe." },
      { name: "robots", content: "noindex" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
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
  mode: "registered",
  contact_name: "",
  contact_phone: "",
  client_id: "",
  equipment_id: "",
  title: "Visita técnica",
  technician_name: "",
  date: today(),
  time: "09:00",
  duration_minutes: "60",
  address: "",
  cep: "",
  number: "",
  district: "",
  city: "",
  complement: "",
  status: "agendado",
  notes: "",
};

function composeAddress(f: typeof emptyForm) {
  const street = [f.address, f.number].filter(Boolean).join(", ");
  const cityState = [f.city].filter(Boolean).join(" - ");
  return [street, f.district, cityState, f.complement, f.cep ? `CEP ${f.cep}` : ""]
    .filter(Boolean)
    .join(" • ");
}

function fullAddress(a: any) {
  if (a.address) return a.address as string;
  const c = a.clients;
  if (!c) return "";
  const street = [c.address, c.number].filter(Boolean).join(", ");
  return [street, c.district, c.city, c.complement, c.zip_code ? `CEP ${c.zip_code}` : ""]
    .filter(Boolean)
    .join(" • ");
}

const pad2 = (n: number) => String(n).padStart(2, "0");

function localDateTime(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { date: "", time: "" };
  return {
    date: `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`,
    time: `${pad2(d.getHours())}:${pad2(d.getMinutes())}`,
  };
}

function SchedulePage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [filter, setFilter] = useState("todos");
  const [editing, setEditing] = useState<{ id: string; source: AppointmentSource } | null>(null);

  const { data: appointments } = useQuery({
    queryKey: ["appointments"],
    queryFn: async () => {
      const [registered, guest] = await Promise.all([
        supabase.from("appointments").select("*, clients(name, phone, whatsapp, address, city), equipment(type, brand)").order("scheduled_at"),
        supabase.from("guest_appointments").select("*").order("scheduled_at"),
      ]);
      if (registered.error) throw registered.error;
      if (guest.error) throw guest.error;
      return [
        ...(registered.data ?? []).map((a) => ({ ...a, source: "appointments" as const })),
        ...(guest.data ?? []).map((a) => ({ ...a, source: "guest_appointments" as const })),
      ].sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at));
    },
  });
  const { data: clients } = useQuery({
    queryKey: ["clients"],
    queryFn: async () =>
      (await supabase.from("clients").select("id, name, phone, whatsapp, address, number, district, city, state, complement, zip_code").order("name")).data ?? [],
  });
  const { data: equipment } = useQuery({
    queryKey: ["equipment", "all"],
    queryFn: async () => (await supabase.from("equipment").select("id, client_id, type, brand")).data ?? [],
  });

  const save = useMutation({
    mutationFn: async () => {
      if (form.mode === "registered" && !form.client_id) throw new Error("Selecione o cliente");
      const contact = form.mode === "guest" ? guestContact(form.contact_name, form.contact_phone) : null;
      const scheduled = new Date(`${form.date}T${form.time || "09:00"}:00`);
      if (Number.isNaN(scheduled.getTime())) throw new Error("Informe uma data válida");
      const payload = {
        title: form.title.trim() || "Visita técnica",
        technician_name: form.technician_name || null,
        scheduled_at: scheduled.toISOString(),
        duration_minutes: Number(form.duration_minutes) || 60,
        address: composeAddress(form) || null,
        status: form.status,
        notes: form.notes || null,
      };
      if (editing) {
        const updatePayload =
          editing.source === "guest_appointments"
            ? { ...payload, ...contact!, cep: form.cep || null }
            : { ...payload, client_id: form.client_id, equipment_id: form.equipment_id || null };
        const { error } = await supabase.from(editing.source).update(updatePayload).eq("id", editing.id);
        if (error) throw error;
        return;
      }
      const { error } = contact
        ? await supabase.from("guest_appointments").insert({ ...payload, ...contact, cep: form.cep || null })
        : await supabase.from("appointments").insert({ ...payload, client_id: form.client_id, equipment_id: form.equipment_id || null });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(editing ? "Agendamento atualizado" : "Atendimento agendado");
      setOpen(false);
      setForm(emptyForm);
      setEditing(null);
      qc.invalidateQueries({ queryKey: ["appointments"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["alerts"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Falha ao agendar"),
  });

  const openEdit = (a: any) => {
    const { date, time } = localDateTime(a.scheduled_at);
    setEditing({ id: a.id, source: a.source });
    setForm({
      ...emptyForm,
      mode: a.source === "guest_appointments" ? "guest" : "registered",
      contact_name: a.contact_name ?? "",
      contact_phone: a.contact_phone ?? "",
      client_id: a.client_id ?? "",
      equipment_id: a.equipment_id ?? "",
      title: a.title ?? "Visita técnica",
      technician_name: a.technician_name ?? "",
      date: date || today(),
      time: time || "09:00",
      duration_minutes: String(a.duration_minutes ?? 60),
      address: a.address ?? "",
      cep: a.cep ?? "",
      status: a.status ?? "agendado",
      notes: a.notes ?? "",
    });
    setOpen(true);
  };

  const changeStatus = useMutation({
    mutationFn: async ({ id, value, source }: { id: string; value: string; source: AppointmentSource }) => {
      const { error } = await supabase.from(source).update({ status: value }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["appointments"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["alerts"] });
    },
    onError: () => toast.error("Falha ao atualizar status"),
  });

  const groups = useMemo(() => {
    const map = new Map<string, any[]>();
    (appointments ?? [])
      .filter((a: any) => filter === "todos" || a.status === filter)
      .forEach((a: any) => {
      const day = localDateTime(a.scheduled_at).date || String(a.scheduled_at).slice(0, 10);
      map.set(day, [...(map.get(day) ?? []), a]);
      });
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [appointments, filter]);

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
              setEditing(null);
              setForm(emptyForm);
              setOpen(true);
            }}
          >
            <Plus className="size-4" />
            Novo agendamento
          </Button>
        }
      />

      <Tabs value={filter} onValueChange={setFilter}>
        <TabsList className="grid h-auto w-full grid-cols-3 sm:grid-cols-5">
          <TabsTrigger value="todos" className="whitespace-normal">Todos</TabsTrigger>
          {Object.entries(STATUS).map(([k, v]) => (
            <TabsTrigger key={k} value={k} className="whitespace-normal">
              {v.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {groups.length === 0 ? (
        <EmptyState title="Agenda vazia" description="Agende a primeira visita técnica." />
      ) : (
        <div className="space-y-5">
          {groups.map(([day, list]) => (
            <div key={day} className="space-y-2">
              <h2 className="flex items-center gap-2 kpi-label">
                <CalendarClock className="size-3.5" />
                {dateBR(day)}
              </h2>
              <div className="space-y-2">
                {list.map((a: any) => (
                  <div key={`${a.source}-${a.id}`} className="surface-panel flex flex-wrap items-start justify-between gap-3 p-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-display text-sm font-bold">
                          {String(a.scheduled_at).slice(11, 16)}
                        </span>
                        <StatusPill label={STATUS[a.status]?.label ?? a.status} tone={STATUS[a.status]?.tone ?? ""} />
                      </div>
                      <p className="text-sm font-semibold">{a.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {appointmentContact(a).name}
                        {a.equipment ? ` • ${a.equipment.type}` : ""}
                        {a.technician_name ? ` • ${a.technician_name}` : ""}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {fullAddress(a) || "Endereço não informado"}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
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
                      {fullAddress(a) ? (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 gap-1.5 text-xs"
                            onClick={() =>
                              window.open(
                                `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(fullAddress(a))}`,
                                "_blank",
                                "noopener",
                              )
                            }
                          >
                            <MapPin className="size-3.5" />
                            Maps
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 gap-1.5 text-xs"
                            onClick={() =>
                              window.open(
                                `https://waze.com/ul?q=${encodeURIComponent(fullAddress(a))}&navigate=yes`,
                                "_blank",
                                "noopener",
                              )
                            }
                          >
                            <Navigation className="size-3.5" />
                            Waze
                          </Button>
                        </>
                      ) : null}
                      <WhatsAppButton
                        phone={appointmentContact(a).phone}
                        template="agendamento"
                        vars={{
                          nome: appointmentContact(a).name,
                          data: dateBR(a.scheduled_at),
                          horario: String(a.scheduled_at).slice(11, 16),
                        }}
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 gap-1.5 text-xs"
                        onClick={() => openEdit(a)}
                      >
                        <Pencil className="size-3.5" />
                        Editar
                      </Button>
                      <DeleteButton
                        table={a.source}
                        id={a.id}
                        what="Agendamento"
                        name={a.title}
                        invalidate={["appointments", "dashboard", "alerts"]}
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
            <DialogTitle>{editing ? "Editar agendamento" : "Novo agendamento"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Tabs value={form.mode} onValueChange={(mode) => setForm((f) => ({ ...f, mode, client_id: "", equipment_id: "", address: "", cep: "", number: "", district: "", city: "", complement: "" }))}>
              <TabsList className="grid h-auto w-full grid-cols-2">
                <TabsTrigger value="registered" className="whitespace-normal">Cliente cadastrado</TabsTrigger>
                <TabsTrigger value="guest" className="whitespace-normal">Sem cadastro</TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="grid gap-3 sm:grid-cols-2">
              {form.mode === "guest" ? (
                <>
                  <Field label="Nome *">
                    <Input aria-label="Nome do contato" value={form.contact_name} maxLength={120} onChange={(e) => set("contact_name", e.target.value)} />
                  </Field>
                  <Field label="Telefone / WhatsApp *">
                    <Input aria-label="Telefone do contato" type="tel" value={form.contact_phone} maxLength={30} onChange={(e) => set("contact_phone", e.target.value)} />
                  </Field>
                </>
              ) : (
                <>
              <Field label="Cliente *">
                <Select
                  value={form.client_id}
                  onValueChange={(v) => {
                    const c = (clients ?? []).find((x: any) => x.id === v);
                    setForm((f) => ({
                      ...f,
                      client_id: v,
                      equipment_id: "",
                      address: c?.address ?? "",
                      number: c?.number ?? "",
                      district: c?.district ?? "",
                      city: c?.city ?? "",
                      complement: c?.complement ?? "",
                      cep: c?.zip_code ?? "",
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
                </>
              )}
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
            <div className="space-y-3 rounded-lg border border-border p-3">
              <p className="kpi-label flex items-center gap-1.5">
                <MapPin className="size-3.5" />
                Endereço do atendimento
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="CEP">
                  <CepInput value={form.cep} onChange={(cep) => set("cep", cep)}
                    onAddress={(address) => setForm((current) => {
                      const filled = mergePostalAddress({ ...current, state: "" }, address);
                      return { ...current, address: filled.address, district: filled.district, city: filled.city };
                    })} />
                </Field>
                <Field label="Logradouro">
                  <Input aria-label="Logradouro" value={form.address} maxLength={160} onChange={(e) => set("address", e.target.value)} />
                </Field>
                <Field label="Número">
                  <Input aria-label="Número" value={form.number} maxLength={20} onChange={(e) => set("number", e.target.value)} />
                </Field>
                <Field label="Bairro">
                  <Input aria-label="Bairro" value={form.district} maxLength={80} onChange={(e) => set("district", e.target.value)} />
                </Field>
                <Field label="Cidade">
                  <Input aria-label="Cidade" value={form.city} maxLength={80} onChange={(e) => set("city", e.target.value)} />
                </Field>
                <Field label="Complemento">
                  <Input aria-label="Complemento" value={form.complement} maxLength={80} onChange={(e) => set("complement", e.target.value)} />
                </Field>
              </div>
            </div>
            <Field label="Observações">
              <Textarea value={form.notes} rows={2} maxLength={600} onChange={(e) => set("notes", e.target.value)} />
            </Field>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={() => save.mutate()} disabled={save.isPending}>
              {editing ? "Salvar" : "Agendar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
