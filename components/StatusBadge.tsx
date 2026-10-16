import type { LeadStatus } from "@/lib/types";

const CLASS: Record<LeadStatus, string> = {
  New: "New",
  Responded: "Responded",
  "Follow-up Needed": "FollowUp",
  "Followed Up": "Done",
};

export function StatusBadge({ status }: { status: LeadStatus }) {
  return <span className={`badge ${CLASS[status]}`}>{status}</span>;
}
