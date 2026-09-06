import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ShieldCheck, ShieldX, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { BrandLogo } from "@/components/brand-logo";
import { StatusPill } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { dateBR, warrantyState } from "@/lib/format";

export const Route = createFileRoute("/validar-garantia")({
  head: () => ({
    meta: [
      { title: "Validar garantia | Averon" },
      {
        name: "description",
        content: "Consulte a autenticidade e a validade do certificado de garantia emitido pela Averon.",
      },
      { property: "og:title", content: "Validar garantia | Averon" },
      {
        property: "og:description",
        content: "Digite o número do certificado para conferir prazo, equipamento e condições da garantia.",
      },
    ],
  }),
  component: ValidatePage,
});

function ValidatePage() {
  const initial =
    typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("numero") ?? "" : "";
  const [numero, setNumero] = useState(initial);
  const [result, setResult] = useState<any | undefined>(undefined);
  const [loading, setLoading] = useState(false);

  const search = async (value: string) => {
    const term = value.trim().toUpperCase();
    if (!term) return;
    setLoading(true);
    const { data } = await supabase
      .from("warranties")
      .select("number, service_performed, service_date, start_date, end_date, days, conditions, exclusions")
      .eq("number", term)
      .maybeSingle();
    setResult(data ?? null);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border px-4 py-4">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <BrandLogo />
          <Link to="/" className="text-sm font-semibold text-primary">
            Início
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-6 px-4 py-10">
        <div>
          <h1 className="font-display text-2xl font-bold">Validação de garantia</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Informe o número do certificado (ex.: GAR-2026-0001) para conferir a validade.
          </p>
        </div>

        <form
          className="flex flex-col gap-2 sm:flex-row"
          onSubmit={(e) => {
            e.preventDefault();
            search(numero);
          }}
        >
          <Input
            value={numero}
            onChange={(e) => setNumero(e.target.value)}
            placeholder="GAR-2026-0001"
            maxLength={40}
          />
          <Button type="submit" disabled={loading}>
            <Search className="size-4" />
            Consultar
          </Button>
        </form>

        {result === null && (
          <div className="surface-panel flex items-center gap-3 p-5">
            <ShieldX className="size-6 text-destructive" />
            <div>
              <p className="font-semibold">Certificado não encontrado</p>
              <p className="text-sm text-muted-foreground">
                Confira o número informado ou fale com a nossa equipe pelo WhatsApp.
              </p>
            </div>
          </div>
        )}

        {result && (
          <div className="surface-panel space-y-4 p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <ShieldCheck className="size-6 text-success" />
                <div>
                  <p className="kpi-label">Certificado</p>
                  <p className="font-display text-lg font-bold">{result.number}</p>
                </div>
              </div>
              {(() => {
                const st = warrantyState(result.end_date);
                return <StatusPill label={st.label} tone={st.tone} />;
              })()}
            </div>

            <dl className="grid gap-3 sm:grid-cols-2">
              <Row label="Serviço realizado" value={result.service_performed ?? "—"} />
              <Row label="Data do serviço" value={dateBR(result.service_date)} />
              <Row label="Início da garantia" value={dateBR(result.start_date)} />
              <Row label="Válida até" value={`${dateBR(result.end_date)} (${result.days} dias)`} />
            </dl>

            {result.conditions && (
              <div>
                <p className="kpi-label">Condições</p>
                <p className="mt-1 text-sm text-muted-foreground">{result.conditions}</p>
              </div>
            )}
            {result.exclusions && (
              <div>
                <p className="kpi-label">Exclusões</p>
                <p className="mt-1 text-sm text-muted-foreground">{result.exclusions}</p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="kpi-label">{label}</dt>
      <dd className="mt-0.5 text-sm">{value}</dd>
    </div>
  );
}
