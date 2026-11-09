export const EVENTS = {
  novo_cliente: 'Novos clientes', nova_ordem: 'Novas ordens de serviço', novo_orcamento: 'Novos orçamentos',
  orcamento_aprovado: 'Orçamento aprovado', servico_atualizado: 'Atualizações de serviços',
  pagamento_recebido: 'Pagamentos recebidos', agenda_atualizada: 'Alterações na agenda',
  agenda_proxima: 'Lembretes de agenda', financeiro_pendente: 'Pendências financeiras',
  garantia_vencendo: 'Garantias a vencer', estoque_baixo: 'Estoque baixo',
} as const;
export const SOUNDS = { sino: 'Sino', suave: 'Suave', duplo: 'Duplo', urgente: 'Urgente' } as const;
export type EventSettings = { sound: boolean; visible: boolean; tone: keyof typeof SOUNDS; priority: 'baixa' | 'normal' | 'alta' };
export type NotificationSettings = { enabled: boolean; sound: boolean; visual: boolean; volume: number; events: Record<string, EventSettings> };
export function defaultSettings(): NotificationSettings {
  return { enabled: true, sound: false, visual: true, volume: 50, events: Object.fromEntries(Object.keys(EVENTS).map((key, i) => [key, { sound: true, visible: true, tone: (Object.keys(SOUNDS) as (keyof typeof SOUNDS)[])[i % 4] ?? 'sino', priority: 'normal' }])) };
}
export function parseSettings(value: unknown): NotificationSettings {
  const defaults = defaultSettings();
  if (!value || typeof value !== 'object') return defaults;
  const v = value as Partial<NotificationSettings>;
  return { enabled: typeof v.enabled === 'boolean' ? v.enabled : defaults.enabled, sound: typeof v.sound === 'boolean' ? v.sound : defaults.sound, visual: typeof v.visual === 'boolean' ? v.visual : defaults.visual, volume: typeof v.volume === 'number' ? Math.max(0, Math.min(100, v.volume)) : defaults.volume, events: Object.fromEntries(Object.keys(EVENTS).map(key => { const e = v.events?.[key]; return [key, { ...defaults.events[key], ...(e ? { sound: typeof e.sound === 'boolean' ? e.sound : true, visible: typeof e.visible === 'boolean' ? e.visible : true, tone: e.tone in SOUNDS ? e.tone : 'sino', priority: ['baixa','normal','alta'].includes(e.priority) ? e.priority : 'normal' } : {}) }]; })) };
}
let audio: AudioContext | undefined;
export async function playAlert(tone: keyof typeof SOUNDS, volume: number) {
  audio ??= new AudioContext();
  await audio.resume();
  const frequencies = { sino: [880, 1174], suave: [440, 660], duplo: [660, 660], urgente: [880, 660, 880] }[tone];
  frequencies.forEach((frequency, i) => {
    if (!audio) return;
    const osc = audio.createOscillator(); const gain = audio.createGain(); const start = audio.currentTime + i * .22;
    osc.frequency.value = frequency; gain.gain.setValueAtTime(Math.max(0, Math.min(volume, 100)) / 400, start);
    gain.gain.exponentialRampToValueAtTime(.001, start + .2); osc.connect(gain); gain.connect(audio.destination); osc.start(start); osc.stop(start + .21);
  });
}
export const MODULE_PATHS: Record<string, string> = { clients: '/clientes', work_orders: '/ordens', budgets: '/orcamentos', appointments: '/agenda', guest_appointments: '/agenda', payments: '/financeiro', warranties: '/garantias', products: '/estoque', equipment: '/equipamentos', services: '/servicos', technical_reports: '/laudos' };