import { z } from "zod";
import { SERVICES, STATUSES } from "./config";

const clean = (max: number, min = 2, label = "This field") =>
  z
    .string({ error: `${label} is required` })
    .trim()
    .min(min, `${label} is required`)
    .max(max, `Keep this under ${max} characters`);

/** YYYY-MM-DD for "today" in the server's/browser's local time. */
export function todayISO(now = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export const inquirySchema = z.object({
  name: clean(80, 2, "Name").regex(/^[^<>{}]+$/, "Please use plain text only"),
  email: z
    .string({ error: "Email is required" })
    .trim()
    .max(120)
    .email("Enter a valid email address"),
  phone: z
    .string({ error: "Phone is required" })
    .trim()
    .max(30)
    .refine((v) => {
      const digits = v.replace(/\D/g, "");
      return /^[\d\s()+.-]+$/.test(v) && digits.length >= 7 && digits.length <= 15;
    }, "Enter a valid phone number"),
  vehicle: clean(100, 2, "Vehicle").regex(/^[^<>{}]+$/, "Please use plain text only"),
  service: z.enum(SERVICES, { error: "Choose a service" }),
  preferred_date: z
    .string({ error: "Pick a preferred date" })
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a preferred date")
    .refine((v) => !Number.isNaN(Date.parse(v)), "Pick a valid date")
    // one day of slack so server/browser timezone differences never reject "today"
    .refine((v) => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      return v >= todayISO(yesterday);
    }, "Date can't be in the past"),
});

export const statusUpdateSchema = z.object({ status: z.enum(STATUSES) });

export type FieldErrors = Partial<Record<keyof z.infer<typeof inquirySchema>, string>>;

export function fieldErrorsFrom(error: z.ZodError): FieldErrors {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    if (!out[key]) out[key] = issue.message;
  }
  return out as FieldErrors;
}
