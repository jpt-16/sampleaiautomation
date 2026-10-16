import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Lead, LeadStatus, NewLead } from "./types";

export interface LeadStore {
  kind: "supabase" | "sqlite";
  insert(lead: NewLead): Promise<Lead>;
  list(): Promise<Lead[]>;
  setStatus(id: string, status: LeadStatus): Promise<Lead | null>;
}

// ---------- Supabase ----------
function supabaseStore(): LeadStore {
  const client: SupabaseClient = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
  return {
    kind: "supabase",
    async insert(lead) {
      const { data, error } = await client.from("leads").insert(lead).select().single();
      if (error) throw new Error(`Supabase insert failed: ${error.message}`);
      return data as Lead;
    },
    async list() {
      const { data, error } = await client
        .from("leads")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw new Error(`Supabase query failed: ${error.message}`);
      return (data ?? []) as Lead[];
    },
    async setStatus(id, status) {
      const { data, error } = await client
        .from("leads")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .maybeSingle();
      if (error) throw new Error(`Supabase update failed: ${error.message}`);
      return (data as Lead | null) ?? null;
    },
  };
}

// ---------- SQLite (zero-config local persistence via Node's built-in driver) ----------
async function sqliteStore(): Promise<LeadStore> {
  const { DatabaseSync } = await import("node:sqlite");
  const file = process.env.SQLITE_PATH || path.join(process.cwd(), "data", "leads.db");
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec(`
    create table if not exists leads (
      id text primary key,
      name text not null,
      email text not null,
      phone text not null,
      vehicle text not null,
      service text not null,
      preferred_date text not null,
      ai_response text,
      ai_mode text not null default 'demo' check (ai_mode in ('live','demo','failed')),
      status text not null default 'New' check (status in ('New','Responded','Follow-up Needed','Followed Up')),
      created_at text not null,
      updated_at text not null
    );
    create index if not exists leads_created_at_idx on leads (created_at desc);
  `);

  const get = (id: string) => db.prepare("select * from leads where id = ?").get(id) as unknown as Lead | undefined;

  return {
    kind: "sqlite",
    async insert(l) {
      const id = randomUUID();
      const now = new Date().toISOString();
      db.prepare(
        `insert into leads (id,name,email,phone,vehicle,service,preferred_date,ai_response,ai_mode,status,created_at,updated_at)
         values (?,?,?,?,?,?,?,?,?,?,?,?)`,
      ).run(id, l.name, l.email, l.phone, l.vehicle, l.service, l.preferred_date, l.ai_response, l.ai_mode, l.status, now, now);
      return get(id)!;
    },
    async list() {
      return db.prepare("select * from leads order by created_at desc limit 200").all() as unknown as Lead[];
    },
    async setStatus(id, status) {
      db.prepare("update leads set status = ?, updated_at = ? where id = ?").run(status, new Date().toISOString(), id);
      return get(id) ?? null;
    },
  };
}

const globalForStore = globalThis as unknown as { __leadStore?: Promise<LeadStore> };

export function getStore(): Promise<LeadStore> {
  if (!globalForStore.__leadStore) {
    globalForStore.__leadStore =
      process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
        ? Promise.resolve(supabaseStore())
        : sqliteStore();
  }
  return globalForStore.__leadStore;
}

export function storageKind(): "supabase" | "sqlite" {
  return process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY ? "supabase" : "sqlite";
}
