import Link from "next/link";
import { notFound } from "next/navigation";
import { LEGAL_PAGES } from "@/lib/legal-content";

/**
 * Shared renderer for the ported legal pages. The copy is long, dense
 * and read rarely but linked sitewide, so it gets a single readable
 * column rather than the marketing layout.
 */
export function LegalPage({ slug }: { slug: string }) {
  const page = LEGAL_PAGES[slug];
  if (!page) notFound();

  return (
    <>
      <header className="bg-navy-950 text-white">
        <div className="mx-auto max-w-[760px] px-6 pt-11 pb-12">
          <nav className="text-[12.5px] text-[#67768A] flex gap-2" aria-label="Breadcrumb">
            <Link href="/" className="hover:text-white">
              Home
            </Link>
            <span>/</span>
            <b className="text-white font-semibold">{page.title}</b>
          </nav>
          <h1 className="mt-4 text-[28px] md:text-[38px] font-bold tracking-[-0.03em]">
            {page.title}
          </h1>
        </div>
      </header>

      <div className="mx-auto max-w-[760px] px-6 py-14 grid gap-9">
        {page.sections.map((section, i) => (
          <section key={`${section.heading}-${i}`} className="grid gap-3">
            {section.heading && (
              <h2 className="text-[19px] font-bold tracking-tight">
                {section.heading}
              </h2>
            )}
            {section.items.some((b) => b.type === "li") ? (
              <>
                {section.items
                  .filter((b) => b.type === "p")
                  .map((b, j) => (
                    <p
                      key={`p${j}`}
                      className="text-[15px] text-body leading-[1.75]"
                      dangerouslySetInnerHTML={{ __html: b.text }}
                    />
                  ))}
                <ul className="grid gap-2 pl-5 list-disc marker:text-faint">
                  {section.items
                    .filter((b) => b.type === "li")
                    .map((b, j) => (
                      <li
                        key={`l${j}`}
                        className="text-[15px] text-body leading-[1.7]"
                        dangerouslySetInnerHTML={{ __html: b.text }}
                      />
                    ))}
                </ul>
              </>
            ) : (
              section.items.map((b, j) => (
                <p
                  key={j}
                  className="text-[15px] text-body leading-[1.75]"
                  dangerouslySetInnerHTML={{ __html: b.text }}
                />
              ))
            )}
          </section>
        ))}
      </div>
    </>
  );
}
