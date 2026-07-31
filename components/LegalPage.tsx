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
    <main className="min-h-screen bg-[#f7f7f5] text-[#111827]">
      <section className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-5xl px-6 py-20 sm:py-28">
          <Link href="/" className="text-sm font-extrabold text-[#ff4f00]">← Späť na TrustStep</Link>
          <h1 className="mt-10 text-4xl font-extrabold tracking-[-0.05em] sm:text-6xl">{title}</h1>
          <p className="mt-6 max-w-3xl text-base font-medium leading-8 text-gray-600">{intro}</p>
          <p className="mt-5 text-xs font-bold text-gray-400">Posledná aktualizácia: 29. júla 2026</p>
        </div>
      </section>

      <div className="mx-auto grid max-w-5xl gap-12 px-6 py-16 lg:grid-cols-[220px_1fr] lg:py-24">
        <nav className="hidden lg:block">
          <div className="sticky top-28 space-y-3">
            {sections.map((section, index) => (
              <a key={section.title} href={`#section-${index + 1}`} className="block text-xs font-bold text-gray-400 transition-colors hover:text-[#111827]">
                {section.title}
              </a>
            ))}
          </div>
        </nav>

        <article className="space-y-14">
          {sections.map((section, index) => (
            <section key={section.title} id={`section-${index + 1}`} className="scroll-mt-28 border-b border-gray-200 pb-14 last:border-0">
              <h2 className="text-2xl font-extrabold tracking-[-0.03em]">{section.title}</h2>
              <div className="mt-5 space-y-4 text-sm font-medium leading-7 text-gray-600">{section.content}</div>
            </section>
          ))}
        </article>
      </div>
    </main>
  )
}
