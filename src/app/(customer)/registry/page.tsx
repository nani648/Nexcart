"use client";

import { useState, useEffect } from "react";
import { auth } from "@/lib/firebase";
import { toast } from "sonner";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { formatPrice } from "@/lib/utils";
import {
  Gift, Plus, Trash2, Share2, Copy, Check, X,
  Calendar, ExternalLink, ChevronDown, ChevronUp, Loader2,
} from "lucide-react";
import Link from "next/link";

function getUid() {
  return auth.currentUser?.uid ?? (() => { try { return localStorage.getItem("nxc-uid"); } catch { return null; } })();
}

const OCCASIONS = [
  { key: "WEDDING",      label: "💍 Wedding"      },
  { key: "BIRTHDAY",     label: "🎂 Birthday"     },
  { key: "BABY_SHOWER",  label: "👶 Baby Shower"  },
  { key: "ANNIVERSARY",  label: "🥂 Anniversary"  },
  { key: "GRADUATION",   label: "🎓 Graduation"   },
  { key: "HOUSEWARMING", label: "🏡 Housewarming" },
  { key: "OTHER",        label: "🎁 Other"         },
];

interface RegistryItem {
  id: string; name: string; image: string | null; price: number;
  productSlug: string; quantity: number; purchased: number;
  priority: string; note: string | null;
}
interface Registry {
  id: string; title: string; occasion: string; slug: string;
  eventDate: string | null; description: string | null;
  items: RegistryItem[]; _count: { items: number };
}

export default function RegistryPage() {
  const [registries, setRegistries] = useState<Registry[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [removingItem, setRemovingItem] = useState<string | null>(null);

  // Create form
  const [showForm, setShowForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [formTitle, setFormTitle] = useState("");
  const [formOccasion, setFormOccasion] = useState("OTHER");
  const [formDate, setFormDate] = useState("");
  const [formDesc, setFormDesc] = useState("");

  const uid = getUid();

  const fetchRegistries = () => {
    if (!uid) { setLoading(false); return; }
    fetch("/api/registry", { headers: { Authorization: `Bearer ${uid}` } })
      .then(r => r.json())
      .then(d => setRegistries(d.registries ?? []))
      .catch(() => toast.error("Failed to load registries"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchRegistries(); }, []); // eslint-disable-line

  const createRegistry = async () => {
    if (!formTitle.trim()) { toast.error("Enter a registry title"); return; }
    if (!uid) { toast.error("Please sign in"); return; }
    setCreating(true);
    try {
      const res = await fetch("/api/registry", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${uid}` },
        body: JSON.stringify({ title: formTitle, occasion: formOccasion, eventDate: formDate || null, description: formDesc }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      setRegistries(prev => [d.registry, ...prev]);
      setShowForm(false);
      setFormTitle(""); setFormOccasion("OTHER"); setFormDate(""); setFormDesc("");
      toast.success("Registry created!");
      setExpanded(d.registry.id);
    } catch (e) { toast.error((e as Error).message || "Failed to create"); }
    finally { setCreating(false); }
  };

  const deleteRegistry = async (slug: string) => {
    if (!confirm("Delete this registry? This cannot be undone.")) return;
    if (!uid) return;
    setDeleting(slug);
    try {
      const res = await fetch(`/api/registry/${slug}`, { method: "DELETE", headers: { Authorization: `Bearer ${uid}` } });
      if (!res.ok) throw new Error("Failed");
      setRegistries(prev => prev.filter(r => r.slug !== slug));
      toast.success("Registry deleted");
    } catch { toast.error("Failed to delete"); }
    finally { setDeleting(null); }
  };

  const removeItem = async (slug: string, itemId: string) => {
    if (!uid) return;
    setRemovingItem(itemId);
    try {
      const res = await fetch(`/api/registry/${slug}/items/${itemId}`, { method: "DELETE", headers: { Authorization: `Bearer ${uid}` } });
      if (!res.ok) throw new Error("Failed");
      setRegistries(prev => prev.map(r => r.slug === slug ? { ...r, items: r.items.filter(i => i.id !== itemId) } : r));
      toast.success("Item removed");
    } catch { toast.error("Failed to remove item"); }
    finally { setRemovingItem(null); }
  };

  const copyLink = (slug: string) => {
    const url = `${window.location.origin}/registry/${slug}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(slug);
      setTimeout(() => setCopied(null), 2000);
      toast.success("Link copied!");
    });
  };

  const occasionLabel = (key: string) => OCCASIONS.find(o => o.key === key)?.label ?? "🎁 Other";

  if (loading) return (
    <>
      <Navbar />
      <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
        <div className="flex items-center justify-center h-40">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </main>
    </>
  );

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6 pb-24">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2"><Gift className="h-5 w-5 text-pink-500" /> Gift Registries</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Create wishlists for weddings, birthdays & more — share with friends & family</p>
          </div>
          <button
            onClick={() => setShowForm(v => !v)}
            className="flex items-center gap-1.5 rounded-xl bg-foreground text-background px-4 py-2.5 text-[13px] font-bold hover:opacity-90 transition-opacity"
          >
            <Plus className="h-4 w-4" /> New Registry
          </button>
        </div>

        {/* Create form */}
        {showForm && (
          <div className="mb-5 rounded-2xl border border-border/60 bg-card p-5 space-y-3">
            <h2 className="font-semibold text-[15px]">Create New Registry</h2>
            <input
              type="text" value={formTitle} onChange={e => setFormTitle(e.target.value)} maxLength={60}
              placeholder="e.g. Priya & Arjun's Wedding Registry"
              className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <div className="grid grid-cols-2 gap-3">
              <select value={formOccasion} onChange={e => setFormOccasion(e.target.value)} className="rounded-xl border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                {OCCASIONS.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
              </select>
              <input type="date" value={formDate} onChange={e => setFormDate(e.target.value)} className="rounded-xl border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <textarea value={formDesc} onChange={e => setFormDesc(e.target.value)} rows={2} maxLength={200} placeholder="Optional message to gift givers..." className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none" />
            <div className="flex gap-2">
              <button onClick={createRegistry} disabled={creating} className="flex-1 rounded-xl bg-foreground text-background py-2.5 text-[13px] font-bold hover:opacity-90 disabled:opacity-50">
                {creating ? "Creating…" : "Create Registry"}
              </button>
              <button onClick={() => setShowForm(false)} className="rounded-xl border border-border px-4 text-[13px] font-medium hover:bg-muted transition-colors">
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Empty state */}
        {registries.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-border py-16 text-center">
            <div className="text-5xl">🎁</div>
            <div>
              <p className="font-semibold text-foreground">No registries yet</p>
              <p className="text-sm text-muted-foreground mt-1">Create your first registry and share it with friends & family</p>
            </div>
            <button onClick={() => setShowForm(true)} className="flex items-center gap-1.5 rounded-xl bg-foreground text-background px-5 py-2.5 text-[13px] font-bold hover:opacity-90">
              <Plus className="h-4 w-4" /> Create Registry
            </button>
          </div>
        )}

        {/* Registry cards */}
        <div className="space-y-4">
          {registries.map(reg => (
            <div key={reg.id} className="rounded-2xl border border-border/60 bg-card overflow-hidden">
              {/* Card header */}
              <div className="px-5 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-[16px] text-foreground leading-tight">{reg.title}</h3>
                      <span className="rounded-full bg-pink-50 dark:bg-pink-950/30 border border-pink-200 dark:border-pink-800/40 px-2 py-0.5 text-[11px] font-semibold text-pink-600 dark:text-pink-400">
                        {occasionLabel(reg.occasion)}
                      </span>
                    </div>
                    {reg.eventDate && (
                      <p className="text-[12px] text-muted-foreground mt-1 flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(reg.eventDate).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
                      </p>
                    )}
                    {reg.description && <p className="text-[12px] text-muted-foreground mt-1 italic">{reg.description}</p>}
                    <p className="text-[12px] text-muted-foreground mt-1.5">{reg._count.items} item{reg._count.items !== 1 ? "s" : ""}</p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button onClick={() => copyLink(reg.slug)} className="flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-[12px] font-medium hover:bg-muted transition-colors">
                      {copied === reg.slug ? <><Check className="h-3.5 w-3.5 text-emerald-500" /> Copied</> : <><Copy className="h-3.5 w-3.5" /> Copy Link</>}
                    </button>
                    <Link href={`/registry/${reg.slug}`} target="_blank" className="flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-[12px] font-medium hover:bg-muted transition-colors">
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Link>
                    <button onClick={() => deleteRegistry(reg.slug)} disabled={deleting === reg.slug} className="flex items-center justify-center rounded-lg border border-border p-1.5 text-muted-foreground hover:text-destructive hover:border-destructive/40 transition-colors disabled:opacity-40">
                      {deleting === reg.slug ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                    </button>
                    <button onClick={() => setExpanded(expanded === reg.id ? null : reg.id)} className="rounded-lg border border-border p-1.5 hover:bg-muted transition-colors">
                      {expanded === reg.id ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Items list (expanded) */}
              {expanded === reg.id && (
                <div className="border-t border-border/40">
                  {reg.items.length === 0 ? (
                    <div className="px-5 py-6 text-center">
                      <p className="text-sm text-muted-foreground">No items yet. Browse stores and tap &quot;Add to Registry&quot; on any product.</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-border/40">
                      {reg.items.map(item => {
                        const isFull = item.purchased >= item.quantity;
                        return (
                          <div key={item.id} className={`flex items-center gap-3 px-5 py-3 ${isFull ? "opacity-50" : ""}`}>
                            {item.image ? (
                              <img src={item.image} alt={item.name} className="h-12 w-12 rounded-xl object-contain bg-muted shrink-0 border border-border/40" />
                            ) : (
                              <div className="h-12 w-12 rounded-xl bg-muted shrink-0 flex items-center justify-center text-xl">🎁</div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-[13px] font-semibold truncate">{item.name}</p>
                              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                <span className="text-[12px] font-bold text-foreground">{formatPrice(item.price)}</span>
                                <span className="text-[11px] text-muted-foreground">
                                  {item.purchased}/{item.quantity} purchased
                                </span>
                                {isFull && <span className="rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 text-[10px] font-bold">✓ Fulfilled</span>}
                                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${item.priority === "HIGH" ? "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400" : item.priority === "LOW" ? "bg-muted text-muted-foreground" : "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"}`}>
                                  {item.priority}
                                </span>
                              </div>
                              {item.note && <p className="text-[11px] text-muted-foreground italic mt-0.5">{item.note}</p>}
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              {item.productSlug && (
                                <Link href={`/product/${item.productSlug}`} target="_blank" className="rounded-lg border border-border p-1.5 hover:bg-muted transition-colors">
                                  <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                                </Link>
                              )}
                              <button onClick={() => removeItem(reg.slug, item.id)} disabled={removingItem === item.id} className="rounded-lg border border-border p-1.5 text-muted-foreground hover:text-destructive hover:border-destructive/40 transition-colors">
                                {removingItem === item.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Share prompt */}
                  <div className="px-5 py-3 bg-muted/30 flex items-center justify-between gap-3 border-t border-border/40">
                    <p className="text-[12px] text-muted-foreground">Share this link with friends & family</p>
                    <button
                      onClick={() => {
                        const url = `${window.location.origin}/registry/${reg.slug}`;
                        if (navigator.share) navigator.share({ title: reg.title, url });
                        else copyLink(reg.slug);
                      }}
                      className="flex items-center gap-1.5 rounded-xl bg-foreground text-background px-3 py-1.5 text-[12px] font-bold hover:opacity-90"
                    >
                      <Share2 className="h-3.5 w-3.5" /> Share
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </main>
      <Footer />
    </>
  );
}
