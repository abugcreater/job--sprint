import { useCallback, useEffect, useState } from "react";
import {
  fetchCoachOutcomes,
  saveCoachOutcomeSnapshot,
  type CoachOutcomeReport
} from "../../api/coachOutcomesClient";
import { canUseServerRuntime } from "../../api/runtimeClient";
import type { ServerOutcomeStatus } from "./components/WeeklyReviewPanel";

export function useServerOutcome(date: string) {
  const [serverOutcome, setServerOutcome] = useState<CoachOutcomeReport | null>(null);
  const [serverOutcomeStatus, setServerOutcomeStatus] = useState<ServerOutcomeStatus>("idle");

  useEffect(() => {
    let active = true;
    if (!canUseServerRuntime()) {
      setServerOutcome(null);
      setServerOutcomeStatus("local");
      return () => {
        active = false;
      };
    }
    setServerOutcomeStatus("loading");
    fetchCoachOutcomes(date)
      .then((response) => {
        if (!active) return;
        setServerOutcome(response?.outcome ?? null);
        setServerOutcomeStatus(response?.outcome ? "ready" : "local");
      })
      .catch(() => {
        if (!active) return;
        setServerOutcomeStatus("error");
      });
    return () => {
      active = false;
    };
  }, [date]);

  const saveServerOutcome = useCallback(async () => {
    setServerOutcomeStatus("saving");
    try {
      const response = await saveCoachOutcomeSnapshot(date);
      setServerOutcome((current) => response?.outcome ?? current);
      setServerOutcomeStatus(response?.outcome ? "saved" : "local");
    } catch (_) {
      setServerOutcomeStatus("error");
    }
  }, [date]);

  return {
    saveServerOutcome,
    serverOutcome,
    serverOutcomeStatus
  };
}
