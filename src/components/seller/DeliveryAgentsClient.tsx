"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuthContext } from "@/context/AuthContext";
import { toast } from "sonner";
import {
  Loader2, UserPlus, Trash2, ToggleLeft, ToggleRight,
  RefreshCw, Users, Package, AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Agent {
  id: string;
  agentId: string;
  isActive: boolean;
  createdAt: string;
  user: { name: string | null; email: string; phone: string | null };
  _count: { orders: number };
}

export function DeliveryAgentsClient() {
  const { user } = useAuthContext();
  const [agents, setAgents]     = useState<Agent[]>([]);
  const [fetching, setFetching] = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [email, setEmail]       = useState("");
  const [adding, setAdding]     = useState(false);
  const [acting, setActing]     = useState<Record<string, boolean>>({});

  const load = useCallback(async () => {
    if (!user) return;
    setFetching(true);
    setError(null);
    try {
      const res = await fetch("/api/sellers/delivery-agents", {
        headers: { Authorization: `Bearer ${user.uid}` },
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed to load");
      setAgents((await res.json()).agents ?? []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load agents");
    } finally {
      setFetching(false);
    }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const addAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !email.trim()) return;
    setAdding(true);
    try {
      const res = await fetch("/api/sellers/delivery-agents", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${user.uid}` },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add");
      toast.success(`${data.agent.user.name || data.agent.user.email} added as delivery agent`);
      setEmail("");
      setAgents((prev) => [data.agent, ...prev]);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to add agent");
    } finally {
      setAdding(false);
    }
  };

  const toggleAgent = async (agent: Agent) => {
    if (!user) return;
    setActing((p) => ({ ...p, [agent.id]: true }));
    try {
      const res = await fetch(`/api/sellers/delivery-agents/${agent.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${user.uid}` },
        body: JSON.stringify({ isActive: !agent.isActive }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed to update");
      setAgents((prev) =>
        prev.map((a) => (a.id === agent.id ? { ...a, isActive: !agent.isActive } : a))
      );
      toast.success(agent.isActive ? "Agent deactivated" : "Agent activated");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to update");
    } finally {
      setActing((p) => ({ ...p, [agent.id]: false }));
    }
  };

  const removeAgent = async (agent: Agent) => {
    if (!user) return;
    if (!confirm(`Remove ${agent.user.name || agent.user.email} as delivery agent? Their role will revert to Customer.`)) return;
    setActing((p) => ({ ...p, [agent.id]: true }));
    try {
      const res = await fetch(`/api/sellers/delivery-agents/${agent.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${user.uid}` },
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed to remove");
      setAgents((prev) => prev.filter((a) => a.id !== agent.id));
      toast.success("Agent removed");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to remove");
    } finally {
      setActing((p) => ({ ...p, [agent.id]: false }));
    }
  };

  if (fetching) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-foreground">
            <Users className="h-4 w-4 text-background" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">Delivery Agents</h1>
            <p className="text-sm text-muted-foreground">{agents.length} agent{agents.length !== 1 ? "s" : ""} · assign to COD orders</p>
          </div>
        </div>
        <button onClick={load} className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted transition-colors">
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </button>
      </div>

      {/* Add agent form */}
      <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
        <h2 className="mb-3 text-sm font-semibold">Add Delivery Agent</h2>
        <p className="mb-3 text-xs text-muted-foreground">
          Enter the email of an existing NexCart user. They will be assigned the Delivery Agent role and can log in to see their assigned orders.
        </p>
        <form onSubmit={addAgent} className="flex gap-2">
          <input
            type="email"
            placeholder="agent@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="h-9 flex-1 rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-foreground/20"
          />
          <button
            type="submit"
            disabled={adding || !email.trim()}
            className="flex h-9 items-center gap-1.5 rounded-lg bg-foreground px-4 text-xs font-semibold text-background transition hover:opacity-80 disabled:opacity-50"
          >
            {adding ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserPlus className="h-3.5 w-3.5" />}
            Add
          </button>
        </form>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 dark:border-red-800/40 dark:bg-red-900/10">
          <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
          <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Agent list */}
      {agents.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/10 py-12 text-center">
          <Users className="mb-3 h-8 w-8 text-muted-foreground/40" />
          <p className="text-sm font-medium">No delivery agents yet</p>
          <p className="mt-1 text-xs text-muted-foreground">Add an agent above to assign them to COD orders</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border/50">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border/50 bg-muted/30">
                {["Agent", "Contact", "Orders", "Status", "Actions"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {agents.map((agent) => (
                <tr key={agent.id} className="border-b border-border/50 last:border-0 hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3">
                    <div className="text-sm font-medium">{agent.user.name || "—"}</div>
                    <div className="text-xs text-muted-foreground">{agent.user.email}</div>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {agent.user.phone || "—"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 text-sm">
                      <Package className="h-3.5 w-3.5 text-muted-foreground" />
                      {agent._count.orders}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn(
                      "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium",
                      agent.isActive
                        ? "border-green-200 bg-green-50 text-green-700 dark:border-green-800/40 dark:bg-green-900/20 dark:text-green-400"
                        : "border-gray-200 bg-gray-50 text-gray-600 dark:border-gray-700 dark:bg-gray-900/20"
                    )}>
                      {agent.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => toggleAgent(agent)}
                        disabled={!!acting[agent.id]}
                        title={agent.isActive ? "Deactivate" : "Activate"}
                        className="flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[11px] font-medium hover:bg-muted transition-colors disabled:opacity-50"
                      >
                        {acting[agent.id] ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : agent.isActive ? (
                          <ToggleRight className="h-3.5 w-3.5 text-green-600" />
                        ) : (
                          <ToggleLeft className="h-3.5 w-3.5 text-muted-foreground" />
                        )}
                        {agent.isActive ? "Deactivate" : "Activate"}
                      </button>
                      <button
                        onClick={() => removeAgent(agent)}
                        disabled={!!acting[agent.id]}
                        title="Remove agent"
                        className="flex items-center gap-1 rounded-md border border-red-200 bg-red-50 px-2 py-1 text-[11px] font-medium text-red-700 hover:bg-red-100 transition-colors disabled:opacity-50 dark:border-red-800/40 dark:bg-red-900/20 dark:text-red-400"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Remove
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
