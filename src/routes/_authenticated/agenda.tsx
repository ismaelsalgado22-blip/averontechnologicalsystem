import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarClock, Plus } from "lucide-react";
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

export const Route = createFileRoute("/_authenticated/agenda")({
  head: () => ({
    meta: [
      { title: "Agenda de atendimentos | Averon" },
      { name: "description", content: "Agende visitas técnicas e manutenções preventivas com confirmação por WhatsApp." },
      { property: "og:title", content: "Agenda de atendimentos | Averon" },
      { property: "og:description", content: "Visitas técnicas, manutenções preventivas e rota do dia da equipe." },
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
  notes: "",
};

function SchedulePage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const { data: appointments } = useQuery({
    queryKey: ["appointments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appointments")
        .select("*, clients(name, phone, whatsapp, address, city), equipment(type, brand)")
        .order("scheduled_at");
      if (error) throw error;
      return data;
    },
  });
  const { data: clients } = useQuery({
    queryKey: ["clients"],
    queryFn: async () =>
      (await supabase.from("clients").select("id, name, phone, whatsapp, address, city").order("name")).data ?? [],
  });
  const { data: equipment } = useQuery({
    queryKey: ["equipment", "all"],
    queryFn: async () => (await supabase.from("equipment").select("id, client_id, type, brand")).data ?? [],
  });

  const create = useMutation({
    mutationFn: async () => {
      if (!form.client_id) throw new Error("Selecione o cliente");
      const scheduled = new Date(`${form.date}T${form.time || "09:00"}:00`);
      const { error } = await supabase.from("appointments").insert({
        client_id: form.client_id,
        equipment_id: form.equipment_id || null,
        title: form.title.trim() || "Visita técnica",
        technician_name: form.technician_name || null,
        scheduled_at: scheduled.toISOString(),
        duration_minutes: Number(form.duration_minutes) || 60,
        address: form.address || null,
        status: form.status,
        reported_problem: form.reported_problem.trim() || null,
        notes: form.notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Atendimento agendado");
      setOpen(false);
      setForm(emptyForm);
      qc.invalidateQueries({ queryKey: ["appointments"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Falha ao agendar"),
  });

  const changeStatus = useMutation({
    mutationFn: async ({ id, value }: { id: string; value: string }) => {
      const { error } = await supabase.from("appointments").update({ status: value }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["appointments"] }),
    onError: () => toast.error("Falha ao atualizar status"),
  });

  const groups = useMemo(() => {
    const map = new Map<string, any[]>();
    (appointments ?? []).forEach((a: any) => {
      const day = String(a.scheduled_at).slice(0, 10);
      map.set(day, [...(map.get(day) ?? []), a]);
    });
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [appointments]);

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
              setOpen(true);
            }}
          >
            <Plus className="size-4" />
            Novo agendamento
          </Button>
        }
      />

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
                  <div key={a.id} className="surface-panel flex flex-wrap items-start justify-between gap-3 p-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-display text-sm font-bold">
                          {String(a.scheduled_at).slice(11, 16)}
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
                      {a.reported_problem && (
                        <div className="mt-2 rounded-md bg-muted/60 p-2">
                          <p className="text-xs font-semibold">Problema relatado</p>
                          <p className="whitespace-pre-wrap text-xs text-muted-foreground">{a.reported_problem}</p>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Select value={a.status ?? ""} onValueChange={(value) => changeStatus.mutate({ id: a.id, value })}>
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
                          data: dateBR(a.scheduled_at),
                          horario: String(a.scheduled_at).slice(11, 16),
                        }}
                      />
                      <DeleteButton
                        table="appointments"
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
            <DialogTitle>Novo agendamento</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Cliente *">
                <Select
                  value={form.client_id}
                  onValueChange={(v) => {
                    const c = (clients ?? []).find((x: any) => x.id === v);
                    setForm((f) => ({
                      ...f,
                      client_id: v,
                      equipment_id: "",
                      address: [c?.address, c?.city].filter(Boolean).join(", "),
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
            <Field label="Endereço do atendimento">
              <Input value={form.address} maxLength={200} onChange={(e) => set("address", e.target.value)} />
            </Field>
            <Field label="Problema relatado">
              <Textarea
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
              Agendar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
