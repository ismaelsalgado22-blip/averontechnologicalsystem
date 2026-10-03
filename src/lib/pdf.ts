import { jsPDF } from "jspdf";
import QRCode from "qrcode";
import { brl, dateBR } from "./format";

export type Company = {
  name: string;
  tagline: string;
  cnpj?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  email?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  instagram?: string | null;
  bank_details?: string | null;
  warranty_terms?: string | null;
  payment_conditions?: string | null;
  default_notes?: string | null;
  logo_url?: string | null;
};

const NAVY: [number, number, number] = [12, 32, 62];
const BLUE: [number, number, number] = [37, 129, 210];
const GRAY: [number, number, number] = [90, 100, 115];
const M = 14;

type Doc = jsPDF;

type PageContext = {
  doc: Doc;
  company: Company;
  title: string;
  subtitle: string;
  logo?: string;
};

const LINE_HEIGHT = 4.2;

function contentBottom(doc: Doc) {
  return doc.internal.pageSize.getHeight() - 23;
}

function header(doc: Doc, company: Company, title: string, subtitle: string, logo?: string) {
  const w = doc.internal.pageSize.getWidth();
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, w, 36, "F");
  doc.setFillColor(...BLUE);
  doc.rect(0, 36, w, 1.4, "F");

  let textX = M;
  if (logo) {
    try {
      const fmt = /^data:image\/jpe?g/i.test(logo) ? "JPEG" : "PNG";
      doc.addImage(logo, fmt, M, 6, 24, 24);
      textX = M + 28;
    } catch {
      textX = M;
    }
  }

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text(doc.splitTextToSize(company.name, w * 0.5)[0] ?? company.name, textX, 13);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  let hy = 18;
  const lines = [
    company.tagline,
    company.cnpj ? `CNPJ ${company.cnpj}` : null,
    [company.address, company.city, company.state].filter(Boolean).join(", ") || null,
    [company.phone, company.whatsapp, company.email].filter(Boolean).join("  •  ") || null,
  ].filter(Boolean) as string[];
  lines.slice(0, 4).forEach((l) => {
    doc.text(doc.splitTextToSize(l, w * 0.55)[0] ?? l, textX, hy);
    hy += 4.2;
  });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(title.toUpperCase(), w - M, 15, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(subtitle, w - M, 21, { align: "right" });

  doc.setTextColor(20, 20, 20);
  return 46;
}


function footer(doc: Doc, company: Company) {
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();
  doc.setDrawColor(...BLUE);
  doc.setLineWidth(0.6);
  doc.line(M, h - 18, w - M, h - 18);
  doc.setFontSize(7.5);
  doc.setTextColor(...GRAY);
  const l1 = [company.name, company.cnpj ? `CNPJ ${company.cnpj}` : null].filter(Boolean).join(" — ");
  const l2 = [
    [company.address, company.city, company.state].filter(Boolean).join(", "),
    company.phone,
    company.email,
    company.instagram,
  ]
    .filter(Boolean)
    .join("  •  ");
  doc.text(l1, w / 2, h - 13, { align: "center" });
  doc.text(l2, w / 2, h - 9, { align: "center" });
  doc.setTextColor(20, 20, 20);
}

function nextPage(ctx: PageContext) {
  footer(ctx.doc, ctx.company);
  ctx.doc.addPage();
  return header(ctx.doc, ctx.company, ctx.title, `${ctx.subtitle} — continuação`, ctx.logo);
}

function ensureSpace(ctx: PageContext, y: number, required: number) {
  return y + required <= contentBottom(ctx.doc) ? y : nextPage(ctx);
}

export type PdfResult = { url: string; filename: string; blob: Blob };

/** Gera o arquivo e devolve um endereço temporário para visualizar/baixar na própria tela. */
function deliver(doc: Doc, filename: string): PdfResult {
  const base = filename || "documento";
  const safe = base.replace(/[^\w\-.]+/g, "-") + (base.toLowerCase().endsWith(".pdf") ? "" : ".pdf");
  const blob = doc.output("blob") as Blob;
  return { url: URL.createObjectURL(blob), filename: safe, blob };
}


function sectionTitle(ctx: PageContext, y: number, text: string) {
  const { doc } = ctx;
  y = ensureSpace(ctx, y, 18);
  const w = doc.internal.pageSize.getWidth();
  doc.setFillColor(...NAVY);
  doc.rect(M, y, w - M * 2, 6.5, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text(text.toUpperCase(), M + 2.5, y + 4.6);
  doc.setTextColor(20, 20, 20);
  doc.setFont("helvetica", "normal");
  return y + 10;
}

function pair(ctx: PageContext, y: number, items: [string, string][], cols = 2) {
  const { doc } = ctx;
  const w = doc.internal.pageSize.getWidth() - M * 2;
  const colW = w / cols;
  doc.setFontSize(8.5);
  for (let i = 0; i < items.length; i += cols) {
    const rowItems = items.slice(i, i + cols);
    const values = rowItems.map((item) => doc.splitTextToSize(String(item[1] || "—"), colW - 4) as string[]);
    const rowHeight = Math.max(9, 4.2 + Math.max(...values.map((lines) => lines.length)) * LINE_HEIGHT + 2);
    y = ensureSpace(ctx, y, rowHeight);
    rowItems.forEach((item, column) => {
      const x = M + column * colW;
      doc.setTextColor(...GRAY);
      doc.setFont("helvetica", "normal");
      doc.text(item[0].toUpperCase(), x, y);
      doc.setTextColor(20, 20, 20);
      doc.setFont("helvetica", "bold");
      doc.text(values[column] ?? ["—"], x, y + 4.2);
    });
    y += rowHeight;
  }
  doc.setFont("helvetica", "normal");
  return y + 2;
}

function block(ctx: PageContext, y: number, label: string, text?: string | null) {
  if (!text) return y;
  const { doc } = ctx;
  const w = doc.internal.pageSize.getWidth() - M * 2;
  const lines = doc.splitTextToSize(String(text), w) as string[];
  let offset = 0;
  let continued = false;

  while (offset < lines.length) {
    y = ensureSpace(ctx, y, 11);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...GRAY);
    doc.text(`${label.toUpperCase()}${continued ? " (CONTINUAÇÃO)" : ""}`, M, y);
    doc.setTextColor(20, 20, 20);
    doc.setFontSize(9);

    const availableLines = Math.max(1, Math.floor((contentBottom(doc) - (y + 4.5)) / LINE_HEIGHT));
    const chunk = lines.slice(offset, offset + availableLines);
    doc.text(chunk, M, y + 4.5);
    y += 4.5 + chunk.length * LINE_HEIGHT + 3;
    offset += chunk.length;
    if (offset < lines.length) {
      y = nextPage(ctx);
      continued = true;
    }
  }
  return y;
}

function tableHeader(ctx: PageContext, y: number, cols: number[], width: number) {
  const { doc } = ctx;
  y = ensureSpace(ctx, y, 13);
  doc.setFillColor(235, 240, 248);
  doc.rect(M, y, width, 7, "F");
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text("DESCRIÇÃO", cols[0] + 2, y + 4.8);
  doc.text("QTD", cols[1], y + 4.8);
  doc.text("V. UNIT.", cols[2], y + 4.8);
  doc.text("TOTAL", cols[3] - 2, y + 4.8, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setDrawColor(210, 216, 226);
  doc.rect(M, y, width, 7);
  return y + 7;
}

function itemsTable(
  ctx: PageContext,
  y: number,
  rows: { description: string; quantity: number; unit_price: number; total: number }[],
) {
  const { doc } = ctx;
  const w = doc.internal.pageSize.getWidth() - M * 2;
  const cols = [M, M + w * 0.6, M + w * 0.72, M + w];
  y = tableHeader(ctx, y, cols, w);
  rows.forEach((row, rowIndex) => {
    const lines = doc.splitTextToSize(String(row.description || "—"), w * 0.56) as string[];
    let offset = 0;
    let firstChunk = true;
    while (offset < lines.length) {
      let availableLines = Math.floor((contentBottom(doc) - y - 2.5) / LINE_HEIGHT);
      if (availableLines < 1) {
        y = nextPage(ctx);
        y = tableHeader(ctx, y, cols, w);
        availableLines = Math.max(1, Math.floor((contentBottom(doc) - y - 2.5) / LINE_HEIGHT));
      }
      const chunk = lines.slice(offset, offset + availableLines);
      const rowHeight = Math.max(6.5, chunk.length * LINE_HEIGHT + 2.5);
      if (rowIndex % 2 === 1) {
        doc.setFillColor(247, 249, 252);
        doc.rect(M, y, w, rowHeight, "F");
      }
      doc.setDrawColor(210, 216, 226);
      doc.rect(M, y, w, rowHeight);
      doc.setFontSize(8.5);
      doc.text(chunk, cols[0] + 2, y + 4.5);
      if (firstChunk) {
        doc.text(String(Number(row.quantity)), cols[1], y + 4.5);
        doc.text(brl(row.unit_price), cols[2], y + 4.5);
        doc.text(brl(row.total), cols[3] - 2, y + 4.5, { align: "right" });
      }
      y += rowHeight;
      offset += chunk.length;
      firstChunk = false;
      if (offset < lines.length) {
        y = nextPage(ctx);
        y = tableHeader(ctx, y, cols, w);
      }
    }
  });
  return y + 4;
}

function totalsBox(ctx: PageContext, y: number, lines: [string, string][], highlight: [string, string]) {
  const { doc } = ctx;
  y = ensureSpace(ctx, y, lines.length * 5.5 + 15);
  const w = doc.internal.pageSize.getWidth() - M * 2;
  const boxW = w * 0.45;
  const x = M + w - boxW;
  doc.setFontSize(9);
  lines.forEach((l, i) => {
    doc.setTextColor(...GRAY);
    doc.text(l[0], x, y + i * 5.5);
    doc.setTextColor(20, 20, 20);
    doc.text(l[1], x + boxW, y + i * 5.5, { align: "right" });
  });
  const ty = y + lines.length * 5.5;
  doc.setFillColor(...NAVY);
  doc.rect(x, ty, boxW, 10, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(highlight[0], x + 3, ty + 6.8);
  doc.text(highlight[1], x + boxW - 3, ty + 6.8, { align: "right" });
  doc.setTextColor(20, 20, 20);
  doc.setFont("helvetica", "normal");
  return ty + 15;
}

const clientLines = (client: any): [string, string][] => [
  [client?.kind === "pj" ? "Razão social" : "Cliente", client?.name ?? "—"],
  [client?.kind === "pj" ? "CNPJ" : "CPF", client?.document ?? "—"],
  ["Telefone / WhatsApp", [client?.phone, client?.whatsapp].filter(Boolean).join(" / ") || "—"],
  ["E-mail", client?.email ?? "—"],
  [
    "Endereço",
    [client?.address, client?.number, client?.district].filter(Boolean).join(", ") || "—",
  ],
  ["Cidade / UF", [client?.city, client?.state].filter(Boolean).join(" / ") || "—"],
];

const equipLines = (eq: any): [string, string][] =>
  eq
    ? [
        ["Equipamento", eq.type ?? "—"],
        ["Marca / Modelo", [eq.brand, eq.model].filter(Boolean).join(" / ") || "—"],
        ["Nº de série", eq.serial_number ?? "—"],
        ["Gás refrigerante", [eq.refrigerant, eq.refrigerant_amount].filter(Boolean).join(" - ") || "—"],
      ]
    : [];

export async function budgetPdf(opts: {
  company: Company;
  budget: any;
  items: any[];
  client: any;
  equipment: any;
  logo?: string | undefined;
  link?: string;
}) {
  const { company, budget, items, client, equipment, logo } = opts;
  const doc = new jsPDF();
  const ctx = { doc, company, title: "Orçamento", subtitle: `${budget.number}  •  ${dateBR(budget.issue_date)}`, logo };
  let y = header(doc, company, ctx.title, ctx.subtitle, logo);

  y = sectionTitle(ctx, y, "Dados do cliente");
  y = pair(ctx, y, clientLines(client));
  if (equipment) {
    y = sectionTitle(ctx, y, "Equipamento");
    y = pair(ctx, y, equipLines(equipment));
  }
  y = sectionTitle(ctx, y, "Descrição do problema / serviço");
  y = block(ctx, y, "Problema relatado", budget.problem_description ?? "—");

  const servicos = items.filter((i) => i.kind === "servico");
  const pecas = items.filter((i) => i.kind !== "servico");
  if (servicos.length) {
    y = sectionTitle(ctx, y, "Serviços");
    y = itemsTable(ctx, y, servicos);
  }
  if (pecas.length) {
    y = sectionTitle(ctx, y, "Peças e materiais");
    y = itemsTable(ctx, y, pecas);
  }

  y = totalsBox(
    ctx,
    y + 2,
    [
      ["Serviços / mão de obra", brl(budget.labor_total)],
      ["Peças e materiais", brl(budget.items_total)],
      ["Deslocamento", brl(budget.travel_fee)],
      ["Desconto", `- ${brl(budget.discount)}`],
    ],
    ["VALOR TOTAL", brl(budget.total)],
  );

  y = sectionTitle(ctx, y, "Condições");
  y = pair(ctx, y, [
    ["Prazo de execução", budget.deadline ?? "—"],
    ["Validade do orçamento", dateBR(budget.valid_until)],
  ]);
  y = block(ctx, y, "Condições de pagamento", budget.payment_conditions ?? company.payment_conditions);
  y = block(ctx, y, "Observações", budget.notes ?? company.default_notes);

  y = ensureSpace(ctx, y, 25);
  const sy = y + 6;
  doc.setDrawColor(...GRAY);
  doc.line(M, sy + 10, M + 80, sy + 10);
  doc.setFontSize(8);
  doc.text("Aceite do cliente (assinatura)", M, sy + 14);
  doc.line(doc.internal.pageSize.getWidth() - M - 60, sy + 10, doc.internal.pageSize.getWidth() - M, sy + 10);
  doc.text("Data", doc.internal.pageSize.getWidth() - M - 60, sy + 14);

  footer(doc, company);
  return deliver(doc, `${budget.number || "documento"}.pdf`);
}

export async function workOrderPdf(opts: {
  company: Company;
  order: any;
  items: any[];
  client: any;
  equipment: any;
  logo?: string | undefined;
}) {
  const { company, order, items, client, equipment, logo } = opts;
  const doc = new jsPDF();
  const ctx = { doc, company, title: "Ordem de Serviço", subtitle: `${order.number}  •  ${dateBR(order.service_date)}`, logo };
  let y = header(doc, company, ctx.title, ctx.subtitle, logo);

  y = sectionTitle(ctx, y, "Dados do cliente");
  y = pair(ctx, y, [
    ...clientLines(client),
    ["Nome fantasia", client?.trade_name ?? "—"],
    ["Contato responsável", client?.contact_person ?? "—"],
    ["Inscrição estadual", client?.state_registration ?? "—"],
    ["Complemento / CEP", [client?.complement, client?.zip_code].filter(Boolean).join(" / ") || "—"],
  ]);

  y = sectionTitle(ctx, y, "Atendimento");
  y = pair(ctx, y, [
    ["Técnico responsável", order.technician_name ?? "—"],
    ["Data / horário", `${dateBR(order.service_date)} ${order.service_time ?? ""}`.trim()],
    ["Tipo de atendimento", order.service_type ?? "—"],
    ["Status", String(order.status).replace(/_/g, " ")],
  ]);

  if (equipment) {
    y = sectionTitle(ctx, y, "Equipamento");
    y = pair(ctx, y, [
      ...equipLines(equipment),
      ["Patrimônio", equipment.asset_tag ?? "—"],
      ["Capacidade", equipment.capacity ?? "—"],
      ["Tensão", equipment.voltage ?? "—"],
      ["Compressor", equipment.compressor ?? "—"],
      ["Local de instalação", equipment.install_location ?? "—"],
      ["Data de instalação", dateBR(equipment.install_date)],
      ["Estado de conservação", equipment.condition ?? "—"],
    ]);
  }

  y = sectionTitle(ctx, y, "Execução");
  y = block(ctx, y, "Problema relatado pelo cliente", order.reported_problem);
  y = block(ctx, y, "Diagnóstico técnico", order.diagnosis);
  y = block(ctx, y, "Serviço executado", order.executed_service);

  y = sectionTitle(ctx, y, "Medições técnicas");
  y = pair(
    ctx,
    y,
    [
      ["Gás refrigerante", order.refrigerant ?? "—"],
      ["Quantidade de gás", order.refrigerant_amount ?? "—"],
      ["Pressões", order.pressures ?? "—"],
      ["Corrente do compressor", order.compressor_current ?? "—"],
      ["Temperaturas", order.temperatures ?? "—"],
      ["Testes realizados", order.tests ?? "—"],
    ],
    2,
  );

  if (items.length) {
    y = sectionTitle(ctx, y, "Peças e materiais utilizados");
    y = itemsTable(ctx, y, items);
    y = totalsBox(ctx, y, [], ["TOTAL DO SERVIÇO", brl(order.total)]);
  }

  y = block(ctx, y, "Observações", order.notes ?? company.default_notes);

  y = ensureSpace(ctx, y, order.signature ? 38 : 18);
  let sy = y + 4;
  if (order.signature) {
    try {
      doc.addImage(order.signature, "PNG", M, sy, 60, 22);
      sy += 22;
    } catch {
      /* assinatura inválida */
    }
  }
  doc.setDrawColor(...GRAY);
  doc.line(M, sy + 4, M + 80, sy + 4);
  doc.setFontSize(8);
  doc.text(
    `Assinatura do cliente${order.signed_at ? ` — ${dateBR(order.signed_at)}` : ""}`,
    M,
    sy + 8,
  );

  footer(doc, company);
  return deliver(doc, `${order.number || "documento"}.pdf`);
}

export async function reportPdf(opts: {
  company: Company;
  report: any;
  client: any;
  equipment: any;
  logo?: string | undefined;
}) {
  const { company, report, client, equipment, logo } = opts;
  const doc = new jsPDF();
  const ctx = {
    doc,
    company,
    title: "Laudo Técnico",
    subtitle: `${report.number}  •  ${dateBR(report.inspection_date)}`,
    logo,
  };
  let y = header(
    doc,
    company,
    ctx.title,
    ctx.subtitle,
    logo,
  );

  y = sectionTitle(ctx, y, "Identificação");
  y = pair(ctx, y, [
    ["Cliente", client?.name ?? "—"],
    ["Local da inspeção", report.location ?? "—"],
    ["Equipamento", equipment?.type ?? "—"],
    ["Marca / Modelo", [equipment?.brand, equipment?.model].filter(Boolean).join(" / ") || "—"],
    ["Nº de série", equipment?.serial_number ?? "—"],
    ["Técnico responsável", report.technician_name ?? "—"],
  ]);

  y = sectionTitle(ctx, y, "Inspeção técnica");
  y = pair(
    ctx,
    y,
    [
      ["Estado geral", report.general_condition ?? "—"],
      ["Compressor", report.compressor ?? "—"],
      ["Condensador", report.condenser ?? "—"],
      ["Evaporador", report.evaporator ?? "—"],
      ["Ventiladores", report.fans ?? "—"],
      ["Controlador", report.controller ?? "—"],
      ["Sensores", report.sensors ?? "—"],
      ["Termostato", report.thermostat ?? "—"],
      ["Sistema elétrico", report.electrical_system ?? "—"],
      ["Tubulação", report.piping ?? "—"],
      ["Isolamento", report.insulation ?? "—"],
      ["Dreno", report.drain ?? "—"],
      ["Sistema de degelo", report.defrost_system ?? "—"],
      ["Vazamento de fluido", report.refrigerant_leak ?? "—"],
    ],
    2,
  );

  y = sectionTitle(ctx, y, "Medições");
  y = pair(
    ctx,
    y,
    [
      ["Pressões", report.pressures ?? "—"],
      ["Temperaturas", report.temperatures ?? "—"],
      ["Corrente elétrica", report.current_reading ?? "—"],
      ["Tensão", report.voltage ?? "—"],
      ["Estado do fluido refrigerante", report.refrigerant_state ?? "—"],
    ],
    2,
  );

  y = sectionTitle(ctx, y, "Conclusão técnica");
  y = block(ctx, y, "Diagnóstico técnico", report.diagnosis);
  y = block(ctx, y, "Causa provável do problema", report.probable_cause);
  y = block(ctx, y, "Recomendação técnica", report.recommendation);
  y = block(ctx, y, "Serviço recomendado", report.recommended_service);

  y = ensureSpace(ctx, y, 15);
  const sy = y + 7;
  doc.setDrawColor(...GRAY);
  doc.line(M, sy, M + 80, sy);
  doc.setFontSize(8);
  doc.text(`Responsável técnico — ${report.technician_name ?? company.name}`, M, sy + 4);

  footer(doc, company);
  return deliver(doc, `${report.number || "documento"}.pdf`);
}

export async function warrantyPdf(opts: {
  company: Company;
  warranty: any;
  client: any;
  equipment: any;
  logo?: string | undefined;
  validateUrl: string;
}) {
  const { company, warranty, client, equipment, logo, validateUrl } = opts;
  const doc = new jsPDF();
  const w = doc.internal.pageSize.getWidth();
  const ctx = {
    doc,
    company,
    title: "Certificado de Garantia",
    subtitle: `${warranty.number}  •  Emitido em ${dateBR(warranty.created_at ?? new Date())}`,
    logo,
  };
  let y = header(
    doc,
    company,
    ctx.title,
    ctx.subtitle,
    logo,
  );

  doc.setFillColor(...NAVY);
  doc.rect(M, y, w - M * 2, 20, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text("CERTIFICADO DE GARANTIA", w / 2, y + 9, { align: "center" });
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`${warranty.days} dias — válido até ${dateBR(warranty.end_date)}`, w / 2, y + 15.5, {
    align: "center",
  });
  doc.setTextColor(20, 20, 20);
  y += 26;

  y = sectionTitle(ctx, y, "Beneficiário");
  y = pair(ctx, y, [
    ["Cliente", client?.name ?? "—"],
    [client?.kind === "pj" ? "CNPJ" : "CPF", client?.document ?? "—"],
    ["Equipamento", equipment?.type ?? "—"],
    ["Marca / Modelo / Série", [equipment?.brand, equipment?.model, equipment?.serial_number].filter(Boolean).join(" / ") || "—"],
  ]);

  y = sectionTitle(ctx, y, "Serviço garantido");
  y = block(ctx, y, "Serviço realizado", warranty.service_performed);
  y = block(ctx, y, "Peças utilizadas", warranty.parts_used);
  y = pair(ctx, y, [
    ["Data do serviço", dateBR(warranty.service_date)],
    ["Início da garantia", dateBR(warranty.start_date)],
    ["Prazo", `${warranty.days} dias`],
    ["Vencimento", dateBR(warranty.end_date)],
  ]);

  y = sectionTitle(ctx, y, "Condições da garantia");
  y = block(ctx, y, "Condições", warranty.conditions ?? company.warranty_terms);
  y = block(ctx, y, "Exclusões", warranty.exclusions);
  y = block(ctx, y, "Observações", warranty.notes);

  try {
    const qr = await QRCode.toDataURL(validateUrl, { margin: 1, width: 240 });
    y = ensureSpace(ctx, y, 42);
    const qy = y + 2;
    doc.addImage(qr, "PNG", w - M - 30, qy, 30, 30);
    doc.setFontSize(7.5);
    doc.setTextColor(...GRAY);
    doc.text("Valide este certificado", w - M - 15, qy + 34, { align: "center" });
    doc.setTextColor(20, 20, 20);
    doc.setDrawColor(...GRAY);
    doc.line(M, qy + 24, M + 80, qy + 24);
    doc.setFontSize(8);
    doc.text(company.name, M, qy + 28);
  } catch {
    /* QR opcional */
  }

  footer(doc, company);
  return deliver(doc, `${warranty.number || "documento"}.pdf`);
}
