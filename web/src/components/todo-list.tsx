import Link from "next/link";
import type { Todo } from "@/lib/portal-todos";

/**
 * The to-do list, rendered the same on the dashboard and on its own tab
 * so the two can never disagree about what is outstanding.
 *
 * Overdue items are marked, not shouted. Somebody who has missed a
 * deadline knows it, and a wall of red on the page they log into to fix
 * it is a reason to close the tab.
 */
export function TodoList({ todos }: { todos: Todo[] }) {
  return (
    <div className="grid gap-2.5">
      {todos.map((t) => (
        <div
          key={t.id}
          className={`bg-white border rounded-(--radius-card) p-5 flex gap-4 items-start flex-wrap ${
            t.overdue ? "border-l-[3px] border-l-[#b42318] border-line" : "border-line"
          }`}
        >
          <div className="flex-1 min-w-[240px]">
            <div className="flex items-center gap-2.5 flex-wrap">
              <b className="text-[15px] font-semibold">{t.title}</b>
              {t.overdue && (
                <span className="text-[10.5px] font-bold uppercase tracking-wider text-[#b42318] bg-[#fdf3f2] border border-[#f3c9c4] rounded px-1.5 py-0.5">
                  Past due
                </span>
              )}
            </div>
            <p className="text-[13.5px] text-body mt-1 max-w-[74ch]">{t.detail}</p>
          </div>
          <Link
            href={t.href}
            className="bg-navy-950 text-white text-[13px] font-semibold px-4 py-2.5 rounded-(--radius-btn) hover:bg-navy-800 transition-colors shrink-0"
          >
            {t.action}
          </Link>
        </div>
      ))}
    </div>
  );
}

/** Shown when there is genuinely nothing outstanding. */
export function TodoEmpty() {
  return (
    <div className="bg-white border border-line rounded-(--radius-card) p-8 text-center">
      <b className="text-[15.5px] font-semibold block">Nothing needs you</b>
      <p className="text-[13.5px] text-muted mt-1.5 max-w-[52ch] mx-auto">
        Artwork is in, nothing is outstanding, and your listing is complete.
        We will put something here the moment that changes.
      </p>
    </div>
  );
}
