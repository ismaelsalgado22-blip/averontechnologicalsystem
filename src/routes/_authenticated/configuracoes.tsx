import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/page-header";
import { Field } from "./clientes.index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useProfile } from "@/hooks/use-auth";
import { removeFile, signedUrl, uploadFile } from "@/lib/storage";
import { ImagePlus, Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/configuracoes")({
  head: () => ({
    meta: [
      { title: "Configurações da empresa | Averon" },
      { name: "description", content: "Dados da empresa, contatos, dados bancários e termos padrão de garantia e pagamento." },
      { property: "og:title", content: "Configurações da empresa | Averon" },
      { property: "og:description", content: "Informações que aparecem nos orçamentos, ordens de serviço e certificados." },
      { name: "robots", content: "noindex" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SettingsPage,
});

const FIELDS: [string, string, "input" | "textarea"][] = [
  ["name", "Razão social / nome da empresa", "input"],
  ["tagline", "Slogan", "input"],
  ["cnpj", "CNPJ", "input"],
  ["phone", "Telefone", "input"],
  ["whatsapp", "WhatsApp", "input"],
  ["email", "E-mail", "input"],
  ["address", "Endereço", "input"],
  ["city", "Cidade", "input"],
  ["state", "Estado", "input"],
  ["instagram", "Instagram", "input"],
  ["bank_details", "Dados bancários / PIX", "textarea"],
  ["payment_conditions", "Condições de pagamento padrão", "textarea"],
  ["warranty_terms", "Termos de garantia padrão", "textarea"],
  ["default_notes", "Observações padrão dos documentos", "textarea"],
];

function SettingsPage() {
  const qc = useQueryClient();
  const { data: me } = useProfile();
  const [form, setForm] = useState<Record<string, string>>({});
  const [rowId, setRowId] = useState<string | null>(null);
  const [logoPath, setLogoPath] = useState<string | null>(null);
  const [logoPreview, setLogoPreview] = useState("");
  const [uploading, setUploading] = useState(false);

  const { data: settings } = useQuery({
    queryKey: ["company_settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("company_settings").select("*").limit(1).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: team } = useQuery({
    queryKey: ["team"],
    queryFn: async () => {
      const [{ data: profiles }, { data: roles }] = await Promise.all([
        supabase.from("profiles").select("id, full_name, email, phone, is_technician"),
        supabase.from("user_roles").select("user_id, role"),
      ]);
      return (profiles ?? []).map((p: any) => ({
        ...p,
        role: (roles ?? []).find((r: any) => r.user_id === p.id)?.role ?? "—",
      }));
    },
  });

  useEffect(() => {
    if (!settings) return;
    setRowId((settings as any).id);
    setForm(Object.fromEntries(FIELDS.map(([k]) => [k, (settings as any)[k] ?? ""])));
    const path = (settings as any).logo_url ?? null;
    setLogoPath(path);
    if (path) signedUrl(path).then(setLogoPreview);
    else setLogoPreview("");
  }, [settings]);

  const pickLogo = async (file?: File | null) => {
    if (!file) return;
    setUploading(true);
    try {
      const path = await uploadFile(file, "logos");
      if (logoPath) await removeFile(logoPath);
      setLogoPath(path);
      setLogoPreview(await signedUrl(path));
      toast.success("Logomarca enviada. Clique em salvar para aplicar nos documentos.");
    } catch (e: any) {
      toast.error(e?.message ?? "Falha ao enviar a logomarca");
    } finally {
      setUploading(false);
    }
  };

  const save = useMutation({
    mutationFn: async () => {
      if (!form["name"]?.trim()) throw new Error("Informe o nome da empresa");
      const payload = Object.fromEntries(FIELDS.map(([k]) => [k, form[k]?.trim() || null]));
      payload["name"] = form["name"].trim();
      payload["tagline"] = form["tagline"]?.trim() || "Prestação de serviços";
      (payload as any).logo_url = logoPath;
      const { error } = rowId
        ? await supabase.from("company_settings").update(payload as any).eq("id", rowId)
        : await supabase.from("company_settings").insert(payload as any);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Configurações salvas");
      qc.invalidateQueries({ queryKey: ["company_settings"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Falha ao salvar configurações"),
  });

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="space-y-5">
      <PageHeader
        title="Configurações"
        description="Dados que aparecem nos orçamentos, ordens de serviço, laudos e certificados."
        actions={
          <Button onClick={() => save.mutate()} disabled={save.isPending || !me?.isAdmin}>
            Salvar alterações
          </Button>
        }
      />

      {!me?.isAdmin && (
        <p className="surface-panel p-4 text-sm text-muted-foreground">
          Apenas administradores podem alterar os dados da empresa.
        </p>
      )}

      <div className="surface-panel space-y-4 p-5">
        <h2 className="font-display text-base font-semibold">Logomarca da empresa</h2>
        <p className="text-xs text-muted-foreground">
          Esta logomarca aparece no topo dos orçamentos, ordens de serviço, laudos e certificados, junto
          com a razão social e os dados de contato preenchidos abaixo.
        </p>
        <div className="flex flex-wrap items-center gap-4">
          <div className="grid h-24 w-40 place-items-center overflow-hidden rounded-lg border border-dashed border-border bg-muted/40">
            {logoPreview ? (
              <img src={logoPreview} alt="Logomarca da empresa" className="max-h-20 max-w-36 object-contain" />
            ) : (
              <span className="px-2 text-center text-xs text-muted-foreground">Nenhuma logomarca</span>
            )}
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="secondary" disabled={uploading || !me?.isAdmin} asChild>
              <label className="cursor-pointer">
                {uploading ? <Loader2 className="size-4 animate-spin" /> : <ImagePlus className="size-4" />}
                Enviar logomarca
                <input
                  type="file"
                  accept="image/png,image/jpeg"
                  className="hidden"
                  disabled={uploading || !me?.isAdmin}
                  onChange={(e) => pickLogo(e.target.files?.[0])}
                />
              </label>
            </Button>
            {logoPath && (
              <Button
                type="button"
                variant="ghost"
                disabled={!me?.isAdmin}
                onClick={() => {
                  setLogoPath(null);
                  setLogoPreview("");
                }}
              >
                Remover
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="surface-panel space-y-4 p-5">
        <h2 className="font-display text-base font-semibold">Dados da empresa</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {FIELDS.filter(([, , type]) => type === "input").map(([k, label]) => (
            <Field key={k} label={label}>
              <Input
                value={form[k] ?? ""}
                maxLength={160}
                disabled={!me?.isAdmin}
                onChange={(e) => set(k, e.target.value)}
              />
            </Field>
          ))}
        </div>
        <div className="grid gap-3">
          {FIELDS.filter(([, , type]) => type === "textarea").map(([k, label]) => (
            <Field key={k} label={label}>
              <Textarea
                value={form[k] ?? ""}
                rows={3}
                maxLength={1500}
                disabled={!me?.isAdmin}
                onChange={(e) => set(k, e.target.value)}
              />
            </Field>
          ))}
        </div>
      </div>

      <div className="surface-panel p-5">
        <h2 className="font-display text-base font-semibold">Equipe</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Novos usuários entram pelo cadastro do sistema. O primeiro usuário criado é administrador.
        </p>
        <div className="mt-3 divide-y divide-border">
          {(team ?? []).map((t: any) => (
            <div key={t.id} className="flex items-center justify-between py-2 text-sm">
              <span>
                <span className="font-semibold">{t.full_name}</span>
                <span className="block text-xs text-muted-foreground">{t.email ?? "—"}</span>
              </span>
              <span className="text-xs uppercase tracking-wide text-muted-foreground">{t.role}</span>
            </div>
          ))}
          {!team?.length && <p className="py-3 text-sm text-muted-foreground">Nenhum usuário encontrado.</p>}
        </div>
      </div>
    </div>
  );
}
