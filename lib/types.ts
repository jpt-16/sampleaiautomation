import type { SERVICES, STATUSES } from "./config";

export type Service = (typeof SERVICES)[number];
export type LeadStatus = (typeof STATUSES)[number];

/** live = real model, demo = built-in sample reply, failed = AI step errored (lead still saved) */
export type AiMode = "live" | "demo" | "failed";

export interface Inquiry {
  name: string;
  email: string;
  phone: string;
  vehicle: string;
  service: Service;
  preferred_date: string; // YYYY-MM-DD
}

export interface Lead extends Inquiry {
  id: string;
  ai_response: string | null;
  ai_mode: AiMode;
  status: LeadStatus;
  created_at: string;
  updated_at: string;
}

export interface NewLead extends Inquiry {
  ai_response: string | null;
  ai_mode: AiMode;
  status: LeadStatus;
}
