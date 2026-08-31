import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  CalendarClock,
  ClipboardList,
  Receipt,
  ShieldCheck,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, StatusPill } from "@/components/page-header";
import { WO_STATUS, brl, dateBR, dateTimeBR, daysUntil, today } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard | MEC Frio Refrigeração" },
      { name: "description", content: "Visão geral dos atendimentos, orçamentos, garantias e faturamento." },
      { property: "og:title", content: "Dashboard | MEC Frio Refrigeração" },
      { property: "og:description", content: "Indicadores operacionais e financeiros da MEC Frio." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Dashboard,
});

function Kpi({
  icon: Icon,
  label,
  value,
  hint,
  tone = "text-primary",
}: {
  icon: any;
  label: string;
  value: string;
  hint?: string;
  tone?: string;
}) {
  return (
    <div className="surface-panel p-4">
      <div className="flex items-start justify-between">
        <p className="kpi-label">{label}</p>
        <Icon className={`size-4 ${tone}`} />
      </div>
      <p className="mt-2 font-display text-2xl font-bold">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function Dashboard() {
  const { data } = useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const start = new Date();
      start.setDate(1);
      const monthStart = start.toISOString().slice(0, 10);
      const in30 = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);

      const [
        clients,
        openOrders,
        pendingBudgets,
        monthPaid,
        pendingPay,
        overdue,
        warranties,
        appointments,
        recentOrders,
        lowStock,
        ordersForChart,
        statusRows,
      ] = await Promise.all([
        supabase.from("clients").select("id", { count: "exact", head: true }),
        supabase
          .from("work_orders")
          .select("id", { count: "exact", head: true })
          .not("status", "in", "(concluida,cancelada)"),
        supabase
          .from("budgets")
          .select("total")
          .in("status", ["enviado", "aguardando_aprovacao"]),
        supabase.from("payments").select("amount").eq("status", "pago").gte("paid_at", monthStart),
        supabase.from("payments").select("amount").eq("status", "pendente"),
        supabase.from("payments").select("amount").lt("due_date", today()).eq("status", "pendente"),
        supabase
          .from("warranties")
          .select("id, number, end_date, client_id, clients(name)")
          .lte("end_date", in30)
          .order("end_date"),
        supabase
          .from("appointments")
          .select("id, title, scheduled_at, technician_name, status, clients(name)")
          .gte("scheduled_at", new Date().toISOString())
          .order("scheduled_at")
          .limit(6),
        supabase
          .from("work_orders")
          .select("id, number, status, service_date, total, technician_name, clients(name)")
          .order("created_at", { ascending: false })
          .limit(6),
        supabase.from("products").select("id, name, stock, min_stock, unit"),
        supabase.from("work_orders").select("service_date, total").gte("service_date", monthStart),
        supabase.from("work_orders").select("status"),
      ]);

      const sum = (rows: { amount?: number; total?: number }[] | null, key: "amount" | "total") =>
        (rows ?? []).reduce((a, r) => a + Number((r as any)[key] ?? 0), 0);

      const byStatus = new Map<string, number>();
      (statusRows.data ?? []).forEach((r: any) => byStatus.set(r.status, (byStatus.get(r.status) ?? 0) + 1));

      const byDay = new Map<string, number>();
      (ordersForChart.data ?? []).forEach((r: any) => {
        const d = String(r.service_date).slice(8, 10);
        byDay.set(d, (byDay.get(d) ?? 0) + Number(r.total ?? 0));
      });

      return {
        clients: clients.count ?? 0,
        openOrders: openOrders.count ?? 0,
        pendingBudgetsCount: (pendingBudgets.data ?? []).length,
        pendingBudgetsTotal: sum(pendingBudgets.data as any, "total"),
        revenue: sum(monthPaid.data as any, "amount"),
        receivable: sum(pendingPay.data as any, "amount"),
        overdue: sum(overdue.data as any, "amount"),
        warranties: warranties.data ?? [],
        appointments: appointments.data ?? [],
        recentOrders: recentOrders.data ?? [],
        lowStock: (lowStock.data ?? []).filter((p: any) => Number(p.stock) <= Number(p.min_stock)),
        statusChart: [...byStatus.entries()].map(([k, v]) => ({
          name: WO_STATUS[k]?.label ?? k,
          value: v,
        })),
        dayChart: [...byDay.entries()].sort().map(([k, v]) => ({ dia: k, valor: v })),
      };
    },
  });

  const colors = ["#3f9fe0", "#4cc38a", "#e2b23c", "#e0574f", "#7aa7d8", "#9b8cd8", "#59b8b0"];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Visão geral dos atendimentos, orçamentos e resultados do mês."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi icon={ClipboardList} label="OS em aberto" value={String(data?.openOrders ?? 0)} hint="Aguardando conclusão" />
        <Kpi
          icon={Receipt}
          label="Orçamentos pendentes"
          value={String(data?.pendingBudgetsCount ?? 0)}
          hint={`${brl(data?.pendingBudgetsTotal)} em negociação`}
        />
        <Kpi
          icon={TrendingUp}
          label="Faturamento do mês"
          value={brl(data?.revenue)}
          hint="Pagamentos recebidos"
          tone="text-success"
        />
        <Kpi
          icon={Wallet}
          label="A receber"
          value={brl(data?.receivable)}
          hint={`${brl(data?.overdue)} vencido`}
          tone={data?.overdue ? "text-destructive" : "text-primary"}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="surface-panel p-5 lg:col-span-2">
          <h2 className="font-display text-base font-semibold">Serviços realizados no mês</h2>
          <p className="text-xs text-muted-foreground">Valor total das ordens de serviço por dia</p>
          <div className="mt-4 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.dayChart ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" vertical={false} />
                <XAxis dataKey="dia" stroke="#8fa0b8" fontSize={11} />
                <YAxis stroke="#8fa0b8" fontSize={11} tickFormatter={(v) => `R$${v}`} />
                <Tooltip
                  contentStyle={{ background: "#1b2536", border: "1px solid #2f3b4f", borderRadius: 8 }}
                  formatter={(v: any) => brl(Number(v))}
                />
                <Bar dataKey="valor" fill="#3f9fe0" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="surface-panel p-5">
          <h2 className="font-display text-base font-semibold">Ordens por status</h2>
          <div className="mt-2 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data?.statusChart ?? []}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={45}
                  outerRadius={75}
                  paddingAngle={3}
                >
                  {(data?.statusChart ?? []).map((_, i) => (
                    <Cell key={i} fill={colors[i % colors.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: "#1b2536", border: "1px solid #2f3b4f", borderRadius: 8 }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-1">
            {(data?.statusChart ?? []).map((s, i) => (
              <div key={s.name} className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <span className="size-2 rounded-full" style={{ background: colors[i % colors.length] }} />
                  {s.name}
                </span>
                <span className="font-semibold">{s.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="surface-panel p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-base font-semibold">Últimas ordens de serviço</h2>
            <Link to="/ordens" className="text-xs font-semibold text-primary">
              Ver todas
            </Link>
          </div>
          <div className="mt-3 divide-y divide-border">
            {(data?.recentOrders ?? []).map((o: any) => (
              <Link
                key={o.id}
                to="/ordens/$id"
                params={{ id: o.id }}
                className="flex items-center justify-between gap-3 py-2.5 text-sm hover:text-primary"
              >
                <span className="min-w-0">
                  <span className="block truncate font-semibold">{o.clients?.name ?? "—"}</span>
                  <span className="block text-xs text-muted-foreground">
                    {o.number} • {dateBR(o.service_date)} • {o.technician_name ?? "sem técnico"}
                  </span>
                </span>
                <StatusPill
                  label={WO_STATUS[o.status]?.label ?? o.status}
                  tone={WO_STATUS[o.status]?.tone ?? "bg-muted text-muted-foreground"}
                />
              </Link>
            ))}
            {!data?.recentOrders?.length && (
              <p className="py-6 text-center text-sm text-muted-foreground">Nenhuma OS registrada.</p>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="surface-panel p-5">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 font-display text-base font-semibold">
                <CalendarClock className="size-4 text-primary" /> Próximos atendimentos
              </h2>
              <Link to="/agenda" className="text-xs font-semibold text-primary">
                Agenda
              </Link>
            </div>
            <div className="mt-3 space-y-2">
              {(data?.appointments ?? []).map((a: any) => (
                <div key={a.id} className="flex items-center justify-between gap-3 text-sm">
                  <span className="min-w-0">
                    <span className="block truncate font-semibold">{a.clients?.name ?? a.title}</span>
                    <span className="block text-xs text-muted-foreground">
                      {dateTimeBR(a.scheduled_at)} • {a.technician_name ?? "sem técnico"}
                    </span>
                  </span>
                </div>
              ))}
              {!data?.appointments?.length && (
                <p className="py-3 text-sm text-muted-foreground">Nenhum atendimento agendado.</p>
              )}
            </div>
          </div>

          <div className="surface-panel p-5">
            <h2 className="flex items-center gap-2 font-display text-base font-semibold">
              <ShieldCheck className="size-4 text-warning" /> Garantias a vencer (30 dias)
            </h2>
            <div className="mt-3 space-y-2">
              {(data?.warranties ?? []).map((w: any) => (
                <div key={w.id} className="flex items-center justify-between gap-3 text-sm">
                  <span className="min-w-0">
                    <span className="block truncate font-semibold">{w.clients?.name ?? "—"}</span>
                    <span className="block text-xs text-muted-foreground">
                      {w.number} • vence {dateBR(w.end_date)}
                    </span>
                  </span>
                  <span
                    className={`text-xs font-semibold ${daysUntil(w.end_date) < 0 ? "text-destructive" : "text-warning"}`}
                  >
                    {daysUntil(w.end_date) < 0 ? "vencida" : `${daysUntil(w.end_date)}d`}
                  </span>
                </div>
              ))}
              {!data?.warranties?.length && (
                <p className="py-3 text-sm text-muted-foreground">Nenhuma garantia próxima do vencimento.</p>
              )}
            </div>
          </div>

          {!!data?.lowStock?.length && (
            <div className="surface-panel p-5">
              <h2 className="flex items-center gap-2 font-display text-base font-semibold">
                <AlertTriangle className="size-4 text-destructive" /> Estoque baixo
              </h2>
              <div className="mt-3 space-y-2">
                {data.lowStock.map((p: any) => (
                  <div key={p.id} className="flex items-center justify-between text-sm">
                    <span className="truncate">{p.name}</span>
                    <span className="text-xs font-semibold text-destructive">
                      {Number(p.stock)} {p.unit}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="surface-panel flex flex-wrap items-center justify-between gap-3 p-5">
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Users className="size-4 text-primary" />
          {data?.clients ?? 0} clientes cadastrados
        </p>
        <div className="flex flex-wrap gap-2 text-xs font-semibold">
          <Link to="/clientes" className="text-primary">
            Clientes
          </Link>
          <Link to="/orcamentos" className="text-primary">
            Orçamentos
          </Link>
          <Link to="/ordens" className="text-primary">
            Ordens de Serviço
          </Link>
          <Link to="/financeiro" className="text-primary">
            Financeiro
          </Link>
        </div>
      </div>
    </div>
  );
}
