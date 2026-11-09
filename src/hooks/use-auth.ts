import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "administrador" | "tecnico" | "administrativo";

export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  return { session, user: session?.user ?? null, loading };
}

export function useProfile() {
  const { user } = useSession();
  return useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      if (!user) throw new Error("Entre novamente");
      const [{ data: profile, error: profileError }, { data: roles, error: roleError }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", user.id),
      ]);
      if (profileError || roleError) throw profileError ?? roleError;
      const roleList = (roles ?? []).map((r) => r.role as AppRole);
      return {
        profile,
        roles: roleList,
        role: (roleList[0] ?? "administrativo") as AppRole,
        isAdmin: roleList.includes("administrador"),
        isTech: roleList.includes("tecnico"),
      };
    },
  });
}
