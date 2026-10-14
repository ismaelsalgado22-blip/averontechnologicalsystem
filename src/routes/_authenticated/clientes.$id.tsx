import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Pencil } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, StatusPill } from "@/components/page-header";
import { WhatsAppButton } from "@/components/whatsapp-button";
import { ClientForm, Field } from "./clientes.index";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BUDGET_STATUS, WO_STATUS, brl, dateBR, dateTimeBR, warrantyState } from "@/lib/format";
import { DeleteButton } from "@/components/delete-button";

export const Route = createFileRoute("/_authenticated/clientes/$id")({
  head: () => ({
    meta: [
      { title: "Ficha do cliente | Averon" },
      { name: "description", content: "Histórico completo do cliente: equipamentos, orçamentos, ordens de serviço e garantias." },
      { property: "og:title", content: "Ficha do cliente | Averon" },
      { property: "og:description", content: "Histórico de atendimentos e documentos do cliente." },
      { name: "robots", content: "noindex" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ClientDetail,
});

function ClientDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<any>(null);

  const { data } = useQuery({
    queryKey: ["client", id],
    queryFn: async () => {
      const [client, equipment, budgets, orders, warranties, reports, payments, logs, appointments] =
        await Promise.all([
          supabase.from("clients").select("*").eq("id", id).maybeSingle(),
          supabase.from("equipment").select("*").eq("client_id", id).order("created_at"),
          supabase.from("budgets").select("*").eq("client_id", id).order("issue_date", { ascending: false }),
          supabase.from("work_orders").select("*").eq("client_id", id).order("service_date", { ascending: false }),
          supabase.from("warranties").select("*").eq("client_id", id).order("end_date", { ascending: false }),
          supabase.from("technical_reports").select("*").eq("client_id", id).order("inspection_date", { ascending: false }),
          supabase.from("payments").select("*").eq("client_id", id).order("due_date", { ascending: false }),
          supabase.from("activity_logs").select("*").eq("client_id", id).order("created_at", { ascending: false }).limit(30),
          supabase.from("appointments").select("*").eq("client_id", id).order("scheduled_at", { ascending: false }),
        ]);
      return {
        client: client.data,
        equipment: equipment.data ?? [],
        budgets: budgets.data ?? [],
        orders: orders.data ?? [],
        warranties: warranties.data ?? [],
        reports: reports.data ?? [],
        payments: payments.data ?? [],
        logs: logs.data ?? [],
        appointments: appointments.data ?? [],
      };
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      const payload = Object.fromEntries(
        Object.entries(form).map(([k, v]) => [k, v === "" ? null : v]),
      );
      const { error } = await supabase.from("clients").update(payload as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Cliente atualizado");
      setEditing(false);
      qc.invalidateQueries({ queryKey: ["client", id] });
      qc.invalidateQueries({ queryKey: ["clients"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Falha ao atualizar"),
  });

  const c = data?.client;
  const totalFaturado = (data?.orders ?? []).reduce((a: number, o: any) => a + Number(o.total ?? 0), 0);

  if (!c) return <p className="text-sm text-muted-foreground">Carregando ficha do cliente…</p>;

  return (
    <div className="space-y-5">
      <Button asChild variant="ghost" size="sm">
        <Link to="/clientes">
          <ArrowLeft className="size-4" />
          Voltar para clientes
        </Link>
      </Button>

      <PageHeader
        title={c.name}
        description={[c.trade_name, c.document, [c.city, c.state].filter(Boolean).join(" / ")]
          .filter(Boolean)
          .join(" • ")}
        actions={
          <>
            <WhatsAppButton phone={c.whatsapp ?? c.phone} vars={{ nome: c.name }} variant="outline" />
            <Button
              onClick={() => {
                const { id: _i, created_at, updated_at, created_by, ...rest } = c as any;
                setForm(Object.fromEntries(Object.entries(rest).map(([k, v]) => [k, v ?? ""])));
                setEditing(true);
              }}
            >
              <Pencil className="size-4" />
              Editar
            </Button>
            <DeleteButton
              table="clients"
              id={c.id}
              what="Cliente"
              name={c.name}
              invalidate={["clients", "dashboard"]}
              onDeleted={() => navigate({ to: "/clientes" })}
              withLabel
            />
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Equipamentos" value={String(data!.equipment.length)} />
        <Stat label="Ordens de serviço" value={String(data!.orders.length)} />
        <Stat label="Orçamentos" value={String(data!.budgets.length)} />
        <Stat label="Total em serviços" value={brl(totalFaturado)} />
      </div>

      <div className="surface-panel grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-3">
        <Info label="Telefone" value={c.phone} />
        <Info label="WhatsApp" value={c.whatsapp} />
        <Info label="E-mail" value={c.email} />
        <Info label="Contato" value={c.contact_person} />
        <Info label="Inscrição estadual" value={c.state_registration} />
        <Info label="CEP" value={c.zip_code} />
        <Info
          label="Endereço"
          value={[c.address, c.number, c.complement, c.district].filter(Boolean).join(", ")}
        />
        <Info label="Cidade / UF" value={[c.city, c.state].filter(Boolean).join(" / ")} />
        <Info label="Observações" value={c.notes} />
      </div>

      <Tabs defaultValue="equip">
        <TabsList className="flex-wrap">
          <TabsTrigger value="equip">Equipamentos</TabsTrigger>
          <TabsTrigger value="orc">Orçamentos</TabsTrigger>
          <TabsTrigger value="os">Ordens de serviço</TabsTrigger>
          <TabsTrigger value="laudos">Laudos</TabsTrigger>
          <TabsTrigger value="gar">Garantias</TabsTrigger>
          <TabsTrigger value="fin">Financeiro</TabsTrigger>
          <TabsTrigger value="hist">Histórico</TabsTrigger>
        </TabsList>

        <TabsContent value="equip" className="space-y-2">
          {data!.equipment.map((e: any) => (
            <Row
              key={e.id}
              title={`${e.type} ${e.brand ? `— ${e.brand}` : ""} ${e.model ?? ""}`}
              subtitle={[e.serial_number && `Série ${e.serial_number}`, e.install_location, e.refrigerant]
                .filter(Boolean)
                .join(" • ")}
              right={<Link to="/equipamentos" className="text-xs font-semibold text-primary">Gerenciar</Link>}
            />
          ))}
          {!data!.equipment.length && <Muted>Nenhum equipamento cadastrado.</Muted>}
        </TabsContent>

        <TabsContent value="orc" className="space-y-2">
          {data!.budgets.map((b: any) => (
            <Row
              key={b.id}
              title={`${b.number} — ${brl(b.total)}`}
              subtitle={`Emitido em ${dateBR(b.issue_date)} • validade ${dateBR(b.valid_until)}`}
              right={
                <div className="flex items-center gap-2">
                  <StatusPill
                    label={BUDGET_STATUS[b.status]?.label ?? b.status}
                    tone={BUDGET_STATUS[b.status]?.tone ?? ""}
                  />
                  <Link to="/orcamentos" className="text-xs font-semibold text-primary">
                    Abrir
                  </Link>
                </div>
              }
            />
          ))}
          {!data!.budgets.length && <Muted>Nenhum orçamento emitido.</Muted>}
        </TabsContent>

        <TabsContent value="os" className="space-y-2">
          {data!.orders.map((o: any) => (
            <Row
              key={o.id}
              title={`${o.number} — ${brl(o.total)}`}
              subtitle={`${dateBR(o.service_date)} • ${o.technician_name ?? "sem técnico"} • ${o.service_type ?? ""}`}
              right={
                <div className="flex items-center gap-2">
                  <StatusPill label={WO_STATUS[o.status]?.label ?? o.status} tone={WO_STATUS[o.status]?.tone ?? ""} />
                  <Link to="/ordens" className="text-xs font-semibold text-primary">
                    Abrir
                  </Link>
                </div>
              }
            />
          ))}
          {!data!.orders.length && <Muted>Nenhuma ordem de serviço registrada.</Muted>}
        </TabsContent>

        <TabsContent value="laudos" className="space-y-2">
          {data!.reports.map((r: any) => (
            <Row
              key={r.id}
              title={r.number}
              subtitle={`Inspeção em ${dateBR(r.inspection_date)} • ${r.technician_name ?? ""}`}
              right={
                <Link to="/laudos" className="text-xs font-semibold text-primary">
                  Abrir
                </Link>
              }
            />
          ))}
          {!data!.reports.length && <Muted>Nenhum laudo técnico emitido.</Muted>}
        </TabsContent>

        <TabsContent value="gar" className="space-y-2">
          {data!.warranties.map((w: any) => {
            const st = warrantyState(w.end_date);
            return (
              <Row
                key={w.id}
                title={`${w.number} — ${w.days} dias`}
                subtitle={`Serviço em ${dateBR(w.service_date)} • vence ${dateBR(w.end_date)}`}
                right={<StatusPill label={st.label} tone={st.tone} />}
              />
            );
          })}
          {!data!.warranties.length && <Muted>Nenhuma garantia emitida.</Muted>}
        </TabsContent>

        <TabsContent value="fin" className="space-y-2">
          {data!.payments.map((p: any) => (
            <Row
              key={p.id}
              title={`${brl(p.amount)} — ${p.description ?? "Pagamento"}`}
              subtitle={`Vencimento ${dateBR(p.due_date)} • ${p.method}`}
              right={<span className="text-xs font-semibold capitalize">{p.status}</span>}
            />
          ))}
          {!data!.payments.length && <Muted>Nenhum lançamento financeiro.</Muted>}
        </TabsContent>

        <TabsContent value="hist" className="space-y-2">
          {data!.appointments.map((a: any) => (
            <Row key={a.id} title={a.title} subtitle={`${dateTimeBR(a.scheduled_at)} • ${a.technician_name ?? ""}`} />
          ))}
          {data!.logs.map((l: any) => (
            <Row key={l.id} title={`${l.entity} — ${l.action}`} subtitle={`${dateTimeBR(l.created_at)} ${l.detail ?? ""}`} />
          ))}
          {!data!.logs.length && !data!.appointments.length && <Muted>Sem histórico registrado.</Muted>}
        </TabsContent>
      </Tabs>

      <Dialog open={editing} onOpenChange={setEditing}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar cliente</DialogTitle>
          </DialogHeader>
          {form && <ClientForm value={form} onChange={setForm} />}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditing(false)}>
              Cancelar
            </Button>
            <Button onClick={() => save.mutate()} disabled={save.isPending}>
              Salvar alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="surface-panel p-4">
      <p className="kpi-label">{label}</p>
      <p className="mt-1 font-display text-xl font-bold">{value}</p>
    </div>
  );
}

function Info({ label, value }: { label: string; value?: string | null }) {
  return (
    <Field label={label}>
      <p className="text-sm">{value || "—"}</p>
    </Field>
  );
}

function Row({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="surface-panel flex flex-wrap items-center justify-between gap-3 px-4 py-3">
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold">{title}</p>
        {subtitle && <p className="truncate text-xs text-muted-foreground">{subtitle}</p>}
      </div>
      {right}
    </div>
  );
}

function Muted({ children }: { children: React.ReactNode }) {
  return <p className="py-6 text-center text-sm text-muted-foreground">{children}</p>;
}
