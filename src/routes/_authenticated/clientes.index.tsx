import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, EmptyState } from "@/components/page-header";
import { WhatsAppButton } from "@/components/whatsapp-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { maskDoc, maskPhone } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/clientes/")({
  head: () => ({
    meta: [
      { title: "Clientes | MEC Frio Refrigeração" },
      { name: "description", content: "Cadastro de clientes pessoa física e jurídica com histórico de atendimentos." },
      { property: "og:title", content: "Clientes | MEC Frio Refrigeração" },
      { property: "og:description", content: "Cadastro e histórico de clientes da MEC Frio." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ClientsPage,
});

const schema = z.object({
  kind: z.enum(["pf", "pj"]),
  name: z.string().trim().min(3, "Informe o nome ou razão social").max(160),
  trade_name: z.string().trim().max(160).optional().or(z.literal("")),
  document: z.string().trim().max(20).optional().or(z.literal("")),
  state_registration: z.string().trim().max(30).optional().or(z.literal("")),
  contact_person: z.string().trim().max(120).optional().or(z.literal("")),
  phone: z.string().trim().max(20).optional().or(z.literal("")),
  whatsapp: z.string().trim().max(20).optional().or(z.literal("")),
  email: z.string().trim().max(160).email("E-mail inválido").optional().or(z.literal("")),
  zip_code: z.string().trim().max(12).optional().or(z.literal("")),
  address: z.string().trim().max(160).optional().or(z.literal("")),
  number: z.string().trim().max(12).optional().or(z.literal("")),
  complement: z.string().trim().max(80).optional().or(z.literal("")),
  district: z.string().trim().max(80).optional().or(z.literal("")),
  city: z.string().trim().max(80).optional().or(z.literal("")),
  state: z.string().trim().max(2).optional().or(z.literal("")),
  notes: z.string().trim().max(1000).optional().or(z.literal("")),
});

const empty = {
  kind: "pj" as "pf" | "pj",
  name: "",
  trade_name: "",
  document: "",
  state_registration: "",
  contact_person: "",
  phone: "",
  whatsapp: "",
  email: "",
  zip_code: "",
  address: "",
  number: "",
  complement: "",
  district: "",
  city: "",
  state: "",
  notes: "",
};

export function ClientForm({
  value,
  onChange,
}: {
  value: typeof empty;
  onChange: (v: typeof empty) => void;
}) {
  const set = (k: keyof typeof empty, v: string) => onChange({ ...value, [k]: v } as typeof empty);
  const pj = value.kind === "pj";
  return (
    <div className="space-y-4">
      <Tabs value={value.kind} onValueChange={(v) => set("kind", v)}>
        <TabsList>
          <TabsTrigger value="pj">Pessoa jurídica</TabsTrigger>
          <TabsTrigger value="pf">Pessoa física</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={pj ? "Razão social *" : "Nome completo *"}>
          <Input value={value.name} maxLength={160} onChange={(e) => set("name", e.target.value)} />
        </Field>
        {pj && (
          <Field label="Nome fantasia">
            <Input value={value.trade_name} maxLength={160} onChange={(e) => set("trade_name", e.target.value)} />
          </Field>
        )}
        <Field label={pj ? "CNPJ" : "CPF"}>
          <Input value={value.document} onChange={(e) => set("document", maskDoc(e.target.value))} />
        </Field>
        {pj && (
          <Field label="Inscrição estadual">
            <Input
              value={value.state_registration}
              maxLength={30}
              onChange={(e) => set("state_registration", e.target.value)}
            />
          </Field>
        )}
        <Field label={pj ? "Responsável / contato" : "Contato alternativo"}>
          <Input
            value={value.contact_person}
            maxLength={120}
            onChange={(e) => set("contact_person", e.target.value)}
          />
        </Field>
        <Field label="Telefone">
          <Input value={value.phone} onChange={(e) => set("phone", maskPhone(e.target.value))} />
        </Field>
        <Field label="WhatsApp">
          <Input value={value.whatsapp} onChange={(e) => set("whatsapp", maskPhone(e.target.value))} />
        </Field>
        <Field label="E-mail">
          <Input value={value.email} maxLength={160} onChange={(e) => set("email", e.target.value)} />
        </Field>
        <Field label="CEP">
          <Input value={value.zip_code} maxLength={12} onChange={(e) => set("zip_code", e.target.value)} />
        </Field>
        <Field label="Endereço">
          <Input value={value.address} maxLength={160} onChange={(e) => set("address", e.target.value)} />
        </Field>
        <Field label="Número">
          <Input value={value.number} maxLength={12} onChange={(e) => set("number", e.target.value)} />
        </Field>
        <Field label="Complemento">
          <Input value={value.complement} maxLength={80} onChange={(e) => set("complement", e.target.value)} />
        </Field>
        <Field label="Bairro">
          <Input value={value.district} maxLength={80} onChange={(e) => set("district", e.target.value)} />
        </Field>
        <Field label="Cidade">
          <Input value={value.city} maxLength={80} onChange={(e) => set("city", e.target.value)} />
        </Field>
        <Field label="UF">
          <Input
            value={value.state}
            maxLength={2}
            onChange={(e) => set("state", e.target.value.toUpperCase())}
          />
        </Field>
      </div>
      <Field label="Observações">
        <Textarea
          value={value.notes}
          rows={3}
          maxLength={1000}
          onChange={(e) => set("notes", e.target.value)}
        />
      </Field>
    </div>
  );
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs uppercase tracking-wide text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function ClientsPage() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);

  const { data: clients } = useQuery({
    queryKey: ["clients"],
    queryFn: async () => {
      const { data, error } = await supabase.from("clients").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      const parsed = schema.safeParse(form);
      if (!parsed.success) throw new Error(parsed.error.issues[0].message);
      const payload = Object.fromEntries(
        Object.entries(parsed.data).map(([k, v]) => [k, v === "" ? null : v]),
      );
      const { error } = await supabase.from("clients").insert(payload as any);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Cliente cadastrado");
      setOpen(false);
      setForm(empty);
      qc.invalidateQueries({ queryKey: ["clients"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Falha ao cadastrar cliente"),
  });

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return clients ?? [];
    return (clients ?? []).filter((c: any) =>
      [c.name, c.trade_name, c.document, c.city, c.phone, c.whatsapp, c.email]
        .filter(Boolean)
        .some((v: string) => String(v).toLowerCase().includes(term)),
    );
  }, [clients, q]);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Clientes"
        description="Cadastro completo de clientes com histórico de equipamentos e atendimentos."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="size-4" />
                Novo cliente
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Novo cliente</DialogTitle>
              </DialogHeader>
              <ClientForm value={form} onChange={setForm} />
              <DialogFooter>
                <Button variant="ghost" onClick={() => setOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={() => create.mutate()} disabled={create.isPending}>
                  Salvar cliente
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="relative">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por nome, documento, cidade ou telefone"
          className="pl-9"
          maxLength={80}
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="Nenhum cliente encontrado"
          description="Cadastre o primeiro cliente para começar a emitir orçamentos e ordens de serviço."
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((c: any) => (
            <div key={c.id} className="surface-panel flex flex-col gap-3 p-4">
              <div>
                <span className="kpi-label">{c.kind === "pj" ? "Pessoa jurídica" : "Pessoa física"}</span>
                <Link
                  to="/clientes/$id"
                  params={{ id: c.id }}
                  className="mt-1 block font-display text-base font-semibold hover:text-primary"
                >
                  {c.name}
                </Link>
                {c.trade_name && <p className="text-xs text-muted-foreground">{c.trade_name}</p>}
              </div>
              <div className="space-y-0.5 text-xs text-muted-foreground">
                {c.document && <p>{c.document}</p>}
                {(c.phone || c.whatsapp) && <p>{c.phone ?? c.whatsapp}</p>}
                {(c.city || c.state) && <p>{[c.city, c.state].filter(Boolean).join(" / ")}</p>}
              </div>
              <div className="mt-auto flex gap-2">
                <Button asChild size="sm" variant="outline">
                  <Link to="/clientes/$id" params={{ id: c.id }}>
                    Abrir ficha
                  </Link>
                </Button>
                <WhatsAppButton phone={c.whatsapp ?? c.phone} vars={{ nome: c.name }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
