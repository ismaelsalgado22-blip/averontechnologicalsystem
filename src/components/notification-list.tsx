import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCheck, Check, ArrowLeft, ArrowRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { useNotifications } from '@/hooks/use-notifications';
import { MODULE_PATHS } from '@/lib/notification-settings';
import { dateTimeBR } from '@/lib/format';
import { toast } from 'sonner';
export function NotificationList() {
  const [page, setPage] = useState(0); const [unread, setUnread] = useState(false); const qc = useQueryClient();
  const { data, isPending, error } = useNotifications(page, unread);
  const mark = useMutation({ mutationFn: async (id?: string) => { let q = supabase.from('notifications').update({ read_at: new Date().toISOString() }).is('read_at', null); if (id) q = q.eq('id', id); const { error } = await q; if (error) throw error; }, onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }), onError: () => toast.error('Não foi possível marcar como lida') });
  return <div className="space-y-4">
    <div className="flex flex-wrap gap-2"><Button size="sm" variant={unread ? 'outline' : 'secondary'} onClick={() => { setUnread(false); setPage(0); }}>Todas</Button><Button size="sm" variant={unread ? 'secondary' : 'outline'} onClick={() => { setUnread(true); setPage(0); }}>Não lidas</Button><Button size="sm" variant="ghost" onClick={() => mark.mutate(undefined)} disabled={mark.isPending}><CheckCheck className="size-4"/>Marcar todas como lidas</Button></div>
    {isPending && <p role="status">Carregando notificações…</p>}{error && <p role="alert" className="text-destructive">Não foi possível carregar as notificações.</p>}
    <div className="divide-y divide-border">{data?.rows.map(n => <div key={n.id} className="flex items-start gap-3 py-4"><div className="min-w-0 flex-1"><div className="flex flex-wrap gap-2"><a className={`font-semibold hover:text-primary ${n.read_at ? 'text-muted-foreground' : 'text-foreground'}`} href={MODULE_PATHS[n.module] ?? '/dashboard'}>{n.title}</a>{n.priority === 'alta' && <span className="text-xs text-destructive">Alta prioridade</span>}</div><p className="whitespace-pre-wrap break-words text-sm text-muted-foreground">{n.body}</p><p className="mt-1 text-xs text-muted-foreground">{dateTimeBR(n.created_at)}</p></div>{!n.read_at && <Button variant="ghost" size="icon" title="Marcar como lida" aria-label="Marcar como lida" disabled={mark.isPending} onClick={() => mark.mutate(n.id)}><Check className="size-4"/></Button>}</div>)}</div>
    {data && !data.rows.length && <p className="py-6 text-muted-foreground">Nenhuma notificação.</p>}
    <div className="flex items-center justify-between"><Button variant="outline" size="icon" aria-label="Página anterior" disabled={!page} onClick={() => setPage(p => p - 1)}><ArrowLeft className="size-4"/></Button><span className="text-xs">Página {page + 1} • {data?.count ?? 0} notificações</span><Button variant="outline" size="icon" aria-label="Próxima página" disabled={(page + 1) * 25 >= (data?.count ?? 0)} onClick={() => setPage(p => p + 1)}><ArrowRight className="size-4"/></Button></div>
  </div>;
}