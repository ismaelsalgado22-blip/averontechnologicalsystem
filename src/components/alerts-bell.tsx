import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Bell, BellRing, Volume2, VolumeX } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { dateBR } from "@/lib/format";
import { appointmentContact } from "@/lib/appointment-contact";

type Alert = { id: string; kind: string; title: string; detail: string; to: string; urgent?: boolean };

/** Minutes before an appointment that triggers the sound alert. */
export const APPOINTMENT_LEAD_MIN = 30;

function playBeep() {
  try {
    const Ctx = window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new Ctx();
    [0, 0.25, 0.5].forEach((t) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.value = 880;
      o.connect(g);
      g.connect(ctx.destination);
      g.gain.setValueAtTime(0.0001, ctx.currentTime + t);
      g.gain.exponentialRampToValueAtTime(0.4, ctx.currentTime + t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + t + 0.2);
      o.start(ctx.currentTime + t);
      o.stop(ctx.currentTime + t + 0.22);
    });
    if ("vibrate" in navigator) navigator.vibrate?.([200, 100, 200]);
  } catch {}
}

function notify(title: string, body: string) {
  if (typeof Notification !== "undefined" && Notification.permission === "granted") {
    try {
      new Notification(title, { body, icon: "/favicon.png" });
    } catch {}
  }
}

export function AlertsBell() {
  const [sound, setSound] = useState(true);
  const [now, setNow] = useState(() => Date.now());
  const seen = useRef<Set<string>>(new Set());
  const first = useRef(true);

  useEffect(() => {
    setSound(localStorage.getItem("averon-sound") !== "off");
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  const { data } = useQuery({
    queryKey: ["alerts"],
    refetchInterval: 60_000,
    queryFn: async () => {
      const [pay, war, prod, app, guest] = await Promise.all([
        supabase.from("payments").select("id, amount, due_date, paid_at, status, clients(name)").is("paid_at", null),
        supabase.from("warranties").select("id, number, end_date, clients(name)").not("end_date", "is", null),
        supabase.from("products").select("id, name, stock, min_stock"),
        supabase
          .from("appointments")
          .select("id, title, scheduled_at, status, clients(name)")
          .in("status", ["agendado", "confirmado"])
          .gte("scheduled_at", new Date(Date.now() - 3600_000).toISOString())
          .lte("scheduled_at", new Date(Date.now() + 86400_000).toISOString()),
        supabase.from("guest_appointments")
          .select("id, title, scheduled_at, status, contact_name, contact_phone")
          .in("status", ["agendado", "confirmado"])
          .gte("scheduled_at", new Date(Date.now() - 3600_000).toISOString())
          .lte("scheduled_at", new Date(Date.now() + 86400_000).toISOString()),
      ]);
      if (app.error) throw app.error;
      if (guest.error) throw guest.error;
      return { pay: pay.data ?? [], war: war.data ?? [], prod: prod.data ?? [], app: [
        ...(app.data ?? []).map((a) => ({ ...a, source: "appointments" })),
        ...(guest.data ?? []).map((a) => ({ ...a, source: "guest_appointments" })),
      ] };
    },
  });

  const alerts = useMemo<Alert[]>(() => {
    if (!data) return [];
    const today = new Date(now).toISOString().slice(0, 10);
    const in30 = new Date(now + 30 * 86400_000).toISOString().slice(0, 10);
    const list: Alert[] = [];
    data.app.forEach((a: any) => {
      const diff = (new Date(a.scheduled_at).getTime() - now) / 60000;
      if (diff < -60) return;
      const urgent = diff <= APPOINTMENT_LEAD_MIN;
      list.push({
        id: `app-${a.source}-${a.id}-${urgent ? "soon" : "day"}`,
        kind: "Agenda",
        title: urgent ? (diff <= 0 ? "Atendimento agora" : `Atendimento em ${Math.round(diff)} min`) : "Atendimento nas próximas 24h",
        detail: `${a.title} • ${appointmentContact(a).name} • ${new Date(a.scheduled_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}`,
        to: "/agenda",
        urgent,
      });
    });
    data.pay.forEach((p: any) => {
      if (p.due_date < today)
        list.push({ id: `pay-${p.id}`, kind: "Financeiro", title: "Pagamento atrasado", detail: `${p.clients?.name ?? ""} • venceu ${dateBR(p.due_date)}`, to: "/financeiro", urgent: true });
      else if (p.due_date === today)
        list.push({ id: `pay-${p.id}`, kind: "Financeiro", title: "Pagamento vence hoje", detail: p.clients?.name ?? "", to: "/financeiro" });
    });
    data.war.forEach((w: any) => {
      if (w.end_date >= today && w.end_date <= in30)
        list.push({ id: `war-${w.id}`, kind: "Garantia", title: "Garantia vencendo", detail: `${w.number ?? ""} ${w.clients?.name ?? ""} • até ${dateBR(w.end_date)}`, to: "/garantias" });
    });
    data.prod.forEach((p: any) => {
      if (Number(p.stock) <= Number(p.min_stock))
        list.push({ id: `stk-${p.id}`, kind: "Estoque", title: "Estoque baixo", detail: `${p.name} • ${p.stock} em estoque (mín. ${p.min_stock})`, to: "/estoque" });
    });
    return list.sort((a, b) => Number(!!b.urgent) - Number(!!a.urgent));
  }, [data, now]);

  useEffect(() => {
    if (!data) return;
    const fresh = alerts.filter((a) => !seen.current.has(a.id));
    fresh.forEach((a) => seen.current.add(a.id));
    if (fresh.length === 0) return;
    const important = first.current ? fresh : fresh;
    first.current = false;
    if (sound) playBeep();
    important.slice(0, 3).forEach((a) => {
      toast(a.title, { description: a.detail });
      notify(a.title, a.detail);
    });
  }, [alerts, data, sound]);

  const toggleSound = () => {
    const next = !sound;
    setSound(next);
    localStorage.setItem("averon-sound", next ? "on" : "off");
    if (next) playBeep();
    if (typeof Notification !== "undefined" && Notification.permission === "default") Notification.requestPermission();
  };

  return (
    <Popover
      onOpenChange={(o) => {
        if (o && typeof Notification !== "undefined" && Notification.permission === "default") Notification.requestPermission();
      }}
    >
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Alertas">
          {alerts.length ? <BellRing className="size-5 text-primary" /> : <Bell className="size-5" />}
          {alerts.length > 0 && (
            <span className="absolute -right-0.5 -top-0.5 rounded-full bg-destructive px-1.5 text-[10px] font-bold text-destructive-foreground">
              {alerts.length}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b border-border px-3 py-2">
          <p className="text-sm font-semibold">Alertas</p>
          <Button variant="ghost" size="sm" onClick={toggleSound}>
            {sound ? <Volume2 className="size-4" /> : <VolumeX className="size-4" />}
            {sound ? "Som ligado" : "Som desligado"}
          </Button>
        </div>
        <div className="max-h-[60dvh] overflow-y-auto">
          {alerts.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">Nenhum alerta no momento.</p>
          ) : (
            alerts.map((a) => (
              <Link key={a.id} to={a.to} className="block border-b border-border px-3 py-2 hover:bg-muted">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{a.kind}</p>
                <p className={a.urgent ? "text-sm font-semibold text-destructive" : "text-sm font-semibold"}>{a.title}</p>
                <p className="text-xs text-muted-foreground">{a.detail}</p>
              </Link>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
