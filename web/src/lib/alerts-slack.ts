import "server-only";
import { siteOrigin } from "@/lib/origin";
import { KIND_LABEL, type ActivityEvent } from "@/lib/admin-activity";

/**
 * The same events, in a Slack channel.
 *
 * An incoming webhook, which is one POST of JSON and needs no token
 * handling, no scopes and no SDK. Unset means this does nothing, which
 * is the right behaviour for the deploys that do not use Slack.
 *
 * Every event goes here rather than only the urgent ones. A channel is
 * somewhere you look, not something that wakes you, so the cost of a
 * quiet one is nil and a complete record is worth more than a filtered
 * one.
 */

const webhook = () => process.env.SLACK_WEBHOOK_URL?.trim();

export const slackEnabled = () => !!webhook();

export async function slackAlert(event: ActivityEvent): Promise<void> {
  const url = webhook();
  const line = `*${KIND_LABEL[event.kind] ?? event.kind}* ${event.title}${
    event.detail ? `\n${event.detail}` : ""
  }`;

  if (!url) {
    console.log(`[slack preview] would post: ${line.replace(/\n/g, " | ")}`);
    return;
  }

  // A relative href is useless in Slack, where nobody is on the site
  // yet, so it is made absolute or left out.
  const link = event.href ? `${siteOrigin()}${event.href}` : "";

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: link ? `${line}\n${link}` : line,
      }),
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) {
      console.error(
        `[slack] failed: ${res.status} ${(await res.text()).slice(0, 200)}`,
      );
    }
  } catch (e) {
    console.error("[slack] failed:", e);
  }
}
