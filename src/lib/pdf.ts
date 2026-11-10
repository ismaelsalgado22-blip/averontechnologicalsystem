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
const contexts = new WeakMap<Doc, { company: Company; title: string; subtitle: string; logo: string | undefined }>();
function bottom(doc: Doc) { return doc.internal.pageSize.getHeight() - 24; }
function nextPage(doc: Doc) {
  const ctx = contexts.get(doc); if (!ctx) throw new Error('Documento não inicializado');
  footer(doc, ctx.company); doc.addPage(); return header(doc, ctx.company, ctx.title, ctx.subtitle, ctx.logo);
}
function space(doc: Doc, y: number, height: number) { return y + height > bottom(doc) ? nextPage(doc) : y; }


function header(doc: Doc, company: Company, title: string, subtitle: string, logo?: string) {
  contexts.set(doc, { company, title, subtitle, logo });
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

export type PdfResult = { url: string; filename: string; blob: Blob };

/** Gera o arquivo e devolve um endereço temporário para visualizar/baixar na própria tela. */
function deliver(doc: Doc, filename: string): PdfResult {
  const base = filename || "documento";
  const safe = base.replace(/[^\w\-.]+/g, "-") + (base.toLowerCase().endsWith(".pdf") ? "" : ".pdf");
  const blob = doc.output("blob") as Blob;
  return { url: URL.createObjectURL(blob), filename: safe, blob };
}


function sectionTitle(doc: Doc, y: number, text: string) {
  y = space(doc, y, 22);
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

function pair(doc: Doc, y: number, items: [string, string][], cols = 2) {
  const colW = (doc.internal.pageSize.getWidth() - M * 2) / cols;
  for (let i = 0; i < items.length; i += cols) {
    const row = items.slice(i, i + cols);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5);
    const wrapped = row.map(it => doc.splitTextToSize(it[1] || '—', colW - 4) as string[]);
    let offset = 0; const total = Math.max(...wrapped.map(lines => lines.length));
    while (offset < total) {
      y = space(doc, y, 16); const count = Math.min(total - offset, Math.max(1, Math.floor((bottom(doc) - y - 10) / 4.2)));
      row.forEach((it,c) => { const x = M + c * colW; doc.setFont('helvetica','normal'); doc.setFontSize(8); doc.setTextColor(...GRAY); doc.text(it[0].toUpperCase() + (offset ? ' (CONT.)' : ''),x,y); doc.setTextColor(20,20,20); doc.setFont('helvetica','bold'); doc.setFontSize(8.5); const lines = wrapped[c]?.slice(offset,offset+count) ?? []; if (lines.length) doc.text(lines,x,y+4.2,{lineHeightFactor:1.4}); });
      y += count * 4.2 + 8; offset += count;
      if (offset < total) y = nextPage(doc);
    }
  }
  doc.setFont('helvetica','normal'); return y;
}
function block(doc: Doc, y: number, label: string, text?: string | null) {
  if (!text) return y;
  doc.setFont('helvetica','normal'); doc.setFontSize(9);
  const lines = doc.splitTextToSize(text, doc.internal.pageSize.getWidth() - M * 2) as string[];
  let offset = 0;
  while (offset < lines.length) {
    y = space(doc,y,18); const count = Math.min(lines.length - offset,Math.max(1,Math.floor((bottom(doc)-y-10)/4.2)));
    doc.setFontSize(8); doc.setTextColor(...GRAY); doc.text(label.toUpperCase() + (offset ? ' (CONTINUAÇÃO)' : ''), M,y);
    doc.setFontSize(9); doc.setTextColor(20,20,20); doc.text(lines.slice(offset,offset+count),M,y+4.5,{lineHeightFactor:1.32});
    y += count*4.2+8; offset+=count; if (offset<lines.length) y=nextPage(doc);
  }
  return y;
}
function itemsTable(doc: Doc,y: number,rows: {description:string;quantity:number;unit_price:number;total:number}[]) {
  const w = doc.internal.pageSize.getWidth()-M*2; const xq=M+w*.6,xu=M+w*.72,xt=M+w;
  const tableHead = () => { y=space(doc,y,18); doc.setFillColor(235,240,248); doc.rect(M,y,w,7,'F'); doc.setFontSize(8); doc.setFont('helvetica','bold'); doc.text('DESCRIÇÃO',M+2,y+4.8); doc.text('QTD',xq,y+4.8); doc.text('V. UNIT.',xu,y+4.8); doc.text('TOTAL',xt-2,y+4.8,{align:'right'}); doc.setFont('helvetica','normal'); y+=7; };
  tableHead();
  rows.forEach((r,i) => { doc.setFontSize(8.5); const lines=doc.splitTextToSize(r.description,w*.56) as string[]; let offset=0;
    while(offset<lines.length) { if (y+10>bottom(doc)) {y=nextPage(doc);tableHead();} const count=Math.min(lines.length-offset,Math.max(1,Math.floor((bottom(doc)-y-3)/4.2))); const h=Math.max(7,count*4.2+3); if(i%2) {doc.setFillColor(247,249,252);doc.rect(M,y,w,h,'F');} doc.setFontSize(8.5);doc.text(lines.slice(offset,offset+count),M+2,y+4.5,{lineHeightFactor:1.4}); if(!offset) {doc.text(String(r.quantity),xq,y+4.5);doc.text(brl(r.unit_price),xu,y+4.5);doc.text(brl(r.total),xt-2,y+4.5,{align:'right'});} y+=h;offset+=count;if(offset<lines.length){y=nextPage(doc);tableHead();} }
  });return y+4;
}

function totalsBox(doc: Doc, y: number, lines: [string, string][], highlight: [string, string]) {
  y = space(doc, y, lines.length * 5.5 + 20);
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
  let y = header(doc, company, "Orçamento", `${budget.number}  •  ${dateBR(budget.issue_date)}`, logo);

  y = sectionTitle(doc, y, "Dados do cliente");
  y = pair(doc, y, clientLines(client));
  if (equipment) {
    y = sectionTitle(doc, y, "Equipamento");
    y = pair(doc, y, equipLines(equipment));
  }
  y = sectionTitle(doc, y, "Descrição do problema / serviço");
  y = block(doc, y, "Problema relatado", budget.problem_description ?? "—");

  const servicos = items.filter((i) => i.kind === "servico");
  const pecas = items.filter((i) => i.kind !== "servico");
  if (servicos.length) {
    y = sectionTitle(doc, y, "Serviços");
    y = itemsTable(doc, y, servicos);
  }
  if (pecas.length) {
    y = sectionTitle(doc, y, "Peças e materiais");
    y = itemsTable(doc, y, pecas);
  }

  y = totalsBox(
    doc,
    y + 2,
    [
      ["Serviços / mão de obra", brl(budget.labor_total)],
      ["Peças e materiais", brl(budget.items_total)],
      ["Deslocamento", brl(budget.travel_fee)],
      ["Desconto", `- ${brl(budget.discount)}`],
    ],
    ["VALOR TOTAL", brl(budget.total)],
  );

  y = sectionTitle(doc, y, "Condições");
  y = pair(doc, y, [
    ["Prazo de execução", budget.deadline ?? "—"],
    ["Validade do orçamento", dateBR(budget.valid_until)],
  ]);
  y = block(doc, y, "Condições de pagamento", budget.payment_conditions ?? company.payment_conditions);
  y = block(doc, y, "Observações", budget.notes ?? company.default_notes);

  const h = doc.internal.pageSize.getHeight();
  const sy = space(doc, y + 8, 26);
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
  let y = header(doc, company, "Ordem de Serviço", `${order.number}  •  ${dateBR(order.service_date)}`, logo);

  y = sectionTitle(doc, y, "Dados do cliente");
  y = pair(doc, y, [...clientLines(client), ["CEP", client?.zip_code ?? "—"], ["Complemento", client?.complement ?? "—"], ["Contato responsável", client?.contact_person ?? "—"]]);
  y = sectionTitle(doc, y, "Atendimento");
  y = pair(doc, y, [
    ["Cliente", client?.name ?? "—"],
    ["Telefone", client?.phone ?? client?.whatsapp ?? "—"],
    ["Técnico responsável", order.technician_name ?? "—"],
    ["Data / horário", `${dateBR(order.service_date)} ${order.service_time ?? ""}`.trim()],
    ["Tipo de atendimento", order.service_type ?? "—"],
    ["Status", String(order.status).replace(/_/g, " ")],
  ]);

  if (equipment) {
    y = sectionTitle(doc, y, "Equipamento");
    y = pair(doc, y, equipLines(equipment));
  }

  y = sectionTitle(doc, y, "Execução");
  y = block(doc, y, "Problema relatado pelo cliente", order.reported_problem);
  y = block(doc, y, "Diagnóstico técnico", order.diagnosis);
  y = block(doc, y, "Serviço executado", order.executed_service);

  y = sectionTitle(doc, y, "Medições técnicas");
  y = pair(
    doc,
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
    y = sectionTitle(doc, y, "Peças e materiais utilizados");
    y = itemsTable(doc, y, items);

  }

  y = totalsBox(doc, y, [], ["TOTAL DO SERVIÇO", brl(order.total)]);
  y = block(doc, y, "Observações", order.notes ?? company.default_notes);

  const h = doc.internal.pageSize.getHeight();
  let sy = space(doc, y + 6, order.signature ? 38 : 20);
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
  let y = header(
    doc,
    company,
    "Laudo Técnico",
    `${report.number}  •  ${dateBR(report.inspection_date)}`,
    logo,
  );

  y = sectionTitle(doc, y, "Identificação");
  y = pair(doc, y, [
    ["Cliente", client?.name ?? "—"],
    ["Local da inspeção", report.location ?? "—"],
    ["Equipamento", equipment?.type ?? "—"],
    ["Marca / Modelo", [equipment?.brand, equipment?.model].filter(Boolean).join(" / ") || "—"],
    ["Nº de série", equipment?.serial_number ?? "—"],
    ["Técnico responsável", report.technician_name ?? "—"],
  ]);

  y = sectionTitle(doc, y, "Inspeção técnica");
  y = pair(
    doc,
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

  y = sectionTitle(doc, y, "Medições");
  y = pair(
    doc,
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

  if (y > 215) {
    footer(doc, company);
    doc.addPage();
    y = header(doc, company, "Laudo Técnico", `${report.number} — continuação`, logo);
  }

  y = sectionTitle(doc, y, "Conclusão técnica");
  y = block(doc, y, "Diagnóstico técnico", report.diagnosis);
  y = block(doc, y, "Causa provável do problema", report.probable_cause);
  y = block(doc, y, "Recomendação técnica", report.recommendation);
  y = block(doc, y, "Serviço recomendado", report.recommended_service);

  const h = doc.internal.pageSize.getHeight();
  const sy = space(doc, y + 10, 18);
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
  let y = header(
    doc,
    company,
    "Certificado de Garantia",
    `${warranty.number}  •  Emitido em ${dateBR(warranty.created_at ?? new Date())}`,
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

  y = sectionTitle(doc, y, "Beneficiário");
  y = pair(doc, y, [
    ["Cliente", client?.name ?? "—"],
    [client?.kind === "pj" ? "CNPJ" : "CPF", client?.document ?? "—"],
    ["Equipamento", equipment?.type ?? "—"],
    ["Marca / Modelo / Série", [equipment?.brand, equipment?.model, equipment?.serial_number].filter(Boolean).join(" / ") || "—"],
  ]);

  y = sectionTitle(doc, y, "Serviço garantido");
  y = block(doc, y, "Serviço realizado", warranty.service_performed);
  y = block(doc, y, "Peças utilizadas", warranty.parts_used);
  y = pair(doc, y, [
    ["Data do serviço", dateBR(warranty.service_date)],
    ["Início da garantia", dateBR(warranty.start_date)],
    ["Prazo", `${warranty.days} dias`],
    ["Vencimento", dateBR(warranty.end_date)],
  ]);

  y = sectionTitle(doc, y, "Condições da garantia");
  y = block(doc, y, "Condições", warranty.conditions ?? company.warranty_terms);
  y = block(doc, y, "Exclusões", warranty.exclusions);
  y = block(doc, y, "Observações", warranty.notes);

  try {
    const qr = await QRCode.toDataURL(validateUrl, { margin: 1, width: 240 });
    const h = doc.internal.pageSize.getHeight();
    const qy = space(doc, y + 4, 42);
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
