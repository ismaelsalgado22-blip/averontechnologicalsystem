import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Company } from "@/lib/pdf";

export const FALLBACK_COMPANY: Company = {
  name: "Averon",
  tagline: "Refrigeração Comercial e Industrial",
};

export function useCompany() {
  return useQuery({
    queryKey: ["company_settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("company_settings").select("*").limit(1).maybeSingle();
      if (error) throw error;
      return (data as unknown as Company) ?? FALLBACK_COMPANY;
    },
  });
}
