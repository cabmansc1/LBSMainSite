import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getPortalContext } from "@/lib/portal";
import { getPortalTodos } from "@/lib/portal-todos";
import { missingProfileFields } from "@/lib/profile";
import { TodoList, TodoEmpty } from "@/components/todo-list";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "To do",
  robots: { index: false, follow: false },
};

export default async function AccountTodosPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const ctx = await getPortalContext(session);
  const gaps = await missingProfileFields(session.email).catch(() => []);
  const todos = await getPortalTodos(
    ctx,
    gaps.some((g) => g.key === "phone"),
  );

  return (
    <div className="max-w-[860px]">
      <div className="mb-5">
        <h1 className="text-[22px] font-bold tracking-[-0.025em]">To do</h1>
        <p className="text-sm text-muted mt-1 max-w-[70ch]">
          Everything waiting on you, most urgent first. Deadlines that have
          already passed come to the top.
        </p>
      </div>

      {/* A data source being down means we cannot see the campaigns the
          list is mostly built from, so say so rather than showing a
          reassuring empty state. */}
      {ctx.warnings.map((w) => (
        <p
          key={w}
          className="mb-4 text-[13px] text-body bg-surface border border-line rounded-[10px] px-4 py-2.5"
        >
          {w} Anything about your cards may be missing from this list.
        </p>
      ))}

      {todos.length === 0 ? <TodoEmpty /> : <TodoList todos={todos} />}
    </div>
  );
}
