import { useEffect, useState } from "react";

import type { HealthReportState } from "../domain/models/healthReport";
import { emptyHealthReportState } from "../domain/models/healthReport";
import {
  MessageType,
  isExtensionMessage,
  isGetHealthReportResponse,
} from "../shared/messages";

export function useHealthReport(): HealthReportState {
  const [healthState, setHealthState] = useState<HealthReportState>(
    emptyHealthReportState,
  );

  useEffect(() => {
    let isMounted = true;

    const loadHealthReport = async (): Promise<void> => {
      const response: unknown = await chrome.runtime.sendMessage({
        type: MessageType.GET_HEALTH_REPORT,
      });

      if (!isMounted) {
        return;
      }

      setHealthState(
        isGetHealthReportResponse(response)
          ? response.healthState
          : emptyHealthReportState,
      );
    };

    void loadHealthReport();

    const onMessage = (message: unknown): void => {
      if (!isExtensionMessage(message)) {
        return;
      }

      if (message.type === MessageType.HEALTH_REPORT_UPDATED) {
        setHealthState(message.payload.healthState);
      }
    };

    chrome.runtime.onMessage.addListener(onMessage);

    return () => {
      isMounted = false;
      chrome.runtime.onMessage.removeListener(onMessage);
    };
  }, []);

  return healthState;
}
