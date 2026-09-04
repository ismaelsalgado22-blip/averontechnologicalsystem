import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Plus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, StatusPill, EmptyState } from "@/components/page-header";
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
import { PAY_METHODS, PAY_METHOD_LABEL, PAY_STATUS, brl, dateBR, num, today } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/financeiro")({
  head: () => ({
    meta: [
      { title: "Financeiro | MEC Frio Refrigeração" },
      { name: "description", content: "Contas a receber, formas de pagamento, faturamento do mês e inadimplência." },
      { property: "og:title", content: "Financeiro | MEC Frio Refrigeração" },
      { property: "og:description", content: "Controle de recebimentos por cliente, com vencimentos e baixa de pagamentos." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: FinancePage,
});

const emptyForm = {
  client_id: "",
  work_order_id: "",
  description: "",
  amount: "0",
  due_date: today(),
  method: "pix",
  installments: "1",
  status: "pendente",
  notes: "",
};

function FinancePage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState("todos");
  const [form, setForm] = useState(emptyForm);

  const { data: payments } = useQuery({
    queryKey: ["payments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payments")
        .select("*, clients(name), work_orders(number)")
        .order("due_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  const { data: clients } = useQuery({
    queryKey: ["clients"],
    queryFn: async () => (await supabase.from("clients").select("id, name").order("name")).data ?? [],
  });
  const { data: orders } = useQuery({
    queryKey: ["work_orders", "list"],
    queryFn: async () =>
      (await supabase.from("work_orders").select("id, number, client_id, total").order("created_at", { ascending: false }))
        .data ?? [],
  });

  const create = useMutation({
    mutationFn: async () => {
      if (!form.client_id) throw new Error("Selecione o cliente");
      if (num(form.amount) <= 0) throw new Error("Informe o valor a receber");
      const { error } = await supabase.from("payments").insert({
        client_id: form.client_id,
        work_order_id: form.work_order_id || null,
        description: form.description || null,
        amount: num(form.amount),
        due_date: form.due_date,
        method: form.method as any,
        installments: Number(form.installments) || 1,
        status: form.status as any,
        paid_at: form.status === "pago" ? today() : null,
        notes: form.notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Lançamento criado");
      setOpen(false);
      setForm(emptyForm);
      qc.invalidateQueries({ queryKey: ["payments"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Falha ao lançar pagamento"),
  });

  const markPaid = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("payments").update({ status: "pago", paid_at: today() }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Pagamento confirmado");
      qc.invalidateQueries({ queryKey: ["payments"] });
    },
    onError: () => toast.error("Falha ao confirmar pagamento"),
  });

  const stats = useMemo(() => {
    const list = payments ?? [];
    const month = new Date().toISOString().slice(0, 7);
    const received = list
      .filter((p: any) => p.status === "pago" && String(p.paid_at ?? "").startsWith(month))
      .reduce((a: number, p: any) => a + Number(p.amount), 0);
    const pending = list
      .filter((p: any) => p.status === "pendente")
      .reduce((a: number, p: any) => a + Number(p.amount), 0);
    const overdue = list
      .filter((p: any) => p.status !== "pago" && p.status !== "cancelado" && p.due_date < today())
      .reduce((a: number, p: any) => a + Number(p.amount), 0);
    return { received, pending, overdue };
  }, [payments]);

  const filtered = (payments ?? []).filter((p: any) => status === "todos" || p.status === status);
  const set = (k: keyof typeof emptyForm, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const clientOrders = (orders ?? []).filter((o: any) => o.client_id === form.client_id);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Financeiro"
        description="Contas a receber por cliente, formas de pagamento e inadimplência."
        actions={
          <Button
            onClick={() => {
              setForm(emptyForm);
              setOpen(true);
            }}
          >
            <Plus className="size-4" />
            Novo lançamento
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="surface-panel p-4">
          <p className="kpi-label">Recebido no mês</p>
          <p className="mt-1 font-display text-xl font-bold text-success">{brl(stats.received)}</p>
        </div>
        <div className="surface-panel p-4">
          <p className="kpi-label">A receber</p>
          <p className="mt-1 font-display text-xl font-bold">{brl(stats.pending)}</p>
        </div>
        <div className="surface-panel p-4">
          <p className="kpi-label">Em atraso</p>
          <p className="mt-1 font-display text-xl font-bold text-destructive">{brl(stats.overdue)}</p>
        </div>
      </div>

      <Select value={status ?? ""} onValueChange={setStatus}>
        <SelectTrigger className="sm:w-56">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="todos">Todos os status</SelectItem>
          {Object.entries(PAY_STATUS).map(([k, v]) => (
            <SelectItem key={k} value={k}>
              {v.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {filtered.length === 0 ? (
        <EmptyState title="Nenhum lançamento" description="Registre os recebimentos dos serviços realizados." />
      ) : (
        <div className="surface-panel overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border text-left">
              <tr className="text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3">Cliente</th>
                <th className="px-4 py-3">Descrição</th>
                <th className="px-4 py-3">Vencimento</th>
                <th className="px-4 py-3">Forma</th>
                <th className="px-4 py-3">Valor</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((p: any) => {
                const late = p.status !== "pago" && p.status !== "cancelado" && p.due_date < today();
                const st = late ? PAY_STATUS["vencido"] : PAY_STATUS[p.status];
                return (
                  <tr key={p.id}>
                    <td className="px-4 py-3 font-semibold">{p.clients?.name}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {p.description ?? "—"}
                      {p.work_orders?.number ? ` (${p.work_orders.number})` : ""}
                    </td>
                    <td className="px-4 py-3">{dateBR(p.due_date)}</td>
                    <td className="px-4 py-3 text-xs">
                      {PAY_METHOD_LABEL[p.method] ?? p.method}
                      {p.installments > 1 ? ` ${p.installments}x` : ""}
                    </td>
                    <td className="px-4 py-3 font-semibold text-primary">{brl(p.amount)}</td>
                    <td className="px-4 py-3">
                      <StatusPill label={st?.label ?? p.status} tone={st?.tone ?? ""} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      {p.status !== "pago" && p.status !== "cancelado" && (
                        <Button size="sm" variant="secondary" onClick={() => markPaid.mutate(p.id)}>
                          <CheckCircle2 className="size-4" />
                          Receber
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Novo lançamento</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Cliente *">
                <Select
                  value={form.client_id}
                  onValueChange={(v) => setForm((f) => ({ ...f, client_id: v, work_order_id: "" }))}
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
              <Field label="Ordem de serviço">
                <Select
                  value={form.work_order_id}
                  onValueChange={(v) => {
                    const o = clientOrders.find((x: any) => x.id === v);
                    setForm((f) => ({
                      ...f,
                      work_order_id: v,
                      amount: o ? String(o.total) : f.amount,
                      description: o ? `Serviço ${o.number}` : f.description,
                    }));
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
              <Field label="Valor (R$)">
                <Input inputMode="decimal" value={form.amount} onChange={(e) => set("amount", e.target.value)} />
              </Field>
              <Field label="Vencimento">
                <Input type="date" value={form.due_date} onChange={(e) => set("due_date", e.target.value)} />
              </Field>
              <Field label="Forma de pagamento">
                <Select value={form.method ?? ""} onValueChange={(v) => set("method", v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAY_METHODS.map((m) => (
                      <SelectItem key={m} value={m}>
                        {PAY_METHOD_LABEL[m]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Parcelas">
                <Input
                  inputMode="numeric"
                  value={form.installments}
                  onChange={(e) => set("installments", e.target.value)}
                />
              </Field>
              <Field label="Status">
                <Select value={form.status ?? ""} onValueChange={(v) => set("status", v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(PAY_STATUS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>
                        {v.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Descrição">
                <Input value={form.description} maxLength={160} onChange={(e) => set("description", e.target.value)} />
              </Field>
            </div>
            <Field label="Observações">
              <Textarea value={form.notes} rows={2} maxLength={600} onChange={(e) => set("notes", e.target.value)} />
            </Field>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={() => create.mutate()} disabled={create.isPending}>
              Salvar lançamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
