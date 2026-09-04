import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, ArrowDownUp, Pencil, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, EmptyState } from "@/components/page-header";
import { Field } from "./clientes.index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PRODUCT_CATEGORIES, brl, dateTimeBR, num } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/estoque")({
  head: () => ({
    meta: [
      { title: "Estoque de peças | MEC Frio Refrigeração" },
      { name: "description", content: "Controle de estoque de peças e materiais de refrigeração com alerta de estoque mínimo." },
      { property: "og:title", content: "Estoque de peças | MEC Frio Refrigeração" },
      { property: "og:description", content: "Peças, materiais, custos, preços de venda e movimentações de estoque." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: StockPage,
});

const empty = {
  name: "",
  code: "",
  category: PRODUCT_CATEGORIES[0]!,
  unit: "un",
  stock: "0",
  min_stock: "0",
  cost: "0",
  price: "0",
  supplier: "",
};

function StockPage() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<typeof empty>(empty);
  const [moveFor, setMoveFor] = useState<any>(null);
  const [move, setMove] = useState({ kind: "entrada", quantity: "1", reason: "" });

  const { data: products } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: movements } = useQuery({
    queryKey: ["inventory_movements"],
    queryFn: async () =>
      (
        await supabase
          .from("inventory_movements")
          .select("*, products(name, unit)")
          .order("created_at", { ascending: false })
          .limit(20)
      ).data ?? [],
  });

  const save = useMutation({
    mutationFn: async () => {
      const parsed = z
        .object({ name: z.string().trim().min(2, "Informe o nome da peça").max(140) })
        .safeParse(form);
      if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Dados inválidos");
      const payload = {
        name: form.name.trim(),
        code: form.code || null,
        category: form.category,
        unit: form.unit || "un",
        stock: num(form.stock),
        min_stock: num(form.min_stock),
        cost: num(form.cost),
        price: num(form.price),
        supplier: form.supplier || null,
      };
      const { error } = editId
        ? await supabase.from("products").update(payload).eq("id", editId)
        : await supabase.from("products").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Peça salva");
      setOpen(false);
      setForm(empty);
      setEditId(null);
      qc.invalidateQueries({ queryKey: ["products"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Falha ao salvar peça"),
  });

  const registerMove = useMutation({
    mutationFn: async () => {
      const qty = num(move.quantity);
      if (qty <= 0) throw new Error("Informe uma quantidade válida");
      const delta = move.kind === "entrada" ? qty : -qty;
      const { error: e1 } = await supabase
        .from("products")
        .update({ stock: Number(moveFor.stock) + delta })
        .eq("id", moveFor.id);
      if (e1) throw e1;
      const { error: e2 } = await supabase.from("inventory_movements").insert({
        product_id: moveFor.id,
        quantity: qty,
        kind: move.kind,
        reason: move.reason || null,
      });
      if (e2) throw e2;
    },
    onSuccess: () => {
      toast.success("Movimentação registrada");
      setMoveFor(null);
      setMove({ kind: "entrada", quantity: "1", reason: "" });
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["inventory_movements"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Falha ao movimentar estoque"),
  });

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return (products ?? []).filter((p: any) =>
      !term
        ? true
        : [p.name, p.code, p.category, p.supplier]
            .filter(Boolean)
            .some((v: string) => String(v).toLowerCase().includes(term)),
    );
  }, [products, q]);

  const low = (products ?? []).filter((p: any) => Number(p.stock) <= Number(p.min_stock));
  const totalValue = (products ?? []).reduce((a: number, p: any) => a + Number(p.stock) * Number(p.cost), 0);
  const set = (k: keyof typeof empty, v: any) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="space-y-5">
      <PageHeader
        title="Estoque de peças"
        description="Peças e materiais com baixa automática ao usar em ordens de serviço."
        actions={
          <Button
            onClick={() => {
              setForm(empty);
              setEditId(null);
              setOpen(true);
            }}
          >
            <Plus className="size-4" />
            Nova peça
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="surface-panel p-4">
          <p className="kpi-label">Itens cadastrados</p>
          <p className="mt-1 font-display text-xl font-bold">{products?.length ?? 0}</p>
        </div>
        <div className="surface-panel p-4">
          <p className="kpi-label">Valor em estoque (custo)</p>
          <p className="mt-1 font-display text-xl font-bold">{brl(totalValue)}</p>
        </div>
        <div className="surface-panel p-4">
          <p className="kpi-label">Alertas de estoque mínimo</p>
          <p className={`mt-1 font-display text-xl font-bold ${low.length ? "text-destructive" : ""}`}>
            {low.length}
          </p>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar peça, código, categoria ou fornecedor"
          className="pl-9"
          maxLength={80}
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="Nenhuma peça cadastrada" description="Cadastre compressores, capacitores, filtros e materiais." />
      ) : (
        <div className="surface-panel overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border text-left">
              <tr className="text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3">Peça</th>
                <th className="px-4 py-3">Categoria</th>
                <th className="px-4 py-3">Estoque</th>
                <th className="px-4 py-3">Custo</th>
                <th className="px-4 py-3">Venda</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((p: any) => {
                const alert = Number(p.stock) <= Number(p.min_stock);
                return (
                  <tr key={p.id}>
                    <td className="px-4 py-3">
                      <p className="font-semibold">{p.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {[p.code, p.supplier].filter(Boolean).join(" • ") || "—"}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{p.category ?? "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`font-semibold ${alert ? "text-destructive" : ""}`}>
                        {Number(p.stock)} {p.unit}
                      </span>
                      {alert && (
                        <span className="ml-1 inline-flex items-center text-xs text-destructive">
                          <AlertTriangle className="size-3" />
                        </span>
                      )}
                      <p className="text-xs text-muted-foreground">mín. {Number(p.min_stock)}</p>
                    </td>
                    <td className="px-4 py-3">{brl(p.cost)}</td>
                    <td className="px-4 py-3 font-semibold text-primary">{brl(p.price)}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <Button size="icon" variant="ghost" onClick={() => setMoveFor(p)} title="Movimentar estoque">
                          <ArrowDownUp className="size-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => {
                            setForm({
                              name: p.name,
                              code: p.code ?? "",
                              category: p.category ?? PRODUCT_CATEGORIES[0]!,
                              unit: p.unit,
                              stock: String(p.stock),
                              min_stock: String(p.min_stock),
                              cost: String(p.cost),
                              price: String(p.price),
                              supplier: p.supplier ?? "",
                            });
                            setEditId(p.id);
                            setOpen(true);
                          }}
                        >
                          <Pencil className="size-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="surface-panel p-5">
        <h2 className="font-display text-base font-semibold">Últimas movimentações</h2>
        <div className="mt-3 divide-y divide-border">
          {(movements ?? []).map((m: any) => (
            <div key={m.id} className="flex items-center justify-between py-2 text-sm">
              <span>
                <span className="font-semibold">{m.products?.name}</span>
                <span className="block text-xs text-muted-foreground">
                  {dateTimeBR(m.created_at)} • {m.reason ?? m.kind}
                </span>
              </span>
              <span className={m.kind === "entrada" ? "text-success" : "text-warning"}>
                {m.kind === "entrada" ? "+" : "-"}
                {Number(m.quantity)} {m.products?.unit}
              </span>
            </div>
          ))}
          {!movements?.length && <p className="py-3 text-sm text-muted-foreground">Nenhuma movimentação.</p>}
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{editId ? "Editar peça" : "Nova peça"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Nome *">
              <Input value={form.name} maxLength={140} onChange={(e) => set("name", e.target.value)} />
            </Field>
            <Field label="Código">
              <Input value={form.code} maxLength={60} onChange={(e) => set("code", e.target.value)} />
            </Field>
            <Field label="Categoria">
              <Select value={form.category} onValueChange={(v) => set("category", v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRODUCT_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Unidade">
              <Input value={form.unit} maxLength={10} onChange={(e) => set("unit", e.target.value)} />
            </Field>
            <Field label="Estoque atual">
              <Input inputMode="decimal" value={form.stock} onChange={(e) => set("stock", e.target.value)} />
            </Field>
            <Field label="Estoque mínimo">
              <Input inputMode="decimal" value={form.min_stock} onChange={(e) => set("min_stock", e.target.value)} />
            </Field>
            <Field label="Custo (R$)">
              <Input inputMode="decimal" value={form.cost} onChange={(e) => set("cost", e.target.value)} />
            </Field>
            <Field label="Preço de venda (R$)">
              <Input inputMode="decimal" value={form.price} onChange={(e) => set("price", e.target.value)} />
            </Field>
            <Field label="Fornecedor">
              <Input value={form.supplier} maxLength={120} onChange={(e) => set("supplier", e.target.value)} />
            </Field>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={() => save.mutate()} disabled={save.isPending}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!moveFor} onOpenChange={(o) => !o && setMoveFor(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Movimentar estoque — {moveFor?.name}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <Field label="Tipo">
              <Select value={move.kind} onValueChange={(v) => setMove((m) => ({ ...m, kind: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="entrada">Entrada</SelectItem>
                  <SelectItem value="saida">Saída</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Quantidade">
              <Input
                inputMode="decimal"
                value={move.quantity}
                onChange={(e) => setMove((m) => ({ ...m, quantity: e.target.value }))}
              />
            </Field>
            <Field label="Motivo">
              <Input
                value={move.reason}
                maxLength={160}
                onChange={(e) => setMove((m) => ({ ...m, reason: e.target.value }))}
                placeholder="Compra, ajuste, uso em serviço…"
              />
            </Field>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setMoveFor(null)}>
              Cancelar
            </Button>
            <Button onClick={() => registerMove.mutate()} disabled={registerMove.isPending}>
              Registrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
