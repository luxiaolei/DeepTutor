/**
 * Learner chrome that has to survive a route change.
 *
 * Sending the first message navigates to `/chat/<id>`, which mounts a new
 * page. Auth status starts empty on that mount, so the first paint would
 * otherwise be the adult composer. The last learner profile is remembered
 * for that gap. The tab title is the same problem: Next.js writes
 * `<title>DeepTutor</title>` again on navigation, and that element wins over
 * a one-shot `document.title` assignment.
 */

export const LEARNER_TAB_TITLE = "造物";
export const ADULT_TAB_TITLE = "DeepTutor";

export interface RememberedLearnerChrome {
  learningPolicy: {
    allowedSurfaces: string[];
    allowedCapabilities: string[];
    ageBand: string;
    lockedPersona: string;
  };
  learnerAge: number | null;
  sessionStart: { required: boolean; confirmed: boolean } | null;
}

export function tabTitleForAccount(hasLearningPolicy: boolean): string {
  return hasLearningPolicy ? LEARNER_TAB_TITLE : ADULT_TAB_TITLE;
}

export function parseRememberedLearner(raw: string | null): RememberedLearnerChrome | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as RememberedLearnerChrome;
    const policy = parsed?.learningPolicy;
    if (!policy || !Array.isArray(policy.allowedSurfaces)) return null;
    return {
      learningPolicy: {
        allowedSurfaces: policy.allowedSurfaces.filter((item) => typeof item === "string"),
        allowedCapabilities: Array.isArray(policy.allowedCapabilities)
          ? policy.allowedCapabilities.filter((item) => typeof item === "string")
          : [],
        ageBand: typeof policy.ageBand === "string" ? policy.ageBand : "",
        lockedPersona: typeof policy.lockedPersona === "string" ? policy.lockedPersona : "",
      },
      learnerAge: typeof parsed.learnerAge === "number" ? parsed.learnerAge : null,
      sessionStart: parsed.sessionStart
        ? {
            required: Boolean(parsed.sessionStart.required),
            confirmed: Boolean(parsed.sessionStart.confirmed),
          }
        : null,
    };
  } catch {
    return null;
  }
}

export function serializeRememberedLearner(value: RememberedLearnerChrome): string {
  return JSON.stringify(value);
}

/** Write the title element itself. `document.title` alone is overwritten by it. */
export function writeDocumentTitle(title: string, doc: Document): void {
  if (doc.title !== title) doc.title = title;
  const head = doc.head;
  if (!head) return;
  let element = head.querySelector("title");
  if (!element) {
    element = doc.createElement("title");
    head.appendChild(element);
  }
  if (element.textContent !== title) element.textContent = title;
}
