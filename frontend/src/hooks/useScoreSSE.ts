import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { HealthScore } from "@/types";

const SSE_BASE = `${import.meta.env.VITE_API_BASE_URL || "http://localhost:8000"}/integrations/events`;

export function useScoreSSE(profileId: string | undefined, enabled: boolean) {
  const queryClient = useQueryClient();
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!profileId || !enabled) return;

    const url = `${SSE_BASE}?profile_id=${profileId}`;
    const es = new EventSource(url);
    esRef.current = es;

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "score_update" && data.score) {
          const score = data.score as HealthScore;
          queryClient.setQueryData(["score", profileId], score);
        }
      } catch {
        // ignore parse errors on heartbeats
      }
    };

    es.onerror = () => {
      es.close();
    };

    return () => {
      es.close();
      esRef.current = null;
    };
  }, [profileId, enabled, queryClient]);
}
