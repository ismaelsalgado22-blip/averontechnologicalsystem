import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-shell";
import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    const { data: sub } = await supabase
      .from("subscriptions")
      .select("status, active_until")
      .eq("user_id", data.user.id)
      .maybeSingle();
    const today = new Date().toISOString().slice(0, 10);
    const active =
      sub?.status === "ativa" && (!sub.active_until || sub.active_until >= today);
    return { user: data.user, subscriptionActive: active };
  },
  component: Layout,
});

function Layout() {
  const { subscriptionActive } = Route.useRouteContext();
  if (!subscriptionActive) return <Blocked />;
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}

function Blocked() {
  const signOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/auth";
  };
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-5 rounded-2xl border border-border bg-card p-8 text-center">
        <div className="flex justify-center">
          <BrandLogo />
        </div>
        <h1 className="text-xl font-semibold">Assinatura inativa</h1>
        <p className="text-sm text-muted-foreground">
          Para usar o sistema é necessário ter a assinatura mensal ativa.
        </p>
        <p className="text-3xl font-bold text-primary">
          R$ 49,90<span className="text-sm font-normal text-muted-foreground">/mês</span>
        </p>
        <p className="text-sm text-muted-foreground">
          Entre em contato com o suporte Averon para ativar seu acesso. Assim que for liberado,
          basta entrar novamente.
        </p>
        <div className="flex flex-col gap-2">
          <Button onClick={() => window.location.reload()}>Já fui liberado, verificar</Button>
          <Button variant="ghost" onClick={signOut}>Sair</Button>
        </div>
      </div>
    </div>
  );
}
