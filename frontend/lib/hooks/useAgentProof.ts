"use client";

import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useWallet } from "@/lib/genlayer/WalletProvider";
import { getContractAddress, getStudioUrl, ensureGenLayerNetwork } from "@/lib/genlayer/client";
import { AgentProofClient, type TaskView, type TransactionProgress } from "@/lib/contracts/AgentProof";

export type TaskFilter = "all" | "mine" | "draft" | "funded" | "settled";

export function useTaskClient() {
  const { address } = useWallet();
  const contract = getContractAddress();
  return useMemo(() => {
    if (!contract) return null;
    return new AgentProofClient(contract, address, getStudioUrl());
  }, [contract, address]);
}

function useInvalidate() {
  const qc = useQueryClient();
  return () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: ["agent-proof-tasks"] }),
      qc.invalidateQueries({ queryKey: ["agent-proof-config"] }),
    ]);
}

export function useTaskConfig() {
  const client = useTaskClient();
  return useQuery({
    queryKey: ["agent-proof-config", getContractAddress()],
    queryFn: () => client!.getConfig(),
    enabled: !!client,
    staleTime: 60_000,
    retry: 0,
  });
}

export function useTasks(filter: TaskFilter = "all") {
  const client = useTaskClient();
  const { address } = useWallet();
  return useQuery({
    queryKey: ["agent-proof-tasks", getContractAddress(), filter, address],
    queryFn: async () => {
      const list = await client!.getTasksPage(0, 50);
      const sorted = [...list].sort((a, b) => Number(b.id) - Number(a.id));
      const me = address?.toLowerCase();
      if (filter === "mine") {
        if (!me) return [];
        return sorted.filter(
          (t) => t.customer.toLowerCase() === me || t.agent_wallet.toLowerCase() === me
        );
      }
      if (filter === "draft") {
        return sorted.filter((t) => t.status === "DRAFT" || t.status === "AGENT_ACCEPTED");
      }
      if (filter === "funded") {
        return sorted.filter((t) => t.status === "FUNDED" || t.status === "RESULT_SUBMITTED");
      }
      if (filter === "settled") {
        return sorted.filter(
          (t) => t.status === "RELEASED" || t.status === "REFUNDED" || t.status === "CANCELLED"
        );
      }
      return sorted;
    },
    enabled: !!client,
    refetchInterval: 60_000,
    retry: 0,
  });
}

export function useTaskWrites() {
  const client = useTaskClient();
  const invalidate = useInvalidate();

  const init = useMutation({
    mutationFn: async (vars: [string, string, string, string, string, number, ((p: TransactionProgress) => void)?]) => {
      if (!client) throw new Error("Contract not configured");
      await ensureGenLayerNetwork();
      const [registry, agentId, title, description, criteriaJson, deadline, onProgress] = vars;
      return client.initTask(registry, agentId, title, description, criteriaJson, deadline, onProgress);
    },
    onSuccess: invalidate,
  });
  const accept = useMutation({
    mutationFn: async (vars: [number, ((p: TransactionProgress) => void)?]) => {
      if (!client) throw new Error("Contract not configured");
      await ensureGenLayerNetwork();
      return client.acceptTask(vars[0], vars[1]);
    },
    onSuccess: invalidate,
  });
  const fund = useMutation({
    mutationFn: async (vars: [number, bigint, ((p: TransactionProgress) => void)?]) => {
      if (!client) throw new Error("Contract not configured");
      await ensureGenLayerNetwork();
      return client.fundTask(vars[0], vars[1], vars[2]);
    },
    onSuccess: invalidate,
  });
  const submit = useMutation({
    mutationFn: async (vars: [number, string, ((p: TransactionProgress) => void)?]) => {
      if (!client) throw new Error("Contract not configured");
      await ensureGenLayerNetwork();
      return client.submitResult(vars[0], vars[1], vars[2]);
    },
    onSuccess: invalidate,
  });
  const evaluate = useMutation({
    mutationFn: async (vars: [number, ((p: TransactionProgress) => void)?]) => {
      if (!client) throw new Error("Contract not configured");
      await ensureGenLayerNetwork();
      return client.evaluateTask(vars[0], vars[1]);
    },
    onSuccess: invalidate,
  });
  const expire = useMutation({
    mutationFn: async (vars: [number, ((p: TransactionProgress) => void)?]) => {
      if (!client) throw new Error("Contract not configured");
      await ensureGenLayerNetwork();
      return client.expireTask(vars[0], vars[1]);
    },
    onSuccess: invalidate,
  });
  const cancel = useMutation({
    mutationFn: async (vars: [number, ((p: TransactionProgress) => void)?]) => {
      if (!client) throw new Error("Contract not configured");
      await ensureGenLayerNetwork();
      return client.cancelTask(vars[0], vars[1]);
    },
    onSuccess: invalidate,
  });

  return { init, accept, fund, submit, evaluate, expire, cancel };
}

export function isMine(task: TaskView, address?: string | null) {
  if (!address) return { customer: false, agent: false };
  const me = address.toLowerCase();
  return {
    customer: task.customer.toLowerCase() === me,
    agent: task.agent_wallet.toLowerCase() === me,
  };
}
