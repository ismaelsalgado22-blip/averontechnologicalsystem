import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import type { ReactNode } from 'react';
export function SubscriptionGate({ children }: { children: ReactNode }) {
  const { user, loading } = useSession();
  const { data, isPending, error, refetch } = useQuery({ queryKey: ['subscription', user?.id], enabled: Boolean(user), refetchInterval: 30000, queryFn: async () => { const { data, error } = await supabase.rpc('subscription_is_active'); if (error) throw error; return data; } });
  if (loading || isPending) return <p role="status" className="p-8">Verificando acesso…</p>;
  if (data) return children;
  return <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center"><h1 className="text-2xl font-bold">{error ? 'Não foi possível verificar seu acesso' : 'Assinatura inativa'}</h1><p className="text-muted-foreground">{error ? 'Verifique sua conexão e tente novamente.' : 'A assinatura mensal custa R$ 49,90. Entre em contato com o responsável para liberar seu acesso.'}</p><Button onClick={() => void refetch()}>Já fui liberado, verificar</Button><Button variant="ghost" onClick={() => void supabase.auth.signOut().then(() => window.location.assign('/auth'))}>Sair</Button></div>;
}