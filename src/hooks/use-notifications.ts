import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { parseSettings, type NotificationSettings } from '@/lib/notification-settings';
import { useSession } from '@/hooks/use-auth';
import { toast } from 'sonner';

export function useNotificationSettings() {
  const { user } = useSession(); const qc = useQueryClient();
  const query = useQuery({ queryKey: ['notification_preferences', user?.id], enabled: Boolean(user), queryFn: async () => {
    const { data, error } = await supabase.from('notification_preferences').select('settings').eq('user_id', user?.id ?? '').maybeSingle();
    if (error) throw error; return parseSettings(data?.settings);
  }});
  const save = useMutation({ mutationKey: ['save_notification_preferences'], scope: { id: 'notification-preferences' }, mutationFn: async (settings: NotificationSettings) => {
    if (!user) throw new Error('Entre novamente');
    const { error } = await supabase.from('notification_preferences').upsert({ user_id: user.id, settings: JSON.parse(JSON.stringify(settings)), updated_at: new Date().toISOString() });
    if (error) throw error;
  }, onMutate: (settings) => { qc.setQueryData(['notification_preferences', user?.id], settings); }, onError: () => { toast.error('Não foi possível salvar as preferências'); qc.invalidateQueries({ queryKey: ['notification_preferences'] }); } });
  return { ...query, save };
}
export function useNotifications(page = 0, unread = false) {
  const { user } = useSession();
  return useQuery({ queryKey: ['notifications', user?.id, page, unread], enabled: Boolean(user), refetchInterval: 60000, queryFn: async () => {
    let q = supabase.from('notifications').select('*', { count: 'exact' }).order('created_at', { ascending: false }).range(page * 25, page * 25 + 24);
    if (unread) q = q.is('read_at', null);
    const { data, error, count } = await q; if (error) throw error; return { rows: data ?? [], count: count ?? 0 };
  }});
}