import { supabase } from '@/lib/supabase'
import type { Foundation, FoundationCategory } from '@/lib/supabase'

export const revalidate = 0

export default async function FundacionesPage() {
  const [{ data: foundationCategories }, { data: foundations }] = await Promise.all([
    supabase.from('foundation_categories').select('*').order('name'),
    supabase
      .from('foundations')
      .select('*')
      .eq('accepts_international', true)
      .order('name'),
  ])

  const cats: FoundationCategory[] = foundationCategories ?? []
  const founds: Foundation[] = foundations ?? []

  const grouped = cats
    .map(cat => ({
      category: cat,
      foundations: founds.filter(f => f.category_id === cat.id),
    }))
    .filter(g => g.foundations.length > 0)

  const uncategorized = founds.filter(f => !f.category_id)

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Fundaciones</h1>
        <p className="text-sm text-gray-500 mt-1">
          Organizaciones que aceptan donaciones internacionales · {founds.length} registrada{founds.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Category anchors */}
      {cats.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-8">
          {cats.map(cat => (
            <a
              key={cat.id}
              href={`#${cat.slug}`}
              className="text-xs bg-white border border-gray-200 rounded-full px-3 py-1 text-gray-600 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 transition-colors"
            >
              {cat.name}
            </a>
          ))}
        </div>
      )}

      {founds.length === 0 ? (
        <p className="text-center py-20 text-gray-400">No hay fundaciones registradas aún.</p>
      ) : (
        <div className="space-y-10">
          {grouped.map(({ category, foundations }) => (
            <section key={category.id} id={category.slug} className="scroll-mt-20">
              <h2 className="text-base font-semibold text-gray-700 uppercase tracking-wide mb-4 pb-2 border-b border-gray-200">
                {category.name}
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {foundations.map(f => (
                  <FoundationCard key={f.id} foundation={f} />
                ))}
              </div>
            </section>
          ))}

          {uncategorized.length > 0 && (
            <section>
              <h2 className="text-base font-semibold text-gray-700 uppercase tracking-wide mb-4 pb-2 border-b border-gray-200">
                Otras Fundaciones
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {uncategorized.map(f => (
                  <FoundationCard key={f.id} foundation={f} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  )
}

function FoundationCard({ foundation }: { foundation: Foundation }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5 flex flex-col">
      <h3 className="font-semibold text-gray-900">{foundation.name}</h3>

      <div className="flex flex-wrap gap-2 mt-2">
        {foundation.focus_area && (
          <span className="text-xs bg-blue-50 text-blue-700 rounded-full px-2 py-0.5">
            {foundation.focus_area}
          </span>
        )}
        {foundation.region && (
          <span className="text-xs bg-gray-100 text-gray-600 rounded-full px-2 py-0.5">
            {foundation.region}
          </span>
        )}
      </div>

      {foundation.notes && (
        <p className="text-sm text-gray-600 mt-3 leading-relaxed">{foundation.notes}</p>
      )}

      {foundation.donation_url && (
        <div className="mt-auto pt-4">
          <a
            href={foundation.donation_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block bg-green-600 text-white text-sm font-medium px-4 py-1.5 rounded-lg hover:bg-green-700 transition-colors"
          >
            Donar →
          </a>
        </div>
      )}
    </div>
  )
}
