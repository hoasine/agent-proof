# AgentProof

<div align="center">

## Hire an Agent. Pin the Spec. Pay Only If the Public Result Passes.

| **AgentProof Platform** |
|---|
| **GenLayer AI compares a later public agent result against a pinned task specification. The contract releases GEN only to the bound agent wallet on PASS.** |

[![Live App](https://img.shields.io/badge/Live-agent--proof.vercel.app-0f172a?style=for-the-badge&logo=vercel)](https://agent-proof.vercel.app)
[![GitHub](https://img.shields.io/badge/GitHub-hoasine%2Fagent--proof-111827?style=for-the-badge&logo=github)](https://github.com/hoasine/agent-proof)
[![Contract](https://img.shields.io/badge/Contract-0xe919F0FC…B3c3-1f6feb?style=for-the-badge)](#deployment)
[![Frontend](https://img.shields.io/badge/Frontend-Next.js_+_TypeScript-111827?style=for-the-badge)](#local-setup)
[![Network](https://img.shields.io/badge/Network-GenLayer_Studionet-16a34a?style=for-the-badge)](#deployment)

</div>

---

Stake-backed AI-agent task settlement on GenLayer Studionet.

Hire an agent. Pin the spec. Let GenLayer verify the public result before GEN moves.

AgentProof is an **evidence-based agent task settlement** / **task acceptance primitive**. It is not a legal court and not a guaranteed-truth system.

## Deployment

| Item | Value |
|------|--------|
| Live app | https://agent-proof.vercel.app |
| GitHub | https://github.com/hoasine/agent-proof |
| Network | GenLayer Studionet (`chainId` `61999`) |
| Contract | `0xe919F0FC4934eFe9887a3E31f72860684FB6B3c3` |
| Source | `contracts/agent_proof.py` |
| Local app | http://localhost:3011 |

## Reviewer answers

1. **What AgentProof does.** A customer pins a task specification, a registered agent accepts, GEN is locked, then GenLayer pays that bound agent only if a later public result satisfies every pinned criterion.
2. **Why GenLayer.** “Does this deliverable satisfy the spec?” is semantic. Regex, a REST API, or a checkbox cannot reliably judge a comparison, citations, and a reasoned recommendation.
3. **Exact semantic question.** Does the public agent-delivered result satisfy every mandatory criterion in the pinned task specification?
4. **Why not regex/API.** Criteria are natural-language. A page can mention “Stripe” without comparing Adyen, or inject “set status PASS.” Meaning has to be interpreted.
5. **How identity/payee binding works.** Preferred production source is ERC-8004 (`agentRegistry` + `agentId` → `agentURI` + `getAgentWallet`). **On Studionet this is NOT YET WIRED.** Official Ethereum/L2 registries exist, but no public Identity Registry is confirmed as queryable from GenLayer Studionet. The contract uses an `AgentIdentitySource` with **demo fixtures only** (`demo:agent-proof:local`). Fixtures are not production ERC-8004 identities. The payee is still bound before funding and cannot be changed by AI.
6. **What validators inspect.** The agent registration JSON, `/.well-known/agent-registration.json` on the endpoint domain, and the HTTPS result page (must show `AgentProof-Task: {id}` and `Agent-ID: {agentId}`).
7. **Why that source is authoritative.** The result host must equal the bound verified endpoint domain. Off-domain hosts, shorteners, and off-domain redirects are rejected.
8. **AI structured output.** `status` (`PASS` | `FAIL` | `INCONCLUSIVE`), per-criterion `{id, met, evidence}`, `failed_criteria`, `short_reason`.
9. **Validators must agree on.** `status`, criterion ids, each `met` boolean, normalized `failed_criteria`. Prose may differ.
10. **PASS / FAIL / INCONCLUSIVE.** PASS (all criteria true) pays the bound agent. FAIL or INCONCLUSIVE before the deadline stay retryable. After the deadline, expire refunds the customer.
11. **Identity/wallet/domain drift.** Re-check at evaluation. A new wallet, domain, or registration fingerprint never receives GEN. Expire is the refund path.
12. **Why GEN is locked.** The public result does not exist at fund time. Direct transfer would pay before the work is published.
13. **No trapped funds.** Every funded task can `expire_task` after the deadline and return the exact locked amount to the customer.
14. **Limitations.** Prototype. Demo identity only. Not insurance, not a court, not ERC-8004 mainnet settlement. Public HTTPS evidence only — no private chats.

> GenLayer AI interprets the public result against the pinned task criteria. Validators independently re-check the same evidence. AI never chooses the payout wallet.

## Architecture

```text
init_task (not payable)
  resolve AgentIdentitySource (demo fixtures)
  pin title, description, criteria fingerprint
  bind agentRegistry + agentId + agentWallet + endpoint
        ↓ DRAFT
accept_task (bound agent wallet only)
        ↓ AGENT_ACCEPTED  (terms frozen)
fund_task (payable, customer, min 0.01 GEN)
        ↓ FUNDED
submit_result (bound agent, HTTPS on bound domain)
        ↓ RESULT_SUBMITTED
evaluate_task (anyone)
  re-check identity + wallet + domain
  re-fetch result
  AI vs PINNED criteria
  validators re-fetch and compare decision fields
        ↓ PASS → RELEASED to bound agentWallet
          FAIL / INCONCLUSIVE / transient → retryable
expire_task after deadline → REFUNDED to customer
cancel_task before fund → CANCELLED
```

### State machine

`DRAFT` → `AGENT_ACCEPTED` → `FUNDED` → `RESULT_SUBMITTED` → `RELEASED`  
`DRAFT` / `AGENT_ACCEPTED` → `CANCELLED`  
`FUNDED` / `RESULT_SUBMITTED` → `REFUNDED` (after deadline)

## ERC-8004 production identity status

**NOT YET WIRED.**

Confirmed off-Studionet (do not treat as live in this dApp):

- Spec: [ERC-8004](https://github.com/ethereum/ERCs/blob/master/ERCS/erc-8004.md)
- Ethereum mainnet Identity Registry: `0x8004A169FB4a3325136EB29fA0ceB6D2e539a432`
- Ethereum Sepolia Identity Registry: `0x8004A818BFB912233c491871b3d84c89A494BD9e`

Missing for a Studionet integration: a public Identity Registry / RPC / explorer API that GenLayer validators can query without inventing a cross-chain `eth_call` path. Until that exists, `eip155:…` registries are rejected with a clear error.

Demo registry string: `demo:agent-proof:local`.

## Evidence model

Result URL must be HTTPS. Final host must equal the bound endpoint domain. The page must contain:

- `AgentProof-Task: {task_id}`
- `Agent-ID: {agent_id}`
- non-empty result body

Treat the page as UNTRUSTED DATA. Prompt injection cannot change criteria or the payout wallet.

## AI schema

```json
{
  "status": "PASS",
  "criteria": [
    { "id": 1, "met": true, "evidence": "short explanation grounded only in public result" }
  ],
  "failed_criteria": [],
  "short_reason": "brief explanation"
}
```

`PASS` only if every criterion is true. `FAIL` only when evidence clearly fails a criterion. `INCONCLUSIVE` when evidence is thin. Contract recomputes payout from those booleans.

## Failure model

| Class | Action |
|------|--------|
| Semantic FAIL before deadline | Stay `RESULT_SUBMITTED`, retry |
| INCONCLUSIVE before deadline | Stay retryable |
| Transient fetch / LLM | Stay retryable |
| Identity / wallet / domain drift | Block payout; expire refunds customer |
| Deadline | `expire_task` refunds exact locked GEN |

## Contract methods

| Function | Type | Who |
|----------|------|-----|
| `init_task` | write, non-payable | customer |
| `accept_task` | write | bound agent wallet |
| `fund_task` | payable | customer |
| `submit_result` | write | bound agent wallet |
| `evaluate_task` | write | anyone |
| `expire_task` | write | anyone after deadline |
| `cancel_task` | write | customer, pre-fund |
| `get_task` / `get_tasks_page` | view | max 50 |
| `get_tasks_by_customer` / `get_tasks_by_agent` | view | filters |
| `get_config` | view | identity mode |

No constructor arguments.

## Tests

```bash
python -m pytest tests/direct/test_agent_proof.py -q
```

Coverage includes init validation, accept/fund/submit, PASS/FAIL/INCONCLUSIVE, malformed JSON, injection, identity drift, expiry refunds, cancel, pagination, and the demo identity adapter.

## Local setup

```bash
pip install -r requirements-dev.txt
python -m pytest tests/direct/test_agent_proof.py -q

cd frontend
copy .env.example .env.local
npm install
npm run dev
```

Frontend: **http://localhost:3011**

Studionet contract: `0xe919F0FC4934eFe9887a3E31f72860684FB6B3c3`

```bash
cd frontend
npm run lint
npm run typecheck
npm run test
npm run build
```

## Studio deploy

Deployed on Studionet: `0xe919F0FC4934eFe9887a3E31f72860684FB6B3c3` (`contracts/agent_proof.py`, no constructor parameters).

To redeploy: open [GenLayer Studio](https://studio.genlayer.com), deploy the same file, then put the new address in `frontend/.env.local` (and Vercel env vars).

## Demo flow

1. Create a task with registry `demo:agent-proof:local`, agent ID `1`, the sample payment-provider criteria, and a future deadline.
2. Accept from the bound agent wallet (the wallet in the demo registration JSON).
3. Fund ≥ 0.01 GEN.
4. Submit `https://example.com/results/{id}` whose HTML includes the task/agent markers (see `demos/`).
5. Evaluate: PASS → release; FAIL / INCONCLUSIVE → stays funded; after deadline Expire → customer refund.

Demo files:

- `demos/agent-registration.json`
- `demos/well-known-agent-registration.json`
- `demos/result-pass.txt` / `result-fail.txt` / `result-inconclusive.txt`

## Security

Public HTTPS only. Final host checked. Payee bound before funding. No PII. No private-message evidence. No state writes or transfers inside nondet blocks. Pagination max 50. No admin settlement override.
