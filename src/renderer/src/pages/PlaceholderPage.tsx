type PlaceholderPageProps = {
  title: string
  description: string
  bullets: string[]
}

export function PlaceholderPage({ title, description, bullets }: PlaceholderPageProps) {
  return (
    <section className="space-y-6">
      <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-8">
        <p className="text-sm uppercase tracking-[0.3em] text-emerald-400">Fase activa</p>
        <h1 className="mt-3 text-3xl font-semibold text-slate-50">{title}</h1>
        <p className="mt-3 max-w-3xl text-slate-300">{description}</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {bullets.map((bullet) => (
          <article key={bullet} className="rounded-3xl border border-slate-800 bg-slate-950/60 p-5">
            <p className="text-sm font-medium text-slate-100">Pendiente de siguiente fase</p>
            <p className="mt-2 text-sm text-slate-400">{bullet}</p>
          </article>
        ))}
      </div>
    </section>
  )
}
