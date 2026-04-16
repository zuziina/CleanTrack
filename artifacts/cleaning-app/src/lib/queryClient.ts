import { QueryClient } from "@tanstack/react-query";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import { persistQueryClient } from "@tanstack/react-query-persist-client";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      retry: 1,
      /* Keep cache alive for 24 hours so offline visits can serve last data */
      gcTime: 24 * 60 * 60 * 1000,
    },
  },
});

/* ── Persist cache to localStorage for offline use ─────────────────────
   Data is compressed into a single "cleantrack-cache" key.
   Max age = 24 hours — after that the persisted cache is discarded and
   fresh data is fetched once the user is back online.
─────────────────────────────────────────────────────────────────────── */
const MAX_AGE = 24 * 60 * 60 * 1000;

try {
  const persister = createSyncStoragePersister({
    storage: window.localStorage,
    key: "cleantrack-cache",
  });

  persistQueryClient({
    queryClient,
    persister,
    maxAge: MAX_AGE,
  });
} catch {
  /* localStorage may be unavailable in some contexts (private browsing) — silent fail */
}
