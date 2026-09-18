"use client";

import { FileText, Lock, ShieldCheck, Timer } from "lucide-react";
import { AI_INTERPRET_COPY } from "@/lib/contracts/ai-copy";

const steps = [
  {
    icon: FileText,
    title: "Verify agent + pin spec",
    desc: "Resolve the registered agent, bind the payout wallet, and pin 1–6 mandatory criteria. No GEN yet.",
  },
  {
    icon: ShieldCheck,
    title: "Agent accepts, then lock GEN",
    desc: "Only the bound agent wallet can accept. Only then can the customer lock at least 0.01 GEN.",
  },
  {
    icon: Lock,
    title: "Publish a public result",
    desc: "The agent posts HTTPS evidence on the verified endpoint. The page must show the task ID and agent ID.",
  },
  {
    icon: Timer,
    title: "Evaluate or expire",
    desc: "PASS pays the bound agent. FAIL / INCONCLUSIVE stay retryable. After the deadline, unused GEN returns to the customer.",
  },
];

export function HowItWorks() {
  return (
    <section className="glass-card p-6 md:p-8">
      <h2 className="mb-6 font-display text-2xl font-bold">How AgentProof works</h2>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {steps.map((s, i) => (
          <div key={s.title} className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/20 text-sm font-bold text-accent">
                {i + 1}
              </span>
              <s.icon className="h-5 w-5 text-accent" />
            </div>
            <h3 className="font-semibold">{s.title}</h3>
            <p className="text-sm leading-relaxed text-muted-foreground">{s.desc}</p>
          </div>
        ))}
      </div>
      <p className="mt-6 text-sm leading-relaxed">{AI_INTERPRET_COPY}</p>
    </section>
  );
}
