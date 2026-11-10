export const brl = (v: number | null | undefined) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(v ?? 0));

export const num = (v: unknown) => {
  const text = String(v ?? "0").trim();
  const n = Number(text.includes(",") ? text.replace(/\./g, "").replace(",", ".") : text);
  return Number.isFinite(n) ? n : 0;
};

export const dateBR = (v: string | Date | null | undefined) => {
  if (!v) return "—";
  const d = typeof v === "string" ? new Date(v.length <= 10 ? `${v}T12:00:00` : v) : v;
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("pt-BR");
};

export const dateTimeBR = (v: string | Date | null | undefined) => {
  if (!v) return "—";
  const d = typeof v === "string" ? new Date(v) : v;
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
};

export const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

export const addDays = (isoDate: string, days: number) => {
  const d = new Date(`${isoDate}T12:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};

export const daysUntil = (isoDate: string | null | undefined) => {
  if (!isoDate) return 0;
  const d = new Date(`${isoDate.slice(0, 10)}T12:00:00`).getTime();
  return Math.ceil((d - Date.now()) / 86400000);
};

/** Só dígitos, com DDI 55 quando faltar. */
export const waNumber = (raw: string | null | undefined) => {
  const digits = (raw ?? "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("55")) return digits;
  return `55${digits}`;
};

export const waLink = (phone: string | null | undefined, message: string) =>
  `https://wa.me/${waNumber(phone)}?text=${encodeURIComponent(message)}`;

export const openWhatsApp = (phone: string | null | undefined, message: string) => {
  window.open(waLink(phone, message), "_blank", "noopener");
};

export const maskDoc = (v: string) => {
  const d = v.replace(/\D/g, "");
  if (d.length <= 11)
    return d
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  return d
    .slice(0, 14)
    .replace(/(\d{2})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1/$2")
    .replace(/(\d{4})(\d{1,2})$/, "$1-$2");
};

export const maskPhone = (v: string) => {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 10) return d.replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{4})(\d{1,4})$/, "$1-$2");
  return d.replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{5})(\d{1,4})$/, "$1-$2");
};

export const BUDGET_STATUS: Record<string, { label: string; tone: string }> = {
  rascunho: { label: "Rascunho", tone: "bg-muted text-muted-foreground" },
  enviado: { label: "Enviado", tone: "bg-primary/15 text-primary" },
  aguardando_aprovacao: { label: "Aguardando aprovação", tone: "bg-warning/15 text-warning" },
  aprovado: { label: "Aprovado", tone: "bg-success/15 text-success" },
  recusado: { label: "Recusado", tone: "bg-destructive/15 text-destructive" },
  expirado: { label: "Expirado", tone: "bg-muted text-muted-foreground" },
  cancelado: { label: "Cancelado", tone: "bg-muted text-muted-foreground" },
};

export const WO_STATUS: Record<string, { label: string; tone: string }> = {
  aberta: { label: "Aberta", tone: "bg-primary/15 text-primary" },
  agendada: { label: "Agendada", tone: "bg-primary/15 text-primary" },
  em_execucao: { label: "Em execução", tone: "bg-warning/15 text-warning" },
  aguardando_peca: { label: "Aguardando peça", tone: "bg-warning/15 text-warning" },
  aguardando_aprovacao: { label: "Aguardando aprovação", tone: "bg-warning/15 text-warning" },
  concluida: { label: "Concluída", tone: "bg-success/15 text-success" },
  cancelada: { label: "Cancelada", tone: "bg-destructive/15 text-destructive" },
};

export const PAY_STATUS: Record<string, { label: string; tone: string }> = {
  pendente: { label: "Pendente", tone: "bg-warning/15 text-warning" },
  pago: { label: "Pago", tone: "bg-success/15 text-success" },
  vencido: { label: "Vencido", tone: "bg-destructive/15 text-destructive" },
  cancelado: { label: "Cancelado", tone: "bg-muted text-muted-foreground" },
};

export const PAY_METHODS = ["pix", "dinheiro", "cartao", "transferencia", "boleto", "parcelado"] as const;
export const PAY_METHOD_LABEL: Record<string, string> = {
  pix: "Pix",
  dinheiro: "Dinheiro",
  cartao: "Cartão",
  transferencia: "Transferência",
  boleto: "Boleto",
  parcelado: "Parcelado",
};

export const SERVICE_CATEGORIES = [
  "Geladeiras",
  "Freezers",
  "Expositores",
  "Câmaras frias",
  "Chopeiras",
  "Cervejeiras",
  "Bebedouros",
  "Ar-condicionado",
  "Compressores",
  "Elétrica",
  "Controladores",
  "Solda",
  "Vazamento",
  "Carga de fluido refrigerante",
  "Manutenção preventiva",
  "Manutenção corretiva",
  "Instalação",
];

export const EQUIPMENT_TYPES = [
  "Geladeira Expositora",
  "Freezer",
  "Câmara Fria",
  "Chopeira",
  "Cervejeira",
  "Bebedouro",
  "Ar-condicionado",
  "Balcão Refrigerado",
  "Ultracongelador",
  "Outro",
];

export const PRODUCT_CATEGORIES = [
  "Compressores",
  "Capacitores",
  "Relés",
  "Protetores térmicos",
  "Controladores",
  "Sensores",
  "Filtros secadores",
  "Fluido refrigerante",
  "Tubos de cobre",
  "Materiais diversos",
];

export const warrantyState = (endDate: string | null | undefined) => {
  const d = daysUntil(endDate);
  if (d < 0) return { key: "vencida", label: "Vencida", tone: "bg-destructive/15 text-destructive" };
  if (d <= 30) return { key: "vencendo", label: "Próxima do vencimento", tone: "bg-warning/15 text-warning" };
  return { key: "ativa", label: "Ativa", tone: "bg-success/15 text-success" };
};
