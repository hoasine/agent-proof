export const AI_INTERPRET_COPY =
  "GenLayer AI interprets the public result against the pinned task criteria. Validators independently re-check the same evidence. AI never chooses the payout wallet.";

export const AI_SEMANTIC_QUESTION =
  "Does the public agent-delivered result satisfy every mandatory criterion in the pinned task specification?";

export const DEMO_REGISTRY = "demo:agent-proof:local";

export type EvalCriterion = {
  id?: number;
  met?: boolean;
  evidence?: string;
};

export type EvalSnapshot = {
  status?: string;
  criteria?: EvalCriterion[];
  failed_criteria?: number[];
  short_reason?: string;
  final_host?: string;
};

export function parseEvalSnapshot(raw: string | undefined | null): EvalSnapshot | null {
  if (!raw || !raw.trim()) return null;
  try {
    const data = JSON.parse(raw) as EvalSnapshot;
    if (typeof data !== "object" || data == null) return null;
    return data;
  } catch {
    return null;
  }
}

export function parseCriteria(raw: string | undefined | null): string[] {
  if (!raw) return [];
  try {
    const data = JSON.parse(raw) as unknown;
    if (!Array.isArray(data)) return [];
    return data.map((item) => String(item)).filter(Boolean);
  } catch {
    return [];
  }
}
