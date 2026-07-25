"use client";

import { useState } from "react";

/**
 * Business inquiry form. Unlike the legacy version this one validates,
 * carries a honeypot field, and posts JSON to a route handler that can
 * rate-limit; reCAPTCHA attaches in the commerce phase.
 */
export function InquiryForm({ businessSlug }: { businessSlug: string }) {
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle",
  );

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());
    setStatus("sending");
    try {
      const res = await fetch("/api/inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, businessSlug }),
      });
      if (!res.ok) throw new Error(String(res.status));
      setStatus("sent");
      form.reset();
    } catch {
      setStatus("error");
    }
  }

  if (status === "sent") {
    return (
      <p className="text-sm font-medium text-ok bg-[#e5f5ec] border border-[#bfe8d2] rounded-[10px] px-4 py-3.5">
        Message sent. The business will reply to the email you provided.
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="grid gap-3.5">
      <div className="grid sm:grid-cols-2 gap-3.5">
        <div>
          <label htmlFor="inq-name" className="text-[12.5px] font-semibold text-body block mb-1.5">
            Your name
          </label>
          <input
            id="inq-name"
            name="name"
            required
            maxLength={128}
            className="w-full text-[14.5px] px-3.5 py-2.5 border border-line-strong rounded-lg focus:outline-none focus:border-navy-950"
          />
        </div>
        <div>
          <label htmlFor="inq-email" className="text-[12.5px] font-semibold text-body block mb-1.5">
            Email
          </label>
          <input
            id="inq-email"
            name="email"
            type="email"
            required
            maxLength={255}
            className="w-full text-[14.5px] px-3.5 py-2.5 border border-line-strong rounded-lg focus:outline-none focus:border-navy-950"
          />
        </div>
      </div>
      <div>
        <label htmlFor="inq-msg" className="text-[12.5px] font-semibold text-body block mb-1.5">
          Message
        </label>
        <textarea
          id="inq-msg"
          name="message"
          required
          minLength={10}
          maxLength={2000}
          rows={4}
          className="w-full text-[14.5px] px-3.5 py-2.5 border border-line-strong rounded-lg focus:outline-none focus:border-navy-950"
        />
      </div>
      {/* Honeypot: humans never see or fill this */}
      <input
        type="text"
        name="company_website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="hidden"
      />
      <button
        type="submit"
        disabled={status === "sending"}
        className="justify-self-start bg-navy-950 text-white font-semibold text-[14.5px] px-6 py-3 rounded-(--radius-btn) hover:bg-navy-800 transition-colors disabled:opacity-60"
      >
        {status === "sending" ? "Sending..." : "Send message"}
      </button>
      {status === "error" && (
        <p className="text-sm text-danger">
          Something went wrong sending your message. Please try again, or call
          the business directly.
        </p>
      )}
    </form>
  );
}
