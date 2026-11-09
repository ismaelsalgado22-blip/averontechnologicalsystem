import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Bell } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/hooks/use-auth';
import { useNotificationSettings, useNotifications } from '@/hooks/use-notifications';
import { playAlert } from '@/lib/notification-settings';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { NotificationList } from '@/components/notification-list';
import { Link } from '@tanstack/react-router';
import { toast } from 'sonner';
export function AlertsBell() {
  const [open, setOpen] = useState(false); const { user } = useSession(); const qc = useQueryClient();
  const { data: settings } = useNotificationSettings(); const { data } = useNotifications(0, true);
  const current = useRef(settings); current.current = settings;
  useEffect(() => {
    if (!user) return;
    let mounted = true;
    const refresh = async () => { const { error } = await supabase.rpc('refresh_due_notifications'); if (!error && mounted) qc.invalidateQueries({ queryKey: ['notifications'] }); };
    void refresh(); const interval = window.setInterval(refresh, 60000);
    const channel = supabase.channel(`notifications-${user.id}-${crypto.randomUUID()}`).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `owner_id=eq.${user.id}` }, payload => {
      qc.invalidateQueries(); const n = payload.new; const s = current.current; const e = s?.events[String(n['event'])];
      if (!s?.enabled || !e) return;
      // Only one visible window produces sound; persistent deduplication also covers other tabs.
      if (document.visibilityState !== 'visible') return;
      const key = `averon-notification-${user.id}-${String(n['id'])}`;
      const deliver = () => {
        if (localStorage.getItem(key)) return; localStorage.setItem(key, 'seen');
        if (s.sound && e.sound) void playAlert(e.tone, s.volume).catch(() => {});
        if (s.visual && e.visible) { toast.info(String(n['title']), { description: String(n['body']) }); if ('Notification' in window && Notification.permission === 'granted') new Notification(String(n['title']), { body: String(n['body']), tag: key, icon: '/favicon.png' }); }
      };
      if (navigator.locks) void navigator.locks.request(key, deliver); else deliver();
    }).on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'notifications', filter: `owner_id=eq.${user.id}` }, () => qc.invalidateQueries({ queryKey: ['notifications'] })).subscribe();
    return () => { mounted = false; clearInterval(interval); void supabase.removeChannel(channel); };
  }, [user?.id, qc]);
  return <><Button variant="ghost" size="icon" title="Notificações" aria-label="Abrir notificações" className="relative" onClick={() => setOpen(true)}><Bell className="size-5"/>{Boolean(data?.count) && <span className="absolute -right-1 -top-1 flex min-h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] text-destructive-foreground">{Math.min(data?.count ?? 0, 99)}</span>}</Button><Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-w-2xl"><DialogHeader><DialogTitle>Notificações</DialogTitle></DialogHeader><div className="flex gap-4 text-sm"><Link to="/notificacoes" className="text-primary" onClick={() => setOpen(false)}>Central de notificações</Link><Link to="/configuracoes" className="text-primary" onClick={() => setOpen(false)}>Sons e preferências</Link></div><NotificationList/></DialogContent></Dialog></>;
}