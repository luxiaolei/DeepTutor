"use client";

import { useEffect, useLayoutEffect, useState } from "react";
import { fetchAuthStatus } from "@/lib/auth";
import {
  parseRememberedLearner,
  serializeRememberedLearner,
  type RememberedLearnerChrome,
} from "@/lib/learner-chrome";

export interface LearningPolicyState {
  /** Surfaces this account may open. Everything else is hidden, not a 403. */
  allowedSurfaces: string[];
  allowedCapabilities: string[];
  ageBand: string;
  lockedPersona: string;
}

export interface AuthStatusState {
  /** Whether auth is enabled on the backend. */
  enabled: boolean;
  /** Whether the current session is authenticated. */
  authenticated: boolean;
  /** Whether the authenticated user is an admin. */
  isAdmin: boolean;
  /** Stable account id for account-scoped browser state. */
  userId: string | null;
  /** False when the runtime status endpoint could not be reached. */
  statusAvailable: boolean;
  /** True until the first status fetch resolves. */
  loading: boolean;
  /**
   * Effective learning policy from ``GET /api/auth/status``. Null for accounts
   * without one. The shell reads ``allowedSurfaces`` so denied features are
   * absent instead of offered and then rejected (#1222).
   */
  learningPolicy: LearningPolicyState | null;
  /** Null when this account is not a learner sitting. */
  sessionStart: { required: boolean; confirmed: boolean } | null;
  learnerAge: number | null;
}

const LEARNER_CHROME_KEY = "deeptutor.learnerChrome.v1";

const INITIAL: AuthStatusState = {
  enabled: false,
  authenticated: false,
  isAdmin: false,
  userId: null,
  statusAvailable: false,
  loading: true,
  learningPolicy: null,
  sessionStart: null,
  learnerAge: null,
};

function learningPolicyFromStatus(
  status: Awaited<ReturnType<typeof fetchAuthStatus>>,
): LearningPolicyState | null {
  const policy = status?.learning_policy;
  if (!policy) return null;
  const surfaces = (policy.allowed_surfaces ?? ["chat", "reading"]).filter(
    (surface) => surface.trim().length > 0,
  );
  return {
    allowedSurfaces: surfaces.length ? surfaces : ["chat", "reading"],
    allowedCapabilities: (policy.allowed_capabilities ?? []).filter(
      (name) => name.trim().length > 0,
    ),
    ageBand: policy.age_band ?? "",
    lockedPersona: policy.locked_persona ?? "",
  };
}

/**
 * Resolve auth state at runtime from the backend (`/api/auth/status`).
 *
 * The frontend bundle is URL- and auth-agnostic (see web/lib/api.ts): the auth
 * toggle is a runtime setting read from `data/user/settings/auth.json`, never
 * baked into the build. Components that need to know whether auth is on — to
 * show the Sign-out / Admin affordances — use this hook instead of a build-time
 * constant, so it works identically on Docker (read-only rootfs), the PyPI
 * `deeptutor start` launcher, and source dev.
 */
function rememberedLearnerState(): AuthStatusState | null {
  if (typeof sessionStorage === "undefined") return null;
  try {
    const remembered = parseRememberedLearner(sessionStorage.getItem(LEARNER_CHROME_KEY));
    if (!remembered) return null;
    return {
      ...INITIAL,
      loading: false,
      statusAvailable: true,
      authenticated: true,
      learningPolicy: remembered.learningPolicy,
      sessionStart: remembered.sessionStart,
      learnerAge: remembered.learnerAge,
    };
  } catch {
    return null;
  }
}

function storeRememberedLearner(state: AuthStatusState) {
  if (typeof sessionStorage === "undefined") return;
  try {
    if (!state.learningPolicy) {
      sessionStorage.removeItem(LEARNER_CHROME_KEY);
      return;
    }
    const payload: RememberedLearnerChrome = {
      learningPolicy: state.learningPolicy,
      learnerAge: state.learnerAge,
      sessionStart: state.sessionStart,
    };
    sessionStorage.setItem(LEARNER_CHROME_KEY, serializeRememberedLearner(payload));
  } catch {
    /* Private mode can reject storage. The in-memory copy still covers a remount. */
  }
}

/** Last resolved status. A new `/chat/<id>` page mounts before its own fetch returns. */
let resolvedAuth: AuthStatusState | null = null;

export function initialAuthState(): AuthStatusState {
  // Session storage is applied after mount. Reading it here would make the
  // hydrated tree disagree with the server render.
  return resolvedAuth ?? INITIAL;
}

function loadAuthStatus(): Promise<AuthStatusState> {
  return fetchAuthStatus().then((status) => ({
    enabled: Boolean(status?.enabled),
    authenticated: Boolean(status?.authenticated),
    isAdmin: status?.role === "admin",
    userId:
      typeof status?.user_id === "string" && status.user_id.trim()
        ? status.user_id
        : null,
    statusAvailable: status !== null,
    loading: false,
    learningPolicy: learningPolicyFromStatus(status),
    sessionStart: status?.session_start
      ? {
          required: Boolean(status.session_start.required),
          confirmed: Boolean(status.session_start.confirmed),
        }
      : null,
    learnerAge:
      typeof status?.learner_age === "number" ? status.learner_age : null,
  }));
}

export function useAuthStatus(): AuthStatusState {
  const [state, setState] = useState<AuthStatusState>(initialAuthState);

  useLayoutEffect(() => {
    if (resolvedAuth) return;
    const remembered = rememberedLearnerState();
    if (remembered) setState(remembered);
  }, []);

  useEffect(() => {
    let alive = true;
    loadAuthStatus().then((next) => {
      resolvedAuth = next;
      storeRememberedLearner(next);
      if (alive) setState(next);
    });
    return () => {
      alive = false;
    };
  }, []);

  return state;
}
