export default function FeaturesPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold text-slate-900">Funkcie</h1>
      <p className="text-sm text-slate-600 mt-2">Prehľad hlavných schopností TrustStep.</p>

      <ul className="mt-6 space-y-4">
        <li className="rounded-lg border p-4 bg-white">
          <h3 className="font-semibold">AI-detekcia podvodov</h3>
          <p className="text-sm text-slate-600">Analyzujeme text a URL na známky phishingu a podvodných vzorov.</p>
        </li>
        <li className="rounded-lg border p-4 bg-white">
          <h3 className="font-semibold">Integrácie</h3>
          <p className="text-sm text-slate-600">Emailové, SMS a telefonické overenie s jednoduchým API.</p>
        </li>
        <li className="rounded-lg border p-4 bg-white">
          <h3 className="font-semibold">Reporty a audit</h3>
          <p className="text-sm text-slate-600">Export výsledkov a história pre interné procesy.</p>
        </li>
      </ul>
    </div>
  )
}
