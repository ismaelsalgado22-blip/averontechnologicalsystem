export type MsgVars = {
  nome?: string | null;
  equipamento?: string | null;
  data?: string | null;
  horario?: string | null;
  documento?: string | null;
  link?: string | null;
  valor?: string | null;
};

const fill = (tpl: string, v: MsgVars) =>
  tpl
    .replace(/\[NOME\]/g, v.nome ?? "cliente")
    .replace(/\[EQUIPAMENTO\]/g, v.equipamento ?? "seu equipamento")
    .replace(/\[DATA\]/g, v.data ?? "")
    .replace(/\[HORÁRIO\]/g, v.horario ?? "")
    .replace(/\[DOCUMENTO\]/g, v.documento ?? "")
    .replace(/\[VALOR\]/g, v.valor ?? "")
    .replace(/\[LINK\]/g, v.link ?? "");

export const MSG = {
  orcamento: (v: MsgVars) =>
    fill(
      "Olá, [NOME]! Aqui é da MEC Frio Refrigeração. Estamos enviando seu orçamento [DOCUMENTO] referente ao equipamento [EQUIPAMENTO]. Valor total: [VALOR]. Você pode visualizar pelo link: [LINK]",
      v,
    ),
  agendamento: (v: MsgVars) =>
    fill(
      "Olá, [NOME]! Confirmamos seu atendimento da MEC Frio Refrigeração para o dia [DATA] às [HORÁRIO]. Qualquer alteração, é só nos avisar por aqui.",
      v,
    ),
  concluido: (v: MsgVars) =>
    fill(
      "Olá, [NOME]! Seu serviço foi concluído. Estamos enviando sua Ordem de Serviço [DOCUMENTO] referente ao equipamento [EQUIPAMENTO]. Obrigado pela confiança!",
      v,
    ),
  garantia: (v: MsgVars) =>
    fill(
      "Olá, [NOME]! Seu serviço realizado pela MEC Frio Refrigeração possui garantia até [DATA]. Certificado [DOCUMENTO]. Qualquer necessidade, estamos à disposição.",
      v,
    ),
  laudo: (v: MsgVars) =>
    fill(
      "Olá, [NOME]! Segue o Laudo Técnico [DOCUMENTO] do equipamento [EQUIPAMENTO], emitido pela MEC Frio Refrigeração.",
      v,
    ),
  livre: (v: MsgVars) => fill("Olá, [NOME]! Aqui é da MEC Frio Refrigeração.", v),
};

export const MSG_OPTIONS = [
  { key: "orcamento", label: "Orçamento" },
  { key: "agendamento", label: "Agendamento" },
  { key: "concluido", label: "Serviço concluído" },
  { key: "garantia", label: "Garantia" },
  { key: "laudo", label: "Laudo técnico" },
  { key: "livre", label: "Mensagem livre" },
] as const;
