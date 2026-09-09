import { createFileRoute, Link } from "@tanstack/react-router";
import {
  CalendarClock,
  ClipboardList,
  FileText,
  Receipt,
  ShieldCheck,
  Snowflake,
  Wallet,
  Wrench,
} from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Averon | Gestão para empresas de serviços" },
      {
        name: "description",
        content:
          "Software completo para empresas de serviços: centralize a operação, organize a agenda da equipe e emita documentos personalizados com a sua marca.",
      },
      { property: "og:title", content: "Averon | Gestão para empresas de serviços" },
      {
        property: "og:description",
        content:
          "Software completo para empresas de serviços: centralize a operação, organize a agenda da equipe e emita documentos personalizados com a sua marca.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const MODULES = [
  { icon: Receipt, title: "Orçamentos", text: "Numeração automática, PDF profissional e envio por WhatsApp." },
  { icon: ClipboardList, title: "Ordens de Serviço", text: "Diagnóstico, medições técnicas, fotos e assinatura digital." },
  { icon: FileText, title: "Laudos Técnicos", text: "Inspeção técnica detalhada com diagnóstico e conclusão." },
  { icon: ShieldCheck, title: "Garantias", text: "Certificados com QR Code de validação e alertas de vencimento." },
  { icon: Snowflake, title: "Equipamentos", text: "Histórico por equipamento: marca, modelo, série e fotos." },
  { icon: CalendarClock, title: "Agenda", text: "Agendamentos por técnico com confirmação via WhatsApp." },
  { icon: Wrench, title: "Serviços", text: "Tabela de preços de mão de obra por categoria de equipamento." },
  { icon: Wallet, title: "Financeiro", text: "Contas a receber, formas de pagamento e faturamento mensal." },
];

function Landing() {
  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5">
        <BrandLogo />
        <Button asChild size="sm">
          <Link to="/auth">Acessar o sistema</Link>
        </Button>
      </header>

      <section className="surface-brand border-y border-border">
        <div className="mx-auto max-w-6xl px-4 py-20">
          <p className="kpi-label">Sistema de controle de serviços</p>
          <h1 className="mt-3 max-w-3xl font-display text-4xl font-extrabold leading-[1.05] sm:text-6xl">
            Gestão completa da sua <span className="text-brand-gradient">operação</span>
          </h1>
          <p className="mt-5 max-w-2xl text-base text-muted-foreground">
            Controle orçamentos, ordens de serviço, laudos, garantias, agenda, estoque e financeiro em um
            só lugar — com a sua própria logomarca e dados nos documentos emitidos.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link to="/auth">Entrar no sistema</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/validar-garantia">Validar garantia</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="font-display text-2xl font-bold">Módulos do sistema</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {MODULES.map((m) => (
            <div key={m.title} className="surface-panel p-5">
              <m.icon className="size-5 text-primary" />
              <h3 className="mt-3 font-display text-base font-semibold">{m.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{m.text}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-border py-8 text-center text-xs text-muted-foreground">
        Averon — sistema de gestão para empresas de prestação de serviços
      </footer>
    </div>
  );
}
