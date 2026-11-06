import { apiFetch, apiUrl } from "@/lib/api";
import { invalidateAuthStatusCache } from "@/lib/auth";

/** Parent tap on this device, or a guardian confirming the learner's sitting. */
export async function confirmLearnerSessionStart(learnerId?: string): Promise<void> {
  const path = learnerId
    ? `/api/multi-user/learners/${encodeURIComponent(learnerId)}/session-start`
    : "/api/multi-user/session-start";
  const response = await apiFetch(apiUrl(path), { method: "POST" });
  if (!response.ok) {
    throw new Error("Session start was not confirmed.");
  }
  invalidateAuthStatusCache();
}
