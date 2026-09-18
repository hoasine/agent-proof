"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { DEMO_REGISTRY } from "@/lib/contracts/ai-copy";
import { parseGenToWei } from "@/lib/utils/format";
import { error, success } from "@/lib/utils/toast";
import { useTaskWrites } from "@/lib/hooks/useAgentProof";

const DEFAULT_CRITERIA = [
  "Discuss all three providers.",
  "Include at least one public source citation per provider.",
  "Compare international availability/coverage.",
  "Give a recommendation tied to the task.",
  "Do not present unsupported factual claims as certain.",
];

export function InitTaskForm() {
  const writes = useTaskWrites();
  const [registry, setRegistry] = useState(DEMO_REGISTRY);
  const [agentId, setAgentId] = useState("1");
  const [title, setTitle] = useState("Compare three payment providers");
  const [description, setDescription] = useState(
    "Compare Stripe, Adyen and Checkout.com for an international SaaS company."
  );
  const [criteria, setCriteria] = useState<string[]>(DEFAULT_CRITERIA);
  const [deadlineLocal, setDeadlineLocal] = useState("");
  const [amount, setAmount] = useState("0.01");

  const previewWei = useMemo(() => {
    try {
      return parseGenToWei(amount);
    } catch {
      return null;
    }
  }, [amount]);

  function setCriterion(index: number, value: string) {
    setCriteria((prev) => prev.map((c, i) => (i === index ? value : c)));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const cleaned = criteria.map((c) => c.trim()).filter(Boolean);
    if (cleaned.length < 1 || cleaned.length > 6) {
      error("Provide 1–6 mandatory criteria.");
      return;
    }
    const deadline = deadlineLocal ? Math.floor(new Date(deadlineLocal).getTime() / 1000) : 0;
    if (!deadline || deadline * 1000 <= Date.now()) {
      error("Pick a future deadline.");
      return;
    }
    try {
      await writes.init.mutateAsync([
        registry.trim(),
        agentId.trim(),
        title.trim(),
        description.trim(),
        JSON.stringify(cleaned),
        deadline,
      ]);
      success("Task created. No GEN is locked yet.");
    } catch (err) {
      error(err instanceof Error ? err.message : "Create task failed");
    }
  }

  return (
    <form onSubmit={onSubmit} className="glass-card space-y-4 p-6 md:p-8">
      <div>
        <h2 className="font-display text-2xl font-bold">Create task</h2>
        <p className="mt-1 text-sm text-muted-foreground">No GEN is locked yet.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="registry">Agent registry</Label>
          <Input id="registry" value={registry} onChange={(e) => setRegistry(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="agentId">Agent ID</Label>
          <Input id="agentId" value={agentId} onChange={(e) => setAgentId(e.target.value)} />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="title">Title</Label>
        <Input id="title" maxLength={120} value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          maxLength={2000}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>
      <div className="space-y-3">
        <Label>Mandatory criteria (1–6)</Label>
        {criteria.map((c, i) => (
          <Input
            key={i}
            maxLength={300}
            value={c}
            onChange={(e) => setCriterion(i, e.target.value)}
            placeholder={`Criterion ${i + 1}`}
          />
        ))}
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={criteria.length >= 6}
            onClick={() => setCriteria((p) => [...p, ""])}
          >
            Add criterion
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={criteria.length <= 1}
            onClick={() => setCriteria((p) => p.slice(0, -1))}
          >
            Remove last
          </Button>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="deadline">Deadline</Label>
          <Input
            id="deadline"
            type="datetime-local"
            value={deadlineLocal}
            onChange={(e) => setDeadlineLocal(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="amount">Amount preview (GEN)</Label>
          <Input id="amount" value={amount} onChange={(e) => setAmount(e.target.value)} />
          <p className="text-xs text-muted-foreground">
            Preview only. Funding happens after the agent accepts. Minimum 0.01 GEN.
            {previewWei ? ` → ${previewWei.toString()} wei` : ""}
          </p>
        </div>
      </div>
      <Button type="submit" disabled={writes.init.isPending}>
        {writes.init.isPending ? "Pinning…" : "Pin spec and bind agent"}
      </Button>
    </form>
  );
}
