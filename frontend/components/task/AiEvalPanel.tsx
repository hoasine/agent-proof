"use client";

import { AI_INTERPRET_COPY, AI_SEMANTIC_QUESTION, parseEvalSnapshot } from "@/lib/contracts/ai-copy";

export function AiEvalPanel({ lastEvalJson, criteria }: { lastEvalJson?: string; criteria: string[] }) {
  const snap = parseEvalSnapshot(lastEvalJson);

  return (
    <section className="glass-card space-y-4 p-6 md:p-8">
      <h2 className="font-display text-2xl font-bold">What GenLayer AI evaluates</h2>
      <p className="text-sm leading-relaxed">{AI_INTERPRET_COPY}</p>
      <div className="space-y-2">
        <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          Semantic question
        </p>
        <p className="text-sm leading-relaxed">{AI_SEMANTIC_QUESTION}</p>
      </div>
      <div className="space-y-2">
        <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          Pinned mandatory criteria
        </p>
        <ol className="list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
          {criteria.map((c, i) => (
            <li key={`${i}-${c}`}>{c}</li>
          ))}
        </ol>
      </div>
      {snap ? (
        <div className="space-y-2 rounded-lg border border-white/10 bg-black/20 p-4 text-sm">
          <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            Last structured result
          </p>
          <p>Status: {snap.status || "—"}</p>
          {(snap.criteria || []).map((row) => (
            <p key={row.id}>
              Criterion {row.id}: {row.met ? "met" : "not met"}
              {row.evidence ? ` — ${row.evidence}` : ""}
            </p>
          ))}
          {snap.failed_criteria?.length ? (
            <p className="text-muted-foreground">Failed criteria: {snap.failed_criteria.join(", ")}</p>
          ) : null}
          {snap.short_reason ? (
            <p className="text-muted-foreground">{snap.short_reason}</p>
          ) : null}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          No evaluation yet. Deterministic code checks identity, host, task ID, and agent ID. AI only
          interprets whether the public result meets every pinned criterion.
        </p>
      )}
    </section>
  );
}
