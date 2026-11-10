import { useState, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  CalendarClock,
  ClipboardList,
  FileText,
  Gauge,
  LogOut,
  Menu,
  Package,
  Receipt,
  ShieldCheck,
  Settings,
  Snowflake,
  Users,
  Wallet,
  Wrench,
  X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/use-auth";
import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import { AlertsBell } from "@/components/alerts-bell";
import { SubscriptionGate } from "@/components/subscription-gate";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: Gauge },
  { to: "/clientes", label: "Clientes", icon: Users },
  { to: "/equipamentos", label: "Equipamentos", icon: Snowflake },
  { to: "/orcamentos", label: "Orçamentos", icon: Receipt },
  { to: "/ordens", label: "Ordens de Serviço", icon: ClipboardList },
  { to: "/laudos", label: "Laudos Técnicos", icon: FileText },
  { to: "/garantias", label: "Garantias", icon: ShieldCheck },
  { to: "/agenda", label: "Agenda", icon: CalendarClock },
  { to: "/servicos", label: "Serviços", icon: Wrench },
  { to: "/estoque", label: "Estoque", icon: Package },
  { to: "/financeiro", label: "Financeiro", icon: Wallet },
  { to: "/configuracoes", label: "Configurações", icon: Settings },
] as const;

const ROLE_LABEL: Record<string, string> = {
  administrador: "Administrador",
  tecnico: "Técnico",
  administrativo: "Administrativo",
};

export function AppShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data } = useProfile();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const signOut = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  const nav = (
    <nav className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto scroll-thin px-3 py-4">
      {NAV.map((item) => {
        const active = pathname === item.to || pathname.startsWith(`${item.to}/`);
        return (
          <Link
            key={item.to}
            to={item.to}
            onClick={() => setOpen(false)}
            className={cn(
              "flex shrink-0 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-glow"
                : "text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
            )}
          >
            <item.icon className={cn("size-4", active && "text-primary")} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );

  const footer = (
    <div className="shrink-0 border-t border-sidebar-border px-3 py-3">
      <div className="mb-2 px-1">
        <p className="truncate text-sm font-semibold">{data?.profile?.full_name ?? "Usuário"}</p>
        <p className="text-[11px] uppercase tracking-widest text-muted-foreground">
          {ROLE_LABEL[data?.role ?? ""] ?? "—"}
        </p>
      </div>
      <Button variant="ghost" size="sm" className="w-full justify-start" onClick={signOut}>
        <LogOut className="size-4" />
        Sair do sistema
      </Button>
    </div>
  );

  return (
    <SubscriptionGate><div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 z-40 hidden h-dvh w-64 flex-col border-r border-sidebar-border bg-sidebar lg:flex">
        <div className="border-b border-sidebar-border px-4 py-4">
          <BrandLogo />
        </div>
        {nav}
        {footer}
      </aside>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            className="absolute inset-0 bg-background/80"
            onClick={() => setOpen(false)}
            aria-label="Fechar menu"
          />
          <aside className="relative flex h-dvh w-72 flex-col border-r border-sidebar-border bg-sidebar">
            <div className="flex items-center justify-between border-b border-sidebar-border px-4 py-4">
              <BrandLogo />
              <Button variant="ghost" size="icon" onClick={() => setOpen(false)}>
                <X className="size-4" />
              </Button>
            </div>
            {nav}
            {footer}
          </aside>
        </div>
      )}

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-background/85 px-4 py-3 backdrop-blur lg:hidden">
          <Button variant="ghost" size="icon" onClick={() => setOpen(true)} aria-label="Abrir menu">
            <Menu className="size-5" />
          </Button>
          <BrandLogo />
          <div className="ml-auto"><AlertsBell /></div>
        </header>
        <div className="sticky top-0 z-30 hidden justify-end border-b border-border bg-background/85 px-6 py-2 backdrop-blur lg:flex"><AlertsBell /></div>
        <main className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:py-8">{children}</main>
      </div>
    </div></SubscriptionGate>
  );
}
