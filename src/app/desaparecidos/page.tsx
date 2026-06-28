import { supabase } from '@/lib/supabase'
import ResourceCard from '../components/ResourceCard'

export const revalidate = 0

const SECTIONS = [
  { name: 'Personas Desaparecidas', slug: 'personas-desaparecidas', color: 'red' },
  { name: 'Personas Encontradas', slug: 'personas-encontradas', color: 'green' },
] as const

export default async function DesaparecidosPage() {
  const { data: cats } = await supabase
    .from('resources_categories')
    .select('id, slug, name')
    .in('slug', ['personas-desaparecidas', 'personas-encontradas'])

  const catMap: Record<string, string> = Object.fromEntries(
    (cats ?? []).map(c => [c.slug, c.id])
  )
  const catIds = Object.values(catMap).filter(Boolean)

  const { data: resources } = catIds.length
    ? await supabase
        .from('resources')
        .select('*, category:resources_categories(id, slug, name)')
        .in('category_id', catIds)
        .not('status', 'eq', 'inactive')
        .order('updated_at', { ascending: false })
    : { data: [] }

  const res = resources ?? []

  const grouped = SECTIONS.map(section => ({
    section,
    resources: res.filter((r: any) => r.category?.slug === section.slug),
  }))

  const total = res.length

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Lista de Desaparecidos</h1>
        <p className="text-sm text-gray-500 mt-1">
          Recursos del directorio · {total} entrada{total !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Anchor nav */}
      <div className="flex gap-2 mb-8 flex-wrap">
        {SECTIONS.map(s => (
          <a
            key={s.slug}
            href={`#${s.slug}`}
            className={`text-xs bg-white border rounded-full px-3 py-1 transition-colors hover:border-${s.color}-200 hover:bg-${s.color}-50 hover:text-${s.color}-700 border-gray-200 text-gray-600`}
          >
            {s.name}
          </a>
        ))}
      </div>

      <div className="space-y-10">
        {grouped.map(({ section, resources }) => (
          <section key={section.slug} id={section.slug} className="scroll-mt-20">
            <h2
              className={`text-base font-semibold uppercase tracking-wide mb-3 pb-2 border-b ${
                section.color === 'red'
                  ? 'text-red-700 border-red-200'
                  : 'text-green-700 border-green-200'
              }`}
            >
              {section.name} · {resources.length}
            </h2>
            {resources.length === 0 ? (
              <p className="text-sm text-gray-400 py-4">
                Sin entradas en esta categoría. Agrega recursos desde el directorio principal.
              </p>
            ) : (
              <div className="space-y-2">
                {resources.map((r: any) => (
                  <ResourceCard key={r.id} resource={r} />
                ))}
              </div>
            )}
          </section>
        ))}
      </div>
    </div>
  )
}
