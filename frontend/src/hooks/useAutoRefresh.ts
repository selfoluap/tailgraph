import { useEffect } from "react";

export function useAutoRefresh(enabled: boolean, refresh: () => Promise<void>, intervalMs = 10000) {
  useEffect(() => {
    if (!enabled) {
      return undefined;
    }

    refresh().catch((error: unknown) => {
      console.error(error);
    });

    const timer = window.setInterval(() => {
      refresh().catch((error: unknown) => {
        console.error(error);
      });
    }, intervalMs);

    return () => window.clearInterval(timer);
  }, [enabled, intervalMs, refresh]);
}
