import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useNotificationSettings } from '@/hooks/use-notifications';
import { defaultSettings, EVENTS, SOUNDS, playAlert, type EventSettings } from '@/lib/notification-settings';
import { Volume2, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
export function NotificationPreferences() {
  const { data, save, isPending, error } = useNotificationSettings();
  if (isPending) return <p>Carregando preferências…</p>;
  if (error || !data) return <p role="alert" className="text-destructive">Não foi possível carregar as preferências.</p>;
  const update = (patch: Partial<typeof data>) => save.mutate({ ...data, ...patch });
  const event = (key: string, patch: Partial<EventSettings>) => update({ events: { ...data.events, [key]: { ...(data.events[key] ?? defaultSettings().events[key] as EventSettings), ...patch } } });
  const test = (tone: keyof typeof SOUNDS) => playAlert(tone, data.volume).catch(() => toast.error('O navegador não permitiu reproduzir o som'));
  const permission = async () => {
    if (!('Notification' in window)) return toast.error('Este navegador não oferece notificações');
    if (window.top !== window.self) return toast.info('Abra o Averon em uma aba própria para autorizar notificações');
    const result = await Notification.requestPermission();
    toast.info(result === 'granted' ? 'Notificações do navegador autorizadas' : 'Notificações não autorizadas. Confira as permissões do site no navegador.');
  };
  return <section className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-semibold">Preferências de notificações</h2><Button variant="ghost" size="sm" onClick={() => save.mutate(defaultSettings())}><RotateCcw className="size-4"/>Restaurar padrão</Button></div>
    <div className="grid gap-4 sm:grid-cols-2">{([['enabled','Notificações'],['sound','Alertas sonoros'],['visual','Alertas visuais']] as const).map(([key,label]) => <label key={key} className="flex items-center justify-between gap-4"><span>{label}</span><Switch aria-label={label} checked={data[key]} onCheckedChange={v => { if (key === 'sound' && v) test('suave'); update({ [key]: v }); }}/></label>)}<label className="flex items-center gap-3"><span className="shrink-0">Volume {data.volume}%</span><Input aria-label="Volume dos alertas" type="range" min={0} max={100} value={data.volume} onChange={e => update({ volume: Number(e.target.value) })}/></label></div>
    <div className="flex flex-wrap gap-2"><Button variant="outline" onClick={permission}>Autorizar avisos do navegador</Button><Button variant="outline" onClick={() => test('sino')}><Volume2 className="size-4"/>Testar som</Button></div>
    <div className="divide-y divide-border">{Object.entries(EVENTS).map(([key,label]) => { const e = data.events[key]; if (!e) return null; return <div key={key} className="grid items-center gap-3 py-4 sm:grid-cols-[1fr_auto_auto_140px_120px_auto]"><span className="font-medium">{label}</span><label className="flex items-center gap-2 text-xs">Som<Switch aria-label={`Som: ${label}`} checked={e.sound} onCheckedChange={v => event(key, { sound: v })}/></label><label className="flex items-center gap-2 text-xs">Visual<Switch aria-label={`Visual: ${label}`} checked={e.visible} onCheckedChange={v => event(key, { visible: v })}/></label><Select value={e.tone} onValueChange={v => event(key, { tone: v as keyof typeof SOUNDS })}><SelectTrigger aria-label={`Som selecionado: ${label}`}><SelectValue/></SelectTrigger><SelectContent>{Object.entries(SOUNDS).map(([value,text]) => <SelectItem key={value} value={value}>{text}</SelectItem>)}</SelectContent></Select><Select value={e.priority} onValueChange={v => event(key, { priority: v as EventSettings['priority'] })}><SelectTrigger aria-label={`Prioridade: ${label}`}><SelectValue/></SelectTrigger><SelectContent><SelectItem value="baixa">Baixa</SelectItem><SelectItem value="normal">Normal</SelectItem><SelectItem value="alta">Alta</SelectItem></SelectContent></Select><Button variant="ghost" size="icon" aria-label={`Testar som: ${label}`} title="Testar som" onClick={() => test(e.tone)}><Volume2 className="size-4"/></Button></div>; })}</div>
    <p role="status" className="text-xs text-muted-foreground">{save.isPending ? 'Salvando preferências…' : save.isError ? 'Falha ao salvar preferências.' : 'Preferências salvas automaticamente.'}</p>
  </section>;
}