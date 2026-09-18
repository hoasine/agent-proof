"use client";

import { Suspense } from "react";
import { Bot } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { TaskApp } from "@/components/task/TaskApp";

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-grow px-4 pt-24 pb-16 md:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <header className="mb-12 animate-fade-in text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs font-medium text-accent">
              <Bot className="h-3.5 w-3.5" />
              Intelligent Contract · GenLayer Studionet
            </div>
            <h1 className="mb-4 font-display text-4xl font-bold md:text-5xl lg:text-6xl">
              Agent<span className="text-gradient">Proof</span>
            </h1>
            <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
              Hire an agent. Pin the spec. Let GenLayer verify the result before GEN moves.
            </p>
            <p className="mx-auto mt-3 max-w-2xl text-sm text-muted-foreground">
              AgentProof settles AI-agent work using public evidence, pinned acceptance criteria, and
              GenLayer validator consensus.
            </p>
          </header>
          <Suspense fallback={<p className="text-center text-sm text-muted-foreground">Loading…</p>}>
            <TaskApp />
          </Suspense>
        </div>
      </main>
      <footer className="space-y-4 border-t border-white/5 px-4 py-8">
        <p className="text-center text-xs text-muted-foreground">
          AgentProof · evidence-based agent task settlement · not a legal court
        </p>
      </footer>
    </div>
  );
}
