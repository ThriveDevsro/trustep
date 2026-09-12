import Link from 'next/link'

interface LegalSection {
  title: string
  content: React.ReactNode
}

export function LegalPage({
  title,
  intro,
  sections,
}: {
  title: string
  intro: string
  sections: LegalSection[]
}) {
  return (
    <main className="min-h-screen bg-[#f7f8fa] text-[#020617]">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-[1120px] px-5 py-16 sm:px-8 sm:py-20">
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-bold text-[#020617] transition hover:text-[#2563EB]">← Späť na FeelsOdd</Link>
          <div className="mt-10 grid gap-8 border-t border-slate-200 pt-8 lg:grid-cols-[1fr_auto] lg:items-end">
            <div><p className="text-sm font-semibold text-slate-500">Právne informácie</p><h1 className="mt-4 text-balance text-4xl font-semibold tracking-[-0.055em] sm:text-6xl">{title}</h1></div>
            <p className="text-sm font-semibold text-slate-400">Aktualizované 11. augusta 2026</p>
          </div>
          <p className="mt-7 max-w-3xl text-base leading-8 text-slate-600">{intro}</p>
        </div>
      </section>

      <div className="mx-auto max-w-[860px] px-5 py-14 sm:px-8 lg:py-20">
        <article>
          {sections.map((section, index) => (
            <section key={section.title} id={`section-${index + 1}`} className="scroll-mt-28 border-b border-slate-200 py-10 first:pt-0 last:border-0 last:pb-0">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#2563EB]">{String(index + 1).padStart(2, '0')}</p>
              <h2 className="mt-3 text-2xl font-semibold tracking-[-0.045em] text-[#0A2550] sm:text-3xl">{section.title.replace(/^\d+\.\s*/, '')}</h2>
              <div className="mt-5 space-y-4 text-[15px] leading-7 text-slate-600 sm:text-base [&_a]:font-semibold [&_a]:text-[#0A2550] [&_a]:underline [&_a]:decoration-slate-300 [&_a]:underline-offset-4 [&_strong]:font-bold [&_strong]:text-[#0A2550]">{section.content}</div>
            </section>
          ))}
        </article>
      </div>
    </main>
  )
}
