/**
 * The parts of a proof a browser is allowed to know about.
 *
 * Separate from proofs.ts because that one is "server-only", and a
 * client component importing a value from it (not just a type, which
 * erases) drags the database layer into the browser bundle and fails the
 * build. Types and labels live here; anything that touches MySQL stays
 * on the other side.
 */

export type ProofStatus = "sent" | "approved" | "changes";

export type Proof = {
  id: number;
  email: string;
  cardId: string;
  version: number;
  filename: string;
  mime: string;
  bytes: number;
  status: ProofStatus;
  /** What we said when sending it. */
  note: string;
  /** What they said when approving or asking for changes. */
  response: string;
  uploadedBy: string;
  createdAt: string | null;
  respondedAt: string | null;
};

export const PROOF_STATUS_LABEL: Record<ProofStatus, string> = {
  sent: "Waiting on them",
  approved: "Approved",
  changes: "Changes asked for",
};

export const PROOF_STATUSES: ProofStatus[] = ["sent", "approved", "changes"];
