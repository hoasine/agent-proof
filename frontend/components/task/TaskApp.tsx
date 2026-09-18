"use client";

import { useState } from "react";
import { ContractSetupBanner } from "@/components/ContractSetupBanner";
import { Button } from "@/components/ui/button";
import { useTaskConfig, useTasks, type TaskFilter } from "@/lib/hooks/useAgentProof";
import { HowItWorks } from "./HowItWorks";
import { InitTaskForm } from "./InitTaskForm";
import { TaskCard } from "./TaskCard";

const FILTERS: { id: TaskFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "mine", label: "Mine" },
  { id: "draft", label: "Unfunded" },
  { id: "funded", label: "Active" },
  { id: "settled", label: "Settled" },
];

export function TaskApp() {
  const [filter, setFilter] = useState<TaskFilter>("all");
  const tasks = useTasks(filter);
  const config = useTaskConfig();
  const demo = config.data?.identity_mode === "DEMO_FIXTURE";

  return (
    <div className="space-y-8">
      <ContractSetupBanner />
      {demo ? (
        <p className="rounded-lg border border-amber/40 bg-amber/10 px-4 py-3 text-sm">
          DEMO / TEST IDENTITY MODE. Production ERC-8004 is NOT YET WIRED on GenLayer Studionet.
          Fixtures use {config.data?.demo_registry}.
        </p>
      ) : null}
      <HowItWorks />
      <InitTaskForm />
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Button
            key={f.id}
            size="sm"
            variant={filter === f.id ? "default" : "outline"}
            onClick={() => setFilter(f.id)}
          >
            {f.label}
          </Button>
        ))}
      </div>
      {tasks.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading tasks…</p>
      ) : tasks.data?.length ? (
        <div className="space-y-6">
          {tasks.data.map((task) => (
            <TaskCard key={task.id} task={task} />
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No tasks in this filter.</p>
      )}
    </div>
  );
}
