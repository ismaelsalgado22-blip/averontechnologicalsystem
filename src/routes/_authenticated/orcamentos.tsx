import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileDown, Plus, Search, Trash2, Wrench } from "lucide-react";
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
import { BUDGET_STATUS, addDays, brl, dateBR, num, today } from "@/lib/format";
import { budgetPdf } from "@/lib/pdf";
import { useCompany, FALLBACK_COMPANY } from "@/hooks/use-company";

export const Route = createFileRoute("/_authenticated/orcamentos")({
  head: () => ({
    meta: [
      { title: "Orçamentos | MEC Frio Refrigeração" },
      { name: "description", content: "Crie orçamentos numerados com peças, mão de obra, taxa de deslocamento e envio por WhatsApp." },
      { property: "og:title", content: "Orçamentos | MEC Frio Refrigeração" },
      { property: "og:description", content: "Orçamentos profissionais em PDF com aprovação e conversão em ordem de serviço." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: BudgetsPage,
});

type Item = {
  kind: "servico" | "peca";
  description: string;
  quantity: string;
  unit_price: string;
  product_id?: string | null;
  service_id?: string | null;
};

const emptyForm = {
  client_id: "",
  equipment_id: "",
  issue_date: today(),
  valid_until: addDays(today(), 15),
  problem_description: "",
  discount: "0",
  travel_fee: "0",
  payment_conditions: "",
  deadline: "",
  notes: "",
};

function BudgetsPage() {
  const qc = useQueryClient();
  const { data: company } = useCompany();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("todos");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [items, setItems] = useState<Item[]>([]);

  const { data: budgets } = useQuery({
    queryKey: ["budgets"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("budgets")
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
  const { data: services } = useQuery({
    queryKey: ["services", "active"],
    queryFn: async () =>
      (await supabase.from("services").select("id, name, labor_price").eq("active", true).order("name")).data ?? [],
  });
  const { data: products } = useQuery({
    queryKey: ["products", "list"],
    queryFn: async () => (await supabase.from("products").select("id, name, price, unit").order("name")).data ?? [],
  });

  const laborTotal = items
    .filter((i) => i.kind === "servico")
    .reduce((a, i) => a + num(i.quantity) * num(i.unit_price), 0);
  const itemsTotal = items
    .filter((i) => i.kind === "peca")
    .reduce((a, i) => a + num(i.quantity) * num(i.unit_price), 0);
  const total = Math.max(0, laborTotal + itemsTotal + num(form.travel_fee) - num(form.discount));

  const create = useMutation({
    mutationFn: async () => {
      if (!form.client_id) throw new Error("Selecione o cliente");
      if (!items.length) throw new Error("Adicione pelo menos um item ao orçamento");
      const { data, error } = await supabase
        .from("budgets")
        .insert({
          client_id: form.client_id,
          equipment_id: form.equipment_id || null,
          issue_date: form.issue_date,
          valid_until: form.valid_until || null,
          problem_description: form.problem_description || null,
          discount: num(form.discount),
          travel_fee: num(form.travel_fee),
          labor_total: laborTotal,
          items_total: itemsTotal,
          total,
          payment_conditions: form.payment_conditions || null,
          deadline: form.deadline || null,
          notes: form.notes || null,
          status: "rascunho",
        })
        .select("id")
        .single();
      if (error) throw error;
      const { error: e2 } = await supabase.from("budget_items").insert(
        items.map((i) => ({
          budget_id: data.id,
          kind: i.kind,
          description: i.description,
          quantity: num(i.quantity),
          unit_price: num(i.unit_price),
          total: num(i.quantity) * num(i.unit_price),
          product_id: i.product_id || null,
          service_id: i.service_id || null,
        })),
      );
      if (e2) throw e2;
    },
    onSuccess: () => {
      toast.success("Orçamento criado");
      setOpen(false);
      setForm(emptyForm);
      setItems([]);
      qc.invalidateQueries({ queryKey: ["budgets"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Falha ao criar orçamento"),
  });

  const changeStatus = useMutation({
    mutationFn: async ({ id, value }: { id: string; value: string }) => {
      const { error } = await supabase.from("budgets").update({ status: value as any }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Status atualizado");
      qc.invalidateQueries({ queryKey: ["budgets"] });
    },
    onError: () => toast.error("Falha ao atualizar status"),
  });

  const convert = useMutation({
    mutationFn: async (budget: any) => {
      const { data: bItems } = await supabase.from("budget_items").select("*").eq("budget_id", budget.id);
      const { data: order, error } = await supabase
        .from("work_orders")
        .insert({
          client_id: budget.client_id,
          equipment_id: budget.equipment_id,
          budget_id: budget.id,
          service_date: today(),
          reported_problem: budget.problem_description,
          status: "aberta",
          total: budget.total,
        })
        .select("id")
        .single();
      if (error) throw error;
      const parts = (bItems ?? []).filter((i: any) => i.kind === "peca");
      if (parts.length) {
        await supabase.from("work_order_items").insert(
          parts.map((i: any) => ({
            work_order_id: order.id,
            kind: i.kind,
            description: i.description,
            quantity: i.quantity,
            unit_price: i.unit_price,
            total: i.total,
            product_id: i.product_id,
          })),
        );
      }
    },
    onSuccess: () => {
      toast.success("Ordem de serviço gerada a partir do orçamento");
      qc.invalidateQueries({ queryKey: ["work_orders"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Falha ao converter orçamento"),
  });

  const downloadPdf = async (budget: any) => {
    const { data: bItems } = await supabase.from("budget_items").select("*").eq("budget_id", budget.id);
    const { data: client } = await supabase.from("clients").select("*").eq("id", budget.client_id).maybeSingle();
    const eq = budget.equipment_id
      ? (await supabase.from("equipment").select("*").eq("id", budget.equipment_id).maybeSingle()).data
      : null;
    await budgetPdf({
      company: company ?? FALLBACK_COMPANY,
      budget,
      items: bItems ?? [],
      client,
      equipment: eq,
    });
  };

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return (budgets ?? []).filter((b: any) => {
      const okStatus = status === "todos" || b.status === status;
      const okTerm =
        !term ||
        [b.number, b.clients?.name, b.problem_description]
          .filter(Boolean)
          .some((v: string) => String(v).toLowerCase().includes(term));
      return okStatus && okTerm;
    });
  }, [budgets, q, status]);

  const set = (k: keyof typeof emptyForm, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const clientEquip = (equipment ?? []).filter((e: any) => e.client_id === form.client_id);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Orçamentos"
        description="Monte propostas com peças e mão de obra, envie por WhatsApp e converta em OS."
        actions={
          <Button
            onClick={() => {
              setForm(emptyForm);
              setItems([]);
              setOpen(true);
            }}
          >
            <Plus className="size-4" />
            Novo orçamento
          </Button>
        }
      />

      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por número, cliente ou problema"
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
            {Object.entries(BUDGET_STATUS).map(([k, v]) => (
              <SelectItem key={k} value={k}>
                {v.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="Nenhum orçamento encontrado" description="Crie o primeiro orçamento para começar." />
      ) : (
        <div className="space-y-3">
          {filtered.map((b: any) => (
            <div key={b.id} className="surface-panel p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-display text-base font-bold">{b.number}</span>
                    <StatusPill label={BUDGET_STATUS[b.status]?.label ?? b.status} tone={BUDGET_STATUS[b.status]?.tone ?? ""} />
                  </div>
                  <p className="text-sm font-semibold">{b.clients?.name}</p>
                  <p className="text-xs text-muted-foreground">
                    Emitido {dateBR(b.issue_date)}
                    {b.valid_until ? ` • válido até ${dateBR(b.valid_until)}` : ""}
                    {b.equipment ? ` • ${b.equipment.type}` : ""}
                  </p>
                  {b.problem_description && (
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{b.problem_description}</p>
                  )}
                </div>
                <div className="text-right">
                  <p className="kpi-label">Total</p>
                  <p className="font-display text-lg font-bold text-primary">{brl(b.total)}</p>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Select value={b.status ?? ""} onValueChange={(value) => changeStatus.mutate({ id: b.id, value })}>
                  <SelectTrigger className="h-8 w-44 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(BUDGET_STATUS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>
                        {v.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button size="sm" variant="secondary" onClick={() => downloadPdf(b)}>
                  <FileDown className="size-4" />
                  PDF
                </Button>
                <WhatsAppButton
                  phone={b.clients?.whatsapp ?? b.clients?.phone}
                  template="orcamento"
                  vars={{
                    nome: b.clients?.name,
                    documento: b.number,
                    valor: brl(b.total),
                    data: b.valid_until ? dateBR(b.valid_until) : undefined,
                    equipamento: b.equipment ? `${b.equipment.type} ${b.equipment.brand ?? ""}` : undefined,
                  }}
                />
                <Button size="sm" variant="outline" onClick={() => convert.mutate(b)} disabled={convert.isPending}>
                  <Wrench className="size-4" />
                  Gerar OS
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Novo orçamento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Cliente *">
                <Select value={form.client_id ?? ""} onValueChange={(v) => setForm((f) => ({ ...f, client_id: v, equipment_id: "" }))}>
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
                    <SelectValue placeholder={clientEquip.length ? "Selecione" : "Nenhum equipamento do cliente"} />
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
              <Field label="Data de emissão">
                <Input type="date" value={form.issue_date} onChange={(e) => set("issue_date", e.target.value)} />
              </Field>
              <Field label="Validade">
                <Input type="date" value={form.valid_until} onChange={(e) => set("valid_until", e.target.value)} />
              </Field>
            </div>
            <Field label="Problema relatado / escopo">
              <Textarea
                value={form.problem_description}
                rows={3}
                maxLength={1200}
                onChange={(e) => set("problem_description", e.target.value)}
              />
            </Field>

            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="kpi-label">Itens do orçamento</h3>
                <div className="flex gap-2">
                  <Select
                    value=""
                    onValueChange={(id) => {
                      const s = (services ?? []).find((x: any) => x.id === id);
                      if (s)
                        setItems((prev) => [
                          ...prev,
                          {
                            kind: "servico",
                            description: s.name,
                            quantity: "1",
                            unit_price: String(s.labor_price),
                            service_id: s.id,
                          },
                        ]);
                    }}
                  >
                    <SelectTrigger className="h-8 w-40 text-xs">
                      <SelectValue placeholder="+ Serviço" />
                    </SelectTrigger>
                    <SelectContent>
                      {(services ?? []).map((s: any) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value=""
                    onValueChange={(id) => {
                      const p = (products ?? []).find((x: any) => x.id === id);
                      if (p)
                        setItems((prev) => [
                          ...prev,
                          {
                            kind: "peca",
                            description: p.name,
                            quantity: "1",
                            unit_price: String(p.price),
                            product_id: p.id,
                          },
                        ]);
                    }}
                  >
                    <SelectTrigger className="h-8 w-40 text-xs">
                      <SelectValue placeholder="+ Peça" />
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
                    onClick={() =>
                      setItems((prev) => [...prev, { kind: "servico", description: "", quantity: "1", unit_price: "0" }])
                    }
                  >
                    Item livre
                  </Button>
                </div>
              </div>

              {items.length === 0 ? (
                <p className="rounded-md border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
                  Adicione serviços e peças ao orçamento.
                </p>
              ) : (
                <div className="space-y-2">
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
                        onChange={(e) =>
                          setItems((p) => p.map((x, i) => (i === idx ? { ...x, quantity: e.target.value } : x)))
                        }
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
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setItems((p) => p.filter((_, i) => i !== idx))}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="grid gap-3 sm:grid-cols-4">
              <Field label="Taxa de deslocamento">
                <Input inputMode="decimal" value={form.travel_fee} onChange={(e) => set("travel_fee", e.target.value)} />
              </Field>
              <Field label="Desconto">
                <Input inputMode="decimal" value={form.discount} onChange={(e) => set("discount", e.target.value)} />
              </Field>
              <Field label="Prazo de execução">
                <Input value={form.deadline} maxLength={80} onChange={(e) => set("deadline", e.target.value)} />
              </Field>
              <Field label="Condições de pagamento">
                <Input
                  value={form.payment_conditions}
                  maxLength={140}
                  onChange={(e) => set("payment_conditions", e.target.value)}
                />
              </Field>
            </div>

            <Field label="Observações">
              <Textarea value={form.notes} rows={2} maxLength={800} onChange={(e) => set("notes", e.target.value)} />
            </Field>

            <div className="flex flex-wrap justify-end gap-6 rounded-md bg-muted p-4 text-sm">
              <span>Mão de obra: <strong>{brl(laborTotal)}</strong></span>
              <span>Peças: <strong>{brl(itemsTotal)}</strong></span>
              <span className="font-display text-base">
                Total: <strong className="text-primary">{brl(total)}</strong>
              </span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={() => create.mutate()} disabled={create.isPending}>
              Salvar orçamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
