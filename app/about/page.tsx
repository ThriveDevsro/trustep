export default function AboutPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold text-slate-900">O nás</h1>
      <p className="text-sm text-slate-600 mt-2">TrustStep je vytvorený tímom, ktorý sa venuje kybernetickej bezpečnosti a praktickým riešeniam pre firmy.</p>

      <section className="mt-6 rounded-lg border p-6 bg-white">
        <h3 className="font-semibold">Kontakt</h3>
        <p className="text-sm text-slate-600 mt-2">Máte otázky? Napíšte nám na <a href="mailto:hello@truststep.example" className="text-indigo-600">hello@truststep.example</a>.</p>
      </section>
    </div>
  )
}
