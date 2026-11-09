import { QueryClient, MutationCache, QueryCache } from "@tanstack/react-query";
import { toast } from "sonner";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const queryClient: QueryClient = new QueryClient({
    queryCache: new QueryCache({ onError: () => { if (typeof window !== 'undefined') toast.error('Não foi possível atualizar os dados. Verifique sua conexão.'); } }),
    mutationCache: new MutationCache({ onSuccess: (_data, _vars, _context, mutation) => { if (mutation.options.mutationKey?.[0] !== 'save_notification_preferences') void queryClient.invalidateQueries(); } }),
    defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: true } },
  });

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
  });

  return router;
};
