import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Acesso ao sistema | Averon" },
      {
        name: "description",
        content:
          "Área restrita da Averon: acesse o sistema de gestão de clientes, orçamentos, ordens de serviço e garantias.",
      },
      { property: "og:title", content: "Acesso ao sistema | Averon" },
      {
        property: "og:description",
        content: "Entre no sistema de gestão comercial e técnica da Averon.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

const emailSchema = z.string().trim().email({ message: "E-mail inválido" }).max(255);
const passSchema = z.string().min(6, { message: "A senha deve ter pelo menos 6 caracteres" }).max(72);

function authErrorPt(message: string) {
  const m = message.toLowerCase();
  if (m.includes("weak") || m.includes("pwned"))
    return "Senha muito comum. Escolha uma senha mais forte.";
  if (m.includes("already registered") || m.includes("already been registered"))
    return "Este e-mail já tem conta. Use a aba Entrar.";
  if (m.includes("email not confirmed")) return "Confirme seu e-mail antes de entrar.";
  if (m.includes("invalid login")) return "E-mail ou senha incorretos.";
  if (m.includes("signups not allowed")) return "Criação de contas desativada.";
  if (m.includes("rate limit") || m.includes("too many"))
    return "Muitas tentativas. Aguarde alguns minutos.";
  return message;
}

function AuthPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [feedback, setFeedback] = useState<{ kind: "error" | "ok"; text: string } | null>(null);

  const fail = (text: string) => {
    setFeedback({ kind: "error", text });
    toast.error(text);
  };
  const ok = (text: string) => {
    setFeedback({ kind: "ok", text });
    toast.success(text);
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard", replace: true });
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) navigate({ to: "/dashboard", replace: true });
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  const signIn = async (e: React.FormEvent) => {
    e.preventDefault();
    const em = emailSchema.safeParse(email);
    const pw = passSchema.safeParse(password);
    if (!em.success) { toast.error(em.error.issues[0]?.message ?? "Dados inválidos"); return; }
    if (!pw.success) { toast.error(pw.error.issues[0]?.message ?? "Dados inválidos"); return; }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: em.data, password: pw.data });
    setLoading(false);
    if (error) { toast.error("E-mail ou senha incorretos"); return; }
    toast.success("Bem-vindo de volta!");
  };

  const signUp = async (e: React.FormEvent) => {
    e.preventDefault();
    const em = emailSchema.safeParse(email);
    const pw = passSchema.safeParse(password);
    const nm = z.string().trim().min(3, { message: "Informe seu nome completo" }).max(120).safeParse(name);
    if (!nm.success) { toast.error(nm.error.issues[0]?.message ?? "Dados inválidos"); return; }
    if (!em.success) { toast.error(em.error.issues[0]?.message ?? "Dados inválidos"); return; }
    if (!pw.success) { toast.error(pw.error.issues[0]?.message ?? "Dados inválidos"); return; }
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: em.data,
      password: pw.data,
      options: { data: { full_name: nm.data }, emailRedirectTo: window.location.origin },
    });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    if (!data.session) toast.success("Conta criada! Confirme seu e-mail para entrar.");
  };

  const google = async () => {
    setLoading(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      setLoading(false);
      { toast.error("Não foi possível entrar com o Google"); return; }
    }
    if (result.redirected) return;
    setLoading(false);
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="surface-brand relative hidden flex-col justify-between p-10 lg:flex">
        <BrandLogo />
        <div className="max-w-md space-y-4">
          <h1 className="font-display text-4xl font-extrabold leading-tight">
            Gestão completa da sua <span className="text-brand-gradient">refrigeração</span>
          </h1>
          <p className="text-sm text-muted-foreground">
            Clientes, equipamentos, orçamentos, ordens de serviço, laudos técnicos, garantias, agenda,
            estoque e financeiro em um único sistema.
          </p>
        </div>
        <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
          Refrigeração comercial e industrial
        </p>
      </div>

      <div className="flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm space-y-6">
          <div className="lg:hidden">
            <BrandLogo />
          </div>
          <div>
            <h2 className="font-display text-2xl font-bold">Acesso ao sistema</h2>
            <p className="text-sm text-muted-foreground">Área restrita da equipe Averon.</p>
          </div>

          <Tabs defaultValue="login">
            <TabsList className="w-full">
              <TabsTrigger value="login" className="flex-1">
                Entrar
              </TabsTrigger>
              <TabsTrigger value="signup" className="flex-1">
                Criar conta
              </TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={signIn} className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="login-email">E-mail</Label>
                  <Input
                    id="login-email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    maxLength={255}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="login-pass">Senha</Label>
                  <Input
                    id="login-pass"
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    maxLength={72}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="size-4 animate-spin" />}
                  Entrar
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={signUp} className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="su-name">Nome completo</Label>
                  <Input
                    id="su-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    maxLength={120}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="su-email">E-mail</Label>
                  <Input
                    id="su-email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    maxLength={255}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="su-pass">Senha</Label>
                  <Input
                    id="su-pass"
                    type="password"
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    maxLength={72}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="size-4 animate-spin" />}
                  Criar conta
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          <div className="flex items-center gap-3">
            <span className="h-px flex-1 bg-border" />
            <span className="text-xs uppercase tracking-widest text-muted-foreground">ou</span>
            <span className="h-px flex-1 bg-border" />
          </div>

          <Button variant="outline" className="w-full" onClick={google} disabled={loading}>
            Entrar com Google
          </Button>
        </div>
      </div>
    </div>
  );
}
