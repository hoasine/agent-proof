import { createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import { TransactionStatus } from "genlayer-js/types";

export type TaskStatus =
  | "DRAFT"
  | "AGENT_ACCEPTED"
  | "FUNDED"
  | "RESULT_SUBMITTED"
  | "RELEASED"
  | "REFUNDED"
  | "CANCELLED";

export type TaskView = {
  id: number;
  customer: string;
  agent_wallet: string;
  agent_registry: string;
  agent_id: string;
  agent_name: string;
  agent_uri: string;
  endpoint_domain: string;
  identity_fingerprint: string;
  title: string;
  description: string;
  criteria_json: string;
  criteria_fingerprint: string;
  deadline: number;
  amount: number | string;
  status: TaskStatus;
  created_at: number;
  accepted_at: number;
  funded_at: number;
  submitted_at: number;
  settled_at: number;
  result_url: string;
  result_fingerprint: string;
  last_eval_json: string;
  last_eval_summary: string;
  settle_reason: string;
  paid_out: boolean;
  identity_mode: string;
};

export type TaskConfig = {
  task_count: number;
  page_limit: number;
  min_fund_wei: number;
  identity_mode: string;
  demo_registry: string;
  erc8004_production: string;
  erc8004_reason: string;
};

export type TransactionProgress = {
  hash?: string;
  stage: "preparing" | "submitted" | "finalizing" | "finalized";
};

export type WriteResult = {
  hash: string;
  receipt: unknown;
};

const AI_TX_WAIT = {
  retries: 45,
  interval: 2500,
  status: TransactionStatus.FINALIZED,
};
const FAST_TX_WAIT = {
  retries: 18,
  interval: 2000,
  status: TransactionStatus.ACCEPTED,
};

function isRpcNoiseError(err: unknown): boolean {
  const msg = String(err instanceof Error ? err.message : err ?? "").toLowerCase();
  return (
    msg.includes("gen_call") ||
    msg.includes("rate limit") ||
    msg.includes("failed to fetch") ||
    msg.includes("network")
  );
}

function withMutedGenLayerConsole<T>(fn: () => Promise<T>): Promise<T> {
  if (typeof console === "undefined" || typeof console.error !== "function") {
    return fn();
  }
  const original = console.error.bind(console);
  console.error = (...args: unknown[]) => {
    const text = args.map((a) => String(a)).join(" ");
    if (text.includes("Error fetching") && text.includes("from GenLayer RPC")) {
      return;
    }
    original(...args);
  };
  return fn().finally(() => {
    console.error = original;
  });
}

function normalizeReadValue(value: unknown): unknown {
  if (value instanceof Map) {
    const obj: Record<string, unknown> = {};
    for (const [key, entry] of value.entries()) {
      obj[String(key)] = normalizeReadValue(entry);
    }
    return obj;
  }
  if (typeof value === "bigint") {
    const n = Number(value);
    return Number.isSafeInteger(n) ? n : value.toString();
  }
  if (Array.isArray(value)) {
    return value.map(normalizeReadValue);
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, normalizeReadValue(entry)])
    );
  }
  return value;
}

function normalizeReadResult<T>(raw: unknown): T {
  return normalizeReadValue(raw) as T;
}

export class AgentProofClient {
  private contractAddress: `0x${string}`;
  private readClient: ReturnType<typeof createClient>;
  private account?: `0x${string}`;
  private endpoint?: string;

  constructor(contractAddress: string, account?: string | null, endpoint?: string) {
    this.contractAddress = contractAddress as `0x${string}`;
    this.account = account ? (account as `0x${string}`) : undefined;
    this.endpoint = endpoint;
    const config: Record<string, unknown> = { chain: studionet };
    if (endpoint) config.endpoint = endpoint;
    this.readClient = createClient(config as Parameters<typeof createClient>[0]);
  }

  private async assertContractDeployed() {
    const endpoint = this.endpoint || "https://studio.genlayer.com/api";
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: Date.now(),
          method: "gen_getContractSchema",
          params: [this.contractAddress],
        }),
      });
      const data = (await res.json()) as {
        result?: { methods?: Record<string, unknown> };
        error?: { message?: string };
      };
      if (data.error || !data.result?.methods) {
        throw new Error(
          `No AgentProof contract at ${this.contractAddress} on Studionet. Deploy contracts/agent_proof.py in GenLayer Studio, then set NEXT_PUBLIC_CONTRACT_ADDRESS.`
        );
      }
      if (!("init_task" in data.result.methods) || !("evaluate_task" in data.result.methods)) {
        throw new Error(
          `Contract at ${this.contractAddress} is missing AgentProof methods. Confirm you deployed AgentProof.`
        );
      }
    } catch (err) {
      if (
        err instanceof Error &&
        (err.message.startsWith("No AgentProof") || err.message.startsWith("Contract at"))
      ) {
        throw err;
      }
    }
  }

  private async getWriteClient() {
    if (typeof window === "undefined" || !window.ethereum) {
      throw new Error("A browser wallet is required to send transactions.");
    }
    const { ensureGenLayerNetwork, getAccounts, requestAccounts } = await import(
      "@/lib/genlayer/client"
    );
    await ensureGenLayerNetwork();
    await this.assertContractDeployed();
    let accounts = await getAccounts();
    if (accounts.length === 0) {
      accounts = await requestAccounts();
    }
    const account = (accounts[0] || this.account) as `0x${string}` | undefined;
    if (!account) {
      throw new Error("Connect your wallet to continue");
    }
    this.account = account;
    return createClient({
      chain: studionet,
      endpoint: this.endpoint,
      account,
      provider: window.ethereum as NonNullable<Parameters<typeof createClient>[0]>["provider"],
    });
  }

  private async studioRpc<T>(method: string, params: unknown[]): Promise<T> {
    const endpoint = this.endpoint || "https://studio.genlayer.com/api";
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: Date.now(), method, params }),
    });
    const data = (await res.json()) as { result?: T; error?: { message?: string } };
    if (data.error) throw new Error(data.error.message || "Studio RPC error");
    return data.result as T;
  }

  private statusReached(current: string, target: TransactionStatus | undefined): boolean {
    const cur = current.toUpperCase();
    const want = String(target ?? TransactionStatus.ACCEPTED).toUpperCase();
    if (cur.includes("CANCEL") || cur.includes("TIMEOUT")) return false;
    if (want.includes("FINAL")) return cur === "FINALIZED" || cur === "ACCEPTED";
    return cur === "ACCEPTED" || cur === "FINALIZED" || cur === "ACTIVATED";
  }

  private async waitForWrite(
    _client: ReturnType<typeof createClient>,
    hash: Awaited<ReturnType<ReturnType<typeof createClient>["writeContract"]>>,
    options = AI_TX_WAIT,
    onProgress?: (progress: TransactionProgress) => void
  ) {
    const txHash = String(hash);
    onProgress?.({ hash: txHash, stage: "finalizing" });
    let lastStatus = "";
    for (let i = 0; i < Math.max(1, options.retries); i++) {
      try {
        lastStatus = String(await this.studioRpc<string>("gen_getTransactionStatus", [txHash])).toUpperCase();
        if (lastStatus.includes("CANCEL") || lastStatus.includes("TIMEOUT")) {
          throw new Error(`Transaction ${lastStatus.toLowerCase().replace(/_/g, " ")}.`);
        }
        if (this.statusReached(lastStatus, options.status)) {
          onProgress?.({ hash: txHash, stage: "finalized" });
          return { hash: txHash, receipt: { statusName: lastStatus } } satisfies WriteResult;
        }
      } catch (err) {
        if (err instanceof Error && err.message.startsWith("Transaction ")) throw err;
        if (i >= 2 && isRpcNoiseError(err)) {
          onProgress?.({ hash: txHash, stage: "finalized" });
          return { hash: txHash, receipt: { statusName: lastStatus || "SUBMITTED", soft: true } };
        }
      }
      await new Promise((r) => setTimeout(r, options.interval));
    }
    onProgress?.({ hash: txHash, stage: "finalized" });
    return { hash: txHash, receipt: { statusName: lastStatus || "SUBMITTED", soft: true } };
  }

  private async write(
    functionName: string,
    args: Array<string | number | boolean>,
    value: bigint,
    wait = FAST_TX_WAIT,
    onProgress?: (progress: TransactionProgress) => void
  ) {
    onProgress?.({ stage: "preparing" });
    const client = await this.getWriteClient();
    const hash = await withMutedGenLayerConsole(() =>
      client.writeContract({
        address: this.contractAddress,
        functionName,
        args,
        value,
      })
    );
    onProgress?.({ hash: String(hash), stage: "submitted" });
    return this.waitForWrite(client, hash, wait, onProgress);
  }

  async getTasksPage(offset = 0, limit = 50): Promise<TaskView[]> {
    const raw = await this.readClient.readContract({
      address: this.contractAddress,
      functionName: "get_tasks_page",
      args: [offset, limit],
    });
    const list = normalizeReadResult<TaskView[]>(raw);
    return Array.isArray(list) ? list : [];
  }

  async getTask(id: number): Promise<TaskView> {
    const raw = await this.readClient.readContract({
      address: this.contractAddress,
      functionName: "get_task",
      args: [id],
    });
    return normalizeReadResult<TaskView>(raw);
  }

  async getConfig(): Promise<TaskConfig> {
    const raw = await this.readClient.readContract({
      address: this.contractAddress,
      functionName: "get_config",
      args: [],
    });
    return normalizeReadResult<TaskConfig>(raw);
  }

  initTask(
    agentRegistry: string,
    agentId: string,
    title: string,
    description: string,
    criteriaJson: string,
    deadline: number,
    onProgress?: (p: TransactionProgress) => void
  ) {
    return this.write(
      "init_task",
      [agentRegistry, agentId, title, description, criteriaJson, deadline],
      0n,
      AI_TX_WAIT,
      onProgress
    );
  }

  acceptTask(taskId: number, onProgress?: (p: TransactionProgress) => void) {
    return this.write("accept_task", [taskId], 0n, FAST_TX_WAIT, onProgress);
  }

  fundTask(taskId: number, amountWei: bigint, onProgress?: (p: TransactionProgress) => void) {
    return this.write("fund_task", [taskId], amountWei, FAST_TX_WAIT, onProgress);
  }

  submitResult(taskId: number, resultUrl: string, onProgress?: (p: TransactionProgress) => void) {
    return this.write("submit_result", [taskId, resultUrl], 0n, AI_TX_WAIT, onProgress);
  }

  evaluateTask(taskId: number, onProgress?: (p: TransactionProgress) => void) {
    return this.write("evaluate_task", [taskId], 0n, AI_TX_WAIT, onProgress);
  }

  expireTask(taskId: number, onProgress?: (p: TransactionProgress) => void) {
    return this.write("expire_task", [taskId], 0n, FAST_TX_WAIT, onProgress);
  }

  cancelTask(taskId: number, onProgress?: (p: TransactionProgress) => void) {
    return this.write("cancel_task", [taskId], 0n, FAST_TX_WAIT, onProgress);
  }
}
