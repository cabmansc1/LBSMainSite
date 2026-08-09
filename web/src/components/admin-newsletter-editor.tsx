"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { AudienceGroup } from "@/lib/newsletter-audience";

export type EditorIssue = {
  id: number;
  status: string;
  builtFor: string;
  sendCount: number;
  sentAt?: string;
  groups: AudienceGroup[];
  leadsMonths: number;
  zones: string[];
  content: {
    subject: string;
    preheader: string;
    intro: string;
    news: string;
    print: string;
    signoff: string;
    story: { title: string; body: string };
    cards: {
      cardName: string;
      mailMonth: string;
      spotsLeft: number;
      spotsTotal: number;
      artworkDeadline?: string;
      openCategories: string[];
      moreCategories: number;
    }[];
  };
};

const GROUP_LABELS: { value: AudienceGroup; label: string; hint: string }[] = [
  {
    value: "current",
    label: "Current advertisers",
    hint: "On a card that has not mailed",
  },
  { value: "past", label: "Past advertisers", hint: "Bought before, nothing upcoming" },
  { value: "directory", label: "Directory listings", hint: "Live listing, no card" },
  { value: "leads", label: "Enquiries", hint: "Asked, never bought" },
];

/**
 * Reading and sending one issue.
 *
 * The assembled cards are shown but not editable. They are the record of
 * what was true when the issue was built, and an issue that has gone out
 * has to keep saying what it said. Everything written by hand, the intro
 * and the story and the sign-off, is editable right up to the send.
 */
export function AdminNewsletterEditor({
  issue,
  counts,
  total,
  suppressed,
  mcReadable,
  previewAs,
  mcZones,
  outOfArea,
}: {
  issue: EditorIssue;
  counts: Record<AudienceGroup, number>;
  total: number;
  suppressed: number;
  mcReadable: boolean;
  /** Whoever the preview beside this is rendering, so a test matches it. */
  previewAs?: string;
  /** Every zone Mission Control has cards in, known to the site or not. */
  mcZones: { slug: string; name: string; cards: number; known: boolean }[];
  outOfArea: number;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [form, setForm] = useState(issue.content);
  const [groups, setGroups] = useState<AudienceGroup[]>(issue.groups);
  const [months, setMonths] = useState(issue.leadsMonths);
  const [zones, setZones] = useState<string[]>(issue.zones);
  const [confirming, setConfirming] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const sent = issue.status === "sent";
  const cancelled = issue.status === "cancelled";
  const locked = sent || cancelled;

  const field =
    "w-full text-[13.5px] px-3.5 py-2.5 border border-line-strong rounded-[10px] bg-white focus:outline-none focus:border-navy-950";
  const label = "text-[11px] uppercase tracking-wider text-muted font-semibold";

  async function send(
    body: Record<string, unknown>,
    tag: string,
  ): Promise<boolean> {
    setBusy(tag);
    setError("");
    setNote("");
    try {
      const res = await fetch("/api/admin/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: issue.id, ...body }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error ?? "That did not work.");
      if (body.action === "test") {
        setNote(
          `Test sent to ${j.to}, rendered as ${j.as}. Nobody else got it.`,
        );
      } else if (body.action === "send") {
        setNote(
          j.done
            ? `Sent to ${j.sent} ${j.sent === 1 ? "address" : "addresses"}.${
                j.failed ? ` ${j.failed} did not go through.` : ""
              }`
            : `Sent ${j.sent} so far. Press Send again to carry on with the rest.`,
        );
      } else if (body.action === "save") {
        setNote("Saved.");
      }
      setConfirming(false);
      router.refresh();
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "That did not work.");
      return false;
    } finally {
      setBusy("");
    }
  }

  /**
   * Saves first, then sends the test.
   *
   * The send path reads what is stored, not what is on screen, so a
   * test of unsaved wording would be a test of the wrong email. Saving
   * is skipped once an issue is locked, where there is nothing to save
   * and the attempt would fail.
   */
  async function sendTest() {
    if (!locked) {
      const saved = await send(
        { action: "save", content: form, groups, leadsMonths: months, zones },
        "test",
      );
      if (!saved) return;
    }
    await send({ action: "test", as: previewAs }, "test");
  }

  async function remove() {
    setBusy("delete");
    setError("");
    try {
      const res = await fetch("/api/admin/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: issue.id, action: "delete" }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error ?? "That did not delete.");
      // Straight to the list: staying on the page of something that no
      // longer exists would just 404 on the next refresh.
      router.push("/admin/newsletter");
    } catch (e) {
      setError(e instanceof Error ? e.message : "That did not delete.");
      setBusy("");
      setConfirmingDelete(false);
    }
  }

  const toggleZone = (slug: string) =>
    setZones((cur) =>
      cur.includes(slug) ? cur.filter((z) => z !== slug) : [...cur, slug],
    );

  const toggle = (g: AudienceGroup) =>
    setGroups((cur) =>
      cur.includes(g) ? cur.filter((x) => x !== g) : [...cur, g],
    );

  return (
    <div className="grid gap-5">
      {error && (
        <p className="text-[13px] text-danger bg-[#fdeeee] border border-[#f5c9c9] rounded-lg px-4 py-2.5">
          {error}
        </p>
      )}
      {note && (
        <p className="text-[13px] text-brand-deep bg-brand-tint border border-line rounded-lg px-4 py-2.5">
          {note}
        </p>
      )}

      {sent && (
        <p className="text-[13px] bg-[#E7F3EC] border border-[#c9e3d3] text-[#1F6B45] rounded-lg px-4 py-2.5">
          Sent to {issue.sendCount}{" "}
          {issue.sendCount === 1 ? "address" : "addresses"}
          {issue.sentAt ? ` on ${issue.sentAt}` : ""}. Nothing here can be
          changed now.
        </p>
      )}
      {!mcReadable && !locked && (
        <p className="text-[13px] bg-[#fdeeee] border border-[#f5c9c9] text-danger rounded-lg px-4 py-2.5">
          Mission Control cannot be reached, so advertiser details are missing
          rather than empty. Sending is blocked until it answers again.
        </p>
      )}

      {/* -------- written by hand -------- */}
      <div className="border border-line rounded-(--radius-card) bg-white p-5 grid gap-3.5">
        <b className="text-[15px]">What you write</b>

        <label className="grid gap-1.5">
          <span className={label}>Subject line</span>
          <input
            value={form.subject}
            disabled={locked}
            onChange={(e) => setForm({ ...form, subject: e.target.value })}
            className={field}
          />
        </label>

        <label className="grid gap-1.5">
          <span className={label}>Preview line</span>
          <input
            value={form.preheader}
            disabled={locked}
            onChange={(e) => setForm({ ...form, preheader: e.target.value })}
            className={field}
          />
          <span className="text-[12px] text-muted">
            The grey text after the subject in an inbox.
          </span>
        </label>

        <label className="grid gap-1.5">
          <span className={label}>Opening</span>
          <textarea
            value={form.intro}
            rows={3}
            disabled={locked}
            onChange={(e) => setForm({ ...form, intro: e.target.value })}
            className={field}
          />
        </label>

        <div className="grid sm:grid-cols-2 gap-3.5">
          <label className="grid gap-1.5">
            <span className={label}>Story heading</span>
            <input
              value={form.story.title}
              disabled={locked}
              placeholder="How Cane Bay Roofing books from mail"
              onChange={(e) =>
                setForm({ ...form, story: { ...form.story, title: e.target.value } })
              }
              className={field}
            />
          </label>
          <label className="grid gap-1.5">
            <span className={label}>What&rsquo;s new</span>
            <input
              value={form.news}
              disabled={locked}
              placeholder="Directory profiles got photo galleries"
              onChange={(e) => setForm({ ...form, news: e.target.value })}
              className={field}
            />
          </label>
        </div>

        <label className="grid gap-1.5">
          <span className={label}>Story</span>
          <textarea
            value={form.story.body}
            rows={4}
            disabled={locked}
            onChange={(e) =>
              setForm({ ...form, story: { ...form.story, body: e.target.value } })
            }
            className={field}
          />
          <span className="text-[12px] text-muted">
            Leave both story boxes empty to drop the section entirely.
          </span>
        </label>

        <label className="grid gap-1.5">
          <span className={label}>Printing</span>
          <textarea
            value={form.print}
            rows={3}
            disabled={locked}
            onChange={(e) => setForm({ ...form, print: e.target.value })}
            className={field}
          />
          <span className="text-[12px] text-muted">
            Appears in every issue. Clear it to drop the section from this one.
          </span>
        </label>

        <label className="grid gap-1.5">
          <span className={label}>Sign-off</span>
          <textarea
            value={form.signoff}
            rows={2}
            disabled={locked}
            onChange={(e) => setForm({ ...form, signoff: e.target.value })}
            className={field}
          />
        </label>
      </div>

      {/* -------- assembled -------- */}
      <div className="border border-line rounded-(--radius-card) bg-white p-5 grid gap-3">
        <div>
          <b className="text-[15px]">What the site filled in</b>
          <p className="text-[12.5px] text-muted mt-0.5">
            Taken from Mission Control when this issue was built. Fixed now, so
            what went out stays what went out.
          </p>
        </div>
        {issue.content.cards.length === 0 ? (
          <p className="text-[13px] text-muted">
            No open cards were found when this was built, so the email has no
            availability section.
          </p>
        ) : (
          <div className="grid gap-2">
            {issue.content.cards.map((c, i) => (
              <div
                key={i}
                className="border border-line rounded-[10px] px-3.5 py-3 text-[13.5px]"
              >
                <b>{c.cardName}</b>
                <span className="text-muted">
                  {" "}
                  &middot; mails {c.mailMonth}
                  {c.spotsTotal > 0
                    ? ` · ${c.spotsLeft} of ${c.spotsTotal} spots left`
                    : ""}
                  {c.artworkDeadline ? ` · artwork ${c.artworkDeadline}` : ""}
                </span>
                {c.openCategories.length > 0 && (
                  <p className="text-[12.5px] text-muted mt-1">
                    Open: {c.openCategories.join(", ")}
                    {c.moreCategories ? ` and ${c.moreCategories} more` : ""}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* -------- audience -------- */}
      <div className="border border-line rounded-(--radius-card) bg-white p-5 grid gap-3.5">
        <b className="text-[15px]">Who gets it</b>
        <div className="grid sm:grid-cols-2 gap-2.5">
          {GROUP_LABELS.map((g) => (
            <label
              key={g.value}
              className="flex items-start gap-2.5 border border-line rounded-[10px] px-3.5 py-3"
            >
              <input
                type="checkbox"
                checked={groups.includes(g.value)}
                disabled={locked}
                onChange={() => toggle(g.value)}
                className="mt-1"
              />
              <span>
                <b className="text-[13.5px]">{g.label}</b>
                <span className="block text-[12px] text-muted">{g.hint}</span>
                <span className="block text-[12px] text-muted num">
                  {counts[g.value]} on the list
                </span>
              </span>
            </label>
          ))}
        </div>

        {groups.includes("leads") && (
          <label className="grid gap-1.5 max-w-[280px]">
            <span className={label}>How far back for enquiries</span>
            <select
              value={months}
              disabled={locked}
              onChange={(e) => setMonths(Number(e.target.value))}
              className={field}
            >
              {[3, 6, 12, 24, 36].map((m) => (
                <option key={m} value={m}>
                  {m} months
                </option>
              ))}
            </select>
            <span className="text-[12px] text-muted">
              Somebody who asked once, years ago, is where spam complaints come
              from.
            </span>
          </label>
        )}

        {mcZones.length > 0 && (
          <div className="grid gap-2">
            <span className={label}>Which areas this issue is for</span>
            <p className="text-[12px] text-muted max-w-[62ch]">
              An advertiser is included when one of their cards is in a ticked
              area. Directory listings and enquiries are always included, since
              they are not tied to a card.
            </p>
            <div className="grid sm:grid-cols-2 gap-1.5">
              {mcZones.map((z) => (
                <label
                  key={z.slug}
                  className={`flex items-center gap-2 text-[13px] border rounded-[9px] px-3 py-2 ${
                    z.known ? "border-line" : "border-[#f3ddbb] bg-cta-tint"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={zones.includes(z.slug)}
                    disabled={locked}
                    onChange={() => toggleZone(z.slug)}
                  />
                  <span>
                    {z.name}
                    <span className="text-muted num"> · {z.cards}</span>
                    {!z.known && (
                      <span className="block text-[11.5px] text-[#7a4a00]">
                        Not a zone this site sells
                      </span>
                    )}
                  </span>
                </label>
              ))}
            </div>
            {outOfArea > 0 && (
              <p className="text-[12.5px] text-muted">
                {outOfArea}{" "}
                {outOfArea === 1 ? "advertiser is" : "advertisers are"} left out
                because none of their cards are in a ticked area.
              </p>
            )}
          </div>
        )}

        <p className="text-[13px]">
          <b className="num">{total}</b>{" "}
          {total === 1 ? "address" : "addresses"} after folding duplicates
          {suppressed > 0 && (
            <span className="text-muted num">
              {" "}
              &middot; {suppressed} unsubscribed and skipped
            </span>
          )}
        </p>
      </div>

      {/* -------- delete -------- */}
      {/* Outside the actions block, which hides once an issue is locked.
          A cancelled issue is locked and still deletable; nothing that
          reached an inbox ever is. */}
      {issue.status !== "sent" && issue.status !== "sending" && (
        <div className="border border-line rounded-(--radius-card) bg-white p-5 grid gap-2.5 justify-items-start">
          <b className="text-[15px]">Throw this draft away</b>
          <p className="text-[13px] text-muted max-w-[62ch]">
            Removes it completely. Only ever possible while nobody has
            received it: once an issue has gone out it stays, as the record
            of what was sent.
          </p>
          {confirmingDelete ? (
            <span className="flex items-center gap-2.5 flex-wrap">
              <span className="text-[13px] font-semibold">
                Delete it for good?
              </span>
              <button
                type="button"
                disabled={busy !== ""}
                onClick={() => void remove()}
                className="text-[13px] font-semibold px-4 py-2.5 rounded-[9px] bg-danger text-white disabled:opacity-50"
              >
                {busy === "delete" ? "Deleting" : "Yes, delete it"}
              </button>
              <button
                type="button"
                onClick={() => setConfirmingDelete(false)}
                className="text-[13px] px-3 py-2.5 rounded-[9px] text-muted"
              >
                Keep it
              </button>
            </span>
          ) : (
            <button
              type="button"
              disabled={busy !== ""}
              onClick={() => setConfirmingDelete(true)}
              className="text-[13px] font-semibold px-4 py-2.5 rounded-[9px] border border-danger text-danger bg-white disabled:opacity-50"
            >
              Delete this draft
            </button>
          )}
        </div>
      )}

      {/* -------- test -------- */}
      {/* Outside the block below, so a sent issue can still be mailed to
          yourself to see exactly what went out. */}
      <div className="border border-line rounded-(--radius-card) bg-white p-5 grid gap-2.5 justify-items-start">
        <b className="text-[15px]">Check how it looks</b>
        <p className="text-[13px] text-muted max-w-[62ch]">
          Sends one copy to your own address, rendered with the cards of
          whoever the preview is showing, so the personal section is real
          rather than empty. It does not count as a send: nobody else gets it,
          and the actual send will still include everyone.
        </p>
        <button
          type="button"
          disabled={busy !== ""}
          onClick={() => void sendTest()}
          className="text-[13px] font-semibold px-4 py-2.5 rounded-[9px] bg-navy-950 text-white disabled:opacity-50"
        >
          {busy === "test" ? "Sending test" : "Send a test to me"}
        </button>
        {!locked && (
          <p className="text-[12px] text-muted">
            Saves the draft first, so the test is of what you are looking at.
          </p>
        )}
      </div>

      {/* -------- actions -------- */}
      {!locked && (
        <div className="flex gap-2.5 flex-wrap items-center">
          <button
            type="button"
            disabled={busy !== ""}
            onClick={() =>
              send(
                { action: "save", content: form, groups, leadsMonths: months, zones },
                "save",
              )
            }
            className="text-[13px] font-semibold px-4 py-2.5 rounded-[9px] border border-line-strong bg-white disabled:opacity-50"
          >
            {busy === "save" ? "Saving" : "Save draft"}
          </button>

          {confirming ? (
            <>
              <span className="text-[13px] font-semibold">
                Send to {total} {total === 1 ? "address" : "addresses"}?
              </span>
              <button
                type="button"
                disabled={busy !== "" || total === 0 || !mcReadable}
                onClick={() => send({ action: "send" }, "send")}
                className="text-[13px] font-semibold px-4 py-2.5 rounded-[9px] bg-cta text-white disabled:opacity-50"
              >
                {busy === "send" ? "Sending" : "Yes, send it"}
              </button>
              <button
                type="button"
                onClick={() => setConfirming(false)}
                className="text-[13px] px-3 py-2.5 rounded-[9px] text-muted"
              >
                Cancel
              </button>
            </>
          ) : (
            <button
              type="button"
              disabled={busy !== "" || total === 0 || !mcReadable}
              onClick={() => setConfirming(true)}
              className="text-[13px] font-semibold px-4 py-2.5 rounded-[9px] bg-navy-950 text-white disabled:opacity-50"
            >
              Send
            </button>
          )}

        </div>
      )}

      {!locked && (
        <p className="text-[12.5px] text-muted max-w-[74ch]">
          Save before sending if you have changed anything: the send uses what
          is stored, not what is on screen. If a send stops part way through,
          press Send again and it carries on from where it stopped rather than
          mailing anyone twice.
        </p>
      )}
    </div>
  );
}
