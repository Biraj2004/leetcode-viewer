export type LeetCodeMode = "run" | "submit" | "submission_details";

export interface LeetCodeExtensionPayload {
  mode: LeetCodeMode;
  titleSlug: string;
  questionId: string;
  lang: string;
  typedCode: string;
  dataInput?: string;
  submissionId?: number;
}

interface ExtensionResponseEnvelope {
  success?: boolean;
  status?: number;
  error?: string;
  message?: string;
  details?: string;
  payload?: unknown;
}

function makeRequestId() {
  return `lv_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function pingExtensionOnce(timeoutMs: number): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(false);

  return new Promise((resolve) => {
    let settled = false;
    const timer = window.setTimeout(() => {
      if (settled) return;
      settled = true;
      window.removeEventListener("message", handleMessage);
      resolve(false);
    }, timeoutMs);

    const handleMessage = (event: MessageEvent) => {
      if (event.source !== window) return;
      const data = event.data as { type?: string } | undefined;
      if (data?.type !== "LV_EXT_PONG") return;
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      window.removeEventListener("message", handleMessage);
      resolve(true);
    };

    window.addEventListener("message", handleMessage);
    window.postMessage({ type: "LV_EXT_PING" }, "*");
  });
}

export async function detectExtension(
  attempts = 1,
  intervalMs = 250,
  timeoutPerAttemptMs = 700,
): Promise<boolean> {
  if (typeof window === "undefined") return false;

  for (let i = 0; i < attempts; i++) {
    const found = await pingExtensionOnce(timeoutPerAttemptMs);
    if (found) return true;
    if (i < attempts - 1) {
      await new Promise((resolve) => window.setTimeout(resolve, intervalMs));
    }
  }
  return false;
}

export async function requestLeetCodeViaExtension(
  payload: LeetCodeExtensionPayload,
  timeoutMs = 90000,
): Promise<unknown> {
  if (typeof window === "undefined") {
    throw new Error("Extension bridge is only available in the browser.");
  }

  const requestId = makeRequestId();

  return new Promise((resolve, reject) => {
    let settled = false;
    const timer = window.setTimeout(() => {
      if (settled) return;
      settled = true;
      window.removeEventListener("message", handleMessage);
      reject(new Error("Extension request timed out."));
    }, timeoutMs);

    const handleMessage = (event: MessageEvent) => {
      if (event.source !== window) return;
      const data = event.data as {
        type?: string;
        requestId?: string;
        error?: string;
        data?: ExtensionResponseEnvelope;
      } | undefined;

      if (data?.type !== "LV_EXT_RESP_LC_API") return;
      if (data.requestId !== requestId) return;
      if (settled) return;

      settled = true;
      window.clearTimeout(timer);
      window.removeEventListener("message", handleMessage);

      if (data.error) {
        reject(new Error(data.error));
        return;
      }

      const envelope = data.data;
      if (!envelope) {
        reject(new Error("Invalid extension response."));
        return;
      }

      if (envelope.success) {
        resolve(envelope.payload);
        return;
      }

      const err = new Error(envelope.message ?? "Extension request failed.");
      (err as Error & { code?: string; details?: string }).code = envelope.error ?? "EXTENSION_REQUEST_FAILED";
      (err as Error & { code?: string; details?: string }).details = envelope.details;
      reject(err);
    };

    window.addEventListener("message", handleMessage);
    window.postMessage(
      {
        type: "LV_EXT_REQ_LC_API",
        requestId,
        payload,
      },
      "*",
    );
  });
}
