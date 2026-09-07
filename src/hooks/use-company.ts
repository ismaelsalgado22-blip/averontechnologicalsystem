import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toDataUrl } from "@/lib/storage";
import type { Company } from "@/lib/pdf";

export const FALLBACK_COMPANY: Company = {
  name: "Minha empresa",
  tagline: "Prestação de serviços",
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

/** Logomarca da empresa do usuário, pronta para ir no topo dos documentos. */
export async function companyLogo(company?: Company | null) {
  if (!company?.logo_url) return undefined;
  const dataUrl = await toDataUrl(company.logo_url);
  return dataUrl || undefined;
}
