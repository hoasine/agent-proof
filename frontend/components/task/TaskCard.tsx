"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { type TaskView } from "@/lib/contracts/AgentProof";
import { parseCriteria } from "@/lib/contracts/ai-copy";
import { formatCountdown, formatGen, parseGenToWei, shortAddr } from "@/lib/utils/format";
import { error, success } from "@/lib/utils/toast";
import { isMine, useTaskWrites } from "@/lib/hooks/useAgentProof";
import { useWallet } from "@/lib/genlayer/WalletProvider";
import { StakeConfirmDialog } from "./StakeConfirmDialog";
import { AiEvalPanel } from "./AiEvalPanel";

export function TaskCard({ task }: { task: TaskView }) {
  const { address } = useWallet();
  const writes = useTaskWrites();
  const roles = isMine(task, address);
  const criteria = parseCriteria(task.criteria_json);
  const [resultUrl, setResultUrl] = useState(task.result_url || "");
  const [fundOpen, setFundOpen] = useState(false);
  const [fundAmount] = useState("0.01");

  async function run(label: string, fn: () => Promise<unknown>) {
    try {
      await fn();
      success(label);
    } catch (err) {
      error(err instanceof Error ? err.message : label);
    }
  }

  return (
    <article className="glass-card space-y-4 p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-xl font-bold">{task.title}</h3>
          <p className="text-sm text-muted-foreground">Task #{task.id}</p>
        </div>
        <Badge>{task.status}</Badge>
      </div>
      <p className="text-sm leading-relaxed text-muted-foreground">{task.description}</p>
      <dl className="grid gap-2 text-sm md:grid-cols-2">
        <div>
          <dt className="text-muted-foreground">Customer</dt>
          <dd>{shortAddr(task.customer)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Bound agent wallet</dt>
          <dd>{shortAddr(task.agent_wallet)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Registry / agent ID</dt>
          <dd>
            {task.agent_registry} / {task.agent_id}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Verified endpoint</dt>
          <dd>{task.endpoint_domain || "—"}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Agent URI</dt>
          <dd className="break-all">{task.agent_uri || "—"}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Identity fingerprint</dt>
          <dd className="break-all">{task.identity_fingerprint || "—"}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Deadline</dt>
          <dd>{formatCountdown(Number(task.deadline))}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Locked GEN</dt>
          <dd>{formatGen(task.amount)}</dd>
        </div>
      </dl>
      {task.identity_mode === "DEMO_FIXTURE" ? (
        <p className="rounded-lg border border-amber/40 bg-amber/10 px-3 py-2 text-xs">
          DEMO / TEST IDENTITY MODE — fixtures are not production ERC-8004 identities.
        </p>
      ) : null}
      {task.result_url ? (
        <p className="text-sm">
          Result: <span className="break-all">{task.result_url}</span>
        </p>
      ) : null}
      <AiEvalPanel lastEvalJson={task.last_eval_json} criteria={criteria} />
      <div className="flex flex-wrap gap-2">
        {roles.agent && task.status === "DRAFT" ? (
          <Button size="sm" onClick={() => run("Accepted", () => writes.accept.mutateAsync([task.id]))}>
            Accept
          </Button>
        ) : null}
        {roles.customer && task.status === "AGENT_ACCEPTED" ? (
          <Button size="sm" onClick={() => setFundOpen(true)}>
            Fund
          </Button>
        ) : null}
        {roles.agent && (task.status === "FUNDED" || task.status === "RESULT_SUBMITTED") ? (
          <div className="flex w-full flex-col gap-2 md:flex-row">
            <Input
              value={resultUrl}
              onChange={(e) => setResultUrl(e.target.value)}
              placeholder="https://example.com/results/…"
            />
            <Button
              size="sm"
              onClick={() => run("Result submitted", () => writes.submit.mutateAsync([task.id, resultUrl.trim()]))}
            >
              Submit result
            </Button>
          </div>
        ) : null}
        {task.status === "RESULT_SUBMITTED" ? (
          <Button size="sm" onClick={() => run("Evaluation sent", () => writes.evaluate.mutateAsync([task.id]))}>
            Evaluate
          </Button>
        ) : null}
        {task.status === "FUNDED" || task.status === "RESULT_SUBMITTED" ? (
          <Button
            size="sm"
            variant="outline"
            onClick={() => run("Expire/refund sent", () => writes.expire.mutateAsync([task.id]))}
          >
            Expire / refund
          </Button>
        ) : null}
        {roles.customer && (task.status === "DRAFT" || task.status === "AGENT_ACCEPTED") ? (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => run("Cancelled", () => writes.cancel.mutateAsync([task.id]))}
          >
            Cancel
          </Button>
        ) : null}
      </div>
      <StakeConfirmDialog
        open={fundOpen}
        onOpenChange={setFundOpen}
        title="Lock GEN"
        description="GEN is locked only after the agent accepted the pinned spec. The payout wallet cannot change."
        stakeLabel={`${fundAmount} GEN`}
        warnings={["Minimum 0.01 GEN", "Unused GEN refunds to you after the deadline"]}
        pending={writes.fund.isPending}
        onConfirm={async () => {
          try {
            const wei = parseGenToWei(fundAmount);
            await writes.fund.mutateAsync([task.id, wei]);
            success("GEN locked");
            setFundOpen(false);
          } catch (err) {
            error(err instanceof Error ? err.message : "Fund failed");
          }
        }}
      />
    </article>
  );
}
