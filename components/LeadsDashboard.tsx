"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { formatDate } from "@/lib/demo";
import { STATUSES } from "@/lib/config";
import type { Lead, LeadStatus } from "@/lib/types";
import { StatusBadge } from "./StatusBadge";

type Filter = "All" | LeadStatus;

function ago(iso: string) {
  const s = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 10) return "Just now";
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function LeadsDashboard() {
  const [leads, setLeads] = useState<Lead[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("All");
  const [fresh, setFresh] = useState<Set<string>>(new Set());
  const [busyId, setBusyId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [storage, setStorage] = useState<string>("");
  const [, tick] = useState(0);
  const known = useRef<Set<string> | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/leads", { cache: "no-store" });
      if (!res.ok) throw new Error();
      const data = await res.json();
      const incoming: Lead[] = data.leads;
      setStorage(data.storage);
      if (known.current) {
        const added = incoming.filter((l) => !known.current!.has(l.id)).map((l) => l.id);
        if (added.length) {
          setFresh(new Set(added));
          setSelectedId(added[0]); // jump to the newest lead so the demo lands on it
          setTimeout(() => setFresh(new Set()), 2600);
        }
      }
      known.current = new Set(incoming.map((l) => l.id));
      setLeads(incoming);
      setError(null);
    } catch {
      setError("Couldn't load leads.");
    }
  }, []);

  useEffect(() => {
    load();
    const poll = setInterval(load, 4000);
    const clock = setInterval(() => tick((n) => n + 1), 15000);
    return () => {
      clearInterval(poll);
      clearInterval(clock);
    };
  }, [load]);

  useEffect(() => {
    if (leads && !selectedId && leads.length) setSelectedId(leads[0].id);
  }, [leads, selectedId]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { All: leads?.length ?? 0 };
    for (const s of STATUSES) c[s] = leads?.filter((l) => l.status === s).length ?? 0;
    return c;
  }, [leads]);

  const visible = useMemo(
    () => (leads ?? []).filter((l) => filter === "All" || l.status === filter),
    [leads, filter],
  );
  const selected = leads?.find((l) => l.id === selectedId) ?? null;

  async function setStatus(lead: Lead, status: LeadStatus) {
    const prev = leads;
    setBusyId(lead.id);
    setLeads((ls) => ls && ls.map((l) => (l.id === lead.id ? { ...l, status } : l)));
    try {
      const res = await fetch(`/api/leads/${lead.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error();
      const { lead: updated } = await res.json();
      setLeads((ls) => ls && ls.map((l) => (l.id === updated.id ? updated : l)));
    } catch {
      setLeads(prev);
      setError("Couldn't update that lead. Try again.");
    } finally {
      setBusyId(null);
    }
  }

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable: ignore */
    }
  }

  const tabs: Filter[] = ["All", ...STATUSES];

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Leads</h1>
          <p>Every quote request, the AI reply that went out, and what needs your attention. Updates live.</p>
        </div>
        {storage && <span className="mode-tag">STORAGE · {storage.toUpperCase()}</span>}
      </div>

      {error && (
        <div className="toast-err" role="alert">
          <span>{error}</span>
          <button type="button" onClick={load}>Retry</button>
        </div>
      )}

      <div className="stats">
        <div className="stat"><div className="k">Total leads</div><div className="v">{counts.All}</div></div>
        <div className="stat"><div className="k">New</div><div className="v" style={{ color: "var(--blue)" }}>{counts.New}</div></div>
        <div className="stat"><div className="k">Responded</div><div className="v" style={{ color: "var(--green)" }}>{counts.Responded}</div></div>
        <div className="stat"><div className="k">Follow-up needed</div><div className="v" style={{ color: "var(--amber)" }}>{counts["Follow-up Needed"]}</div></div>
      </div>

      <div className="dash-grid">
        <section className="list-col" aria-label="Lead list">
          <div className="tabs">
            {tabs.map((t) => (
              <button key={t} type="button" className="tab" aria-pressed={filter === t} onClick={() => setFilter(t)}>
                {t} · {counts[t]}
              </button>
            ))}
          </div>
          <div className="list" role="listbox" aria-label="Leads">
            {leads === null && !error && [0, 1, 2].map((i) => <div className="skeleton" key={i} />)}
            {leads !== null && visible.length === 0 && (
              <div className="empty">
                <strong>{leads.length === 0 ? "No leads yet" : "Nothing here"}</strong>
                {leads.length === 0
                  ? "Submit an inquiry on the Quote request page and it will appear here instantly."
                  : "No leads match this filter."}
              </div>
            )}
            {visible.map((l) => (
              <button
                key={l.id}
                type="button"
                role="option"
                aria-selected={l.id === selectedId}
                className={`row${fresh.has(l.id) ? " fresh" : ""}`}
                onClick={() => setSelectedId(l.id)}
              >
                <div className="who">
                  <div className="nm">{l.name}</div>
                  <div className="meta">{l.service} · {l.vehicle}</div>
                </div>
                <span className="when">{ago(l.created_at)}</span>
                <StatusBadge status={l.status} />
              </button>
            ))}
          </div>
        </section>

        <aside className="detail-col">
          <div className="panel detail">
            {!selected ? (
              <div className="empty"><strong>Select a lead</strong>Inspect the AI reply and update the status here.</div>
            ) : (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                  <div className="eyebrow">Lead detail</div>
                  <StatusBadge status={selected.status} />
                </div>
                <h2>{selected.name}</h2>
                <div className="contact">
                  <a href={`mailto:${selected.email}`}>{selected.email}</a>
                  <a href={`tel:${selected.phone.replace(/[^\d+]/g, "")}`}>{selected.phone}</a>
                </div>
                <dl className="kv">
                  <div><dt>Vehicle</dt><dd>{selected.vehicle}</dd></div>
                  <div><dt>Service</dt><dd>{selected.service}</dd></div>
                  <div><dt>Preferred date</dt><dd>{formatDate(selected.preferred_date)}</dd></div>
                  <div><dt>Received</dt><dd>{new Date(selected.created_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</dd></div>
                </dl>

                <div className="label">
                  AI-generated response
                  <span className="mode-tag">{selected.ai_mode === "live" ? "LIVE AI" : selected.ai_mode === "demo" ? "DEMO MODE" : "NOT GENERATED"}</span>
                </div>
                {selected.ai_response ? (
                  <div className="reply" style={{ animation: "none" }}>{selected.ai_response}</div>
                ) : (
                  <div className="note-warn">The AI reply failed for this lead. Reach out to the customer manually.</div>
                )}

                <div className="detail-actions">
                  {selected.status !== "Followed Up" ? (
                    <button type="button" className="btn btn-light" disabled={busyId === selected.id} onClick={() => setStatus(selected, "Followed Up")}>
                      {busyId === selected.id ? <span className="spinner" aria-hidden="true" /> : "✓"} Mark as followed up
                    </button>
                  ) : (
                    <button type="button" className="btn btn-outline" disabled={busyId === selected.id} onClick={() => setStatus(selected, "Follow-up Needed")}>
                      Reopen
                    </button>
                  )}
                  {selected.status !== "Follow-up Needed" && selected.status !== "Followed Up" && (
                    <button type="button" className="btn btn-outline" disabled={busyId === selected.id} onClick={() => setStatus(selected, "Follow-up Needed")}>
                      Flag follow-up
                    </button>
                  )}
                  {selected.ai_response && (
                    <button type="button" className="btn btn-outline" onClick={() => copy(selected.ai_response!)}>
                      {copied ? "Copied!" : "Copy reply"}
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </aside>
      </div>
    </>
  );
}
