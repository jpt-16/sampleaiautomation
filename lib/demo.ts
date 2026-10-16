import { BUSINESS_NAME } from "./config";
import type { Inquiry } from "./types";

export function formatDate(iso: string): string {
  const d = new Date(`${iso}T12:00:00`);
  return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
}

const SERVICE_NOTES: Record<string, string> = {
  "Exterior Wash & Wax": "a thorough exterior wash and wax to bring back that deep, glossy finish",
  "Interior Deep Clean": "a deep interior clean to refresh every surface inside the cabin",
  "Full Interior & Exterior Detail": "a full interior and exterior detail, top to bottom",
  "Paint Correction": "paint correction to address swirls and dullness in the finish",
  "Ceramic Coating": "a ceramic coating to protect and enhance your paint for the long haul",
};

/** Realistic sample reply used when no AI key is configured. Never states prices or confirms bookings. */
export function demoResponse(i: Inquiry): string {
  const first = i.name.trim().split(/\s+/)[0];
  const note = SERVICE_NOTES[i.service] ?? `our ${i.service.toLowerCase()} service`;
  return [
    `Hi ${first},`,
    `Thank you for reaching out to ${BUSINESS_NAME}! We've received your request for ${note} on your ${i.vehicle}, and we love that you're giving it some attention.`,
    `You mentioned ${formatDate(i.preferred_date)} as your preferred day. Our team will review your request and follow up personally with pricing and availability, so there's nothing more you need to do right now.`,
    `Talk soon,\nThe ${BUSINESS_NAME} Team`,
  ].join("\n\n");
}
