"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { SERVICES } from "@/lib/config";
import type { Lead } from "@/lib/types";
import { fieldErrorsFrom, inquirySchema, todayISO, type FieldErrors } from "@/lib/validation";
import { formatDate } from "@/lib/demo";

type Values = Record<"name" | "email" | "phone" | "vehicle" | "service" | "preferred_date", string>;
const EMPTY: Values = { name: "", email: "", phone: "", vehicle: "", service: "", preferred_date: "" };

const DEMO_PEOPLE = [
  { name: "Marcus Rivera", email: "marcus.rivera@example.com", phone: "(555) 014-2290", vehicle: "2021 Tesla Model 3, black", service: "Full Interior & Exterior Detail" },
  { name: "Priya Nair", email: "priya.nair@example.com", phone: "(555) 018-4417", vehicle: "2023 BMW X5, white", service: "Ceramic Coating" },
  { name: "Dan Whitfield", email: "dan.whitfield@example.com", phone: "(555) 011-7732", vehicle: "2018 Ford F-150, dark gray", service: "Interior Deep Clean" },
  { name: "Elena Costa", email: "elena.costa@example.com", phone: "(555) 019-3086", vehicle: "2019 Porsche 911, red", service: "Paint Correction" },
];
let demoIndex = 0;

const FIELD_ORDER: (keyof Values)[] = ["name", "email", "phone", "vehicle", "service", "preferred_date"];
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type Phase = "idle" | "sending" | "done";

export function QuoteForm() {
  const [values, setValues] = useState<Values>(EMPTY);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [stage, setStage] = useState(0); // 0 idle · 1 received · 2 drafting · 3 saving · 4 complete
  const [typed, setTyped] = useState("");
  const [typing, setTyping] = useState(false);
  const [lead, setLead] = useState<Lead | null>(null);
  const [aiFailed, setAiFailed] = useState(false);
  const [demoMode, setDemoMode] = useState(true);
  const [filling, setFilling] = useState(false);
  const [justFilled, setJustFilled] = useState<string | null>(null);
  const busy = phase === "sending" || filling;
  const submitting = useRef(false);

  const set = (k: keyof Values, v: string) => {
    setValues((p) => ({ ...p, [k]: v }));
    if (errors[k]) setErrors((p) => ({ ...p, [k]: undefined }));
  };

  function typeOut(text: string) {
    return new Promise<void>((resolve) => {
      setTyping(true);
      let i = 0;
      const t = setInterval(() => {
        i += 4;
        setTyped(text.slice(0, i));
        if (i >= text.length) {
          clearInterval(t);
          setTyping(false);
          resolve();
        }
      }, 16);
    });
  }

  async function submit(v: Values) {
    if (submitting.current) return;
    setFormError(null);
    const parsed = inquirySchema.safeParse(v);
    if (!parsed.success) {
      setErrors(fieldErrorsFrom(parsed.error));
      return;
    }
    submitting.current = true;
    setErrors({});
    setPhase("sending");
    setTyped("");
    setLead(null);
    setAiFailed(false);
    setStage(1);

    try {
      await sleep(550);
      setStage(2);
      const [res] = await Promise.all([
        fetch("/api/inquiries", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(parsed.data),
        }),
        sleep(1500), // let the "drafting" step be visible on camera even in instant demo mode
      ]);
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        if (data.fieldErrors) setErrors(data.fieldErrors);
        setFormError(data.error ?? "Something went wrong. Please try again.");
        setPhase("idle");
        setStage(0);
        return;
      }

      const saved: Lead = data.lead;
      setDemoMode(Boolean(data.demoMode));
      setAiFailed(Boolean(data.aiFailed));
      setLead(saved);
      if (saved.ai_response) await typeOut(saved.ai_response);
      setStage(3);
      await sleep(650);
      setStage(4);
      setPhase("done");
    } catch {
      setFormError("Network problem. Check your connection and try again.");
      setPhase("idle");
      setStage(0);
    } finally {
      submitting.current = false;
    }
  }

  async function runDemo() {
    if (busy) return;
    const p = DEMO_PEOPLE[demoIndex++ % DEMO_PEOPLE.length];
    const d = new Date();
    d.setDate(d.getDate() + 6);
    const next: Values = { ...p, preferred_date: todayISO(d) };
    setFilling(true);
    setErrors({});
    setFormError(null);
    setValues(EMPTY);
    for (const k of FIELD_ORDER) {
      await sleep(170);
      setValues((prev) => ({ ...prev, [k]: next[k] }));
      setJustFilled(k);
    }
    await sleep(350);
    setJustFilled(null);
    setFilling(false);
    await submit(next);
  }

  function reset() {
    setValues(EMPTY);
    setErrors({});
    setFormError(null);
    setPhase("idle");
    setStage(0);
    setTyped("");
    setLead(null);
  }

  const stepClass = (n: number) => {
    if (stage > n) return n === 2 && aiFailed ? "warn" : "done";
    if (stage === n) return "active";
    return "pending";
  };

  const field = (k: keyof Values, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <label className={`field${justFilled === k ? " fill" : ""}`} data-invalid={Boolean(errors[k])}>
      {label}
      <input
        name={k}
        value={values[k]}
        disabled={busy}
        aria-invalid={Boolean(errors[k])}
        aria-describedby={errors[k] ? `${k}-err` : undefined}
        onChange={(e) => set(k, e.target.value)}
        {...props}
      />
      {errors[k] && <span className="err" id={`${k}-err`} role="alert">{errors[k]}</span>}
    </label>
  );

  return (
    <div className="hero-grid">
      <section className="hero-left">
        <div className="eyebrow">AI lead response</div>
        <h1 className="hero">Get a detailing quote.<br />We reply in seconds.</h1>
        <p className="lede">
          Tell us about your vehicle. You&apos;ll get a personal acknowledgement right away, and a real person follows up with pricing and availability.
        </p>

        {phase === "done" && lead ? (
          <div className="card-light success" role="status">
            <div className="check" aria-hidden="true">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
            </div>
            <h2>Request received, {lead.name.split(" ")[0]}!</h2>
            <p>
              {aiFailed
                ? "Your request is saved and our team will reach out to you personally."
                : "We've sent you a personal reply and our team will follow up with pricing and availability."}
            </p>
            <dl className="summary">
              <div><dt>Vehicle</dt><dd>{lead.vehicle}</dd></div>
              <div><dt>Service</dt><dd>{lead.service}</dd></div>
              <div><dt>Preferred date</dt><dd>{formatDate(lead.preferred_date)}</dd></div>
              <div><dt>Contact</dt><dd>{lead.email}</dd></div>
            </dl>
            <div className="actions" style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
              <Link href="/dashboard" className="btn btn-primary">View in lead dashboard →</Link>
              <button type="button" className="btn btn-ghost" onClick={reset}>New inquiry</button>
            </div>
          </div>
        ) : (
          <form
            className="card-light form-grid"
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              submit(values);
            }}
          >
            {formError && <div className="banner-err span-2" role="alert">{formError}</div>}
            {field("name", "Full name", { autoComplete: "name", placeholder: "Jane Smith" })}
            {field("email", "Email", { type: "email", autoComplete: "email", placeholder: "jane@example.com" })}
            {field("phone", "Phone", { type: "tel", autoComplete: "tel", placeholder: "(555) 123-4567" })}
            {field("vehicle", "Vehicle", { placeholder: "2022 Audi Q5, silver" })}
            <label className={`field${justFilled === "service" ? " fill" : ""}`} data-invalid={Boolean(errors.service)}>
              Service
              <select
                name="service"
                value={values.service}
                disabled={busy}
                aria-invalid={Boolean(errors.service)}
                onChange={(e) => set("service", e.target.value)}
              >
                <option value="">Select a service…</option>
                {SERVICES.map((s) => <option key={s}>{s}</option>)}
              </select>
              {errors.service && <span className="err" role="alert">{errors.service}</span>}
            </label>
            {field("preferred_date", "Preferred date", { type: "date", min: todayISO() })}
            <div className="actions">
              <button type="submit" className="btn btn-primary" disabled={busy}>
                {phase === "sending" ? <><span className="spinner" aria-hidden="true" /> Sending…</> : "Request my quote"}
              </button>
              <button type="button" className="btn btn-ghost" onClick={runDemo} disabled={busy}>
                ▶ Run demo inquiry
              </button>
            </div>
          </form>
        )}
      </section>

      <aside className="hero-right">
        <div className="panel" aria-live="polite">
          <div className="panel-head">
            <h2>Live automation</h2>
            <span className={`state-tag ${stage === 4 ? "ok" : stage > 0 ? "on" : ""}`}>
              {stage === 0 ? "Waiting for inquiry" : stage === 4 ? "● Complete" : "● Running"}
            </span>
          </div>
          <ol className="steps">
            <li className={`step ${stepClass(1)}`}>
              <div className="rail"><div className="dot">1</div><div className="line" /></div>
              <div className="step-body">
                <div className="step-title">Inquiry received</div>
                <div className="step-sub">
                  {stage >= 1 && values.name ? `${values.name} · ${values.vehicle} · ${values.service}` : "Customer submits the quote form"}
                </div>
              </div>
            </li>
            <li className={`step ${stepClass(2)}`}>
              <div className="rail"><div className="dot">2</div><div className="line" /></div>
              <div className="step-body">
                <div className="step-title">
                  {stage === 2 && !lead ? "AI is writing a personal reply…" : "AI response drafted"}
                  {stage >= 2 && lead && (
                    <span className="mode-tag">{lead.ai_mode === "live" ? "LIVE AI" : lead.ai_mode === "demo" ? "DEMO MODE" : "UNAVAILABLE"}</span>
                  )}
                </div>
                {stage === 2 && !lead && <div className="reply"><span className="dots" aria-label="Generating"><span /><span /><span /></span></div>}
                {lead?.ai_response && (
                  <div className="reply">
                    {typed}
                    {typing && <span className="caret" />}
                  </div>
                )}
                {stage < 2 && <div className="step-sub">Personalised, with no prices or promises</div>}
                {aiFailed && stage >= 2 && (
                  <div className="note-warn">The AI step was unavailable. The lead was still saved for manual follow-up.</div>
                )}
                {demoMode && lead?.ai_response && stage >= 3 && (
                  <div className="step-sub">No API key configured, so this is a built-in sample reply.</div>
                )}
              </div>
            </li>
            <li className={`step ${stepClass(3)}`}>
              <div className="rail"><div className="dot">3</div></div>
              <div className="step-body">
                <div className="step-title">{stage === 3 ? "Saving to lead database…" : "Saved to lead database"}</div>
                <div className="step-sub">
                  {stage >= 4 && lead ? (
                    <>Status: <strong style={{ color: lead.status === "Responded" ? "var(--green)" : "var(--blue)" }}>{lead.status}</strong> · visible to the owner now</>
                  ) : (
                    "Inquiry, reply, status and timestamp stored"
                  )}
                </div>
                {stage >= 4 && (
                  <Link href="/dashboard" className="btn btn-light" style={{ marginTop: 14 }}>Open in dashboard →</Link>
                )}
              </div>
            </li>
          </ol>
        </div>
      </aside>
    </div>
  );
}
