import { supabase } from '@/lib/supabase'
import AgregarRecursoModal from './components/AgregarRecursoModal'

export const revalidate = 0

export default async function HomePage() {
  const [{ data: categories }, { data: resources }] = await Promise.all([
    supabase.from('categories').select('*').order('name'),
    supabase.from('resources').select('*').order('updated_at', { ascending: false }),
  ])

  const cats = categories ?? []
  const res = resources ?? []

  const grouped = cats
    .map((cat) => ({
      category: cat,
      resources: res.filter((r) => r.category_id === cat.id),
    }))
    .filter((g) => g.resources.length > 0)

  return (
    <div>
      <div className="flex items-start justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold">Directorio de Recursos</h1>
          <p className="text-sm text-gray-500 mt-1">
            Crisis del terremoto en Venezuela · {res.length} recurso{res.length !== 1 ? 's' : ''}
          </p>
        </div>
        <AgregarRecursoModal categories={cats} />
      </div>

      {grouped.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-lg">No hay recursos aún.</p>
          <p className="text-sm mt-1">Sé el primero en agregar uno.</p>
        </div>
      ) : (
        <div className="space-y-10">
          {grouped.map(({ category, resources }) => (
            <section key={category.id}>
              <h2 className="text-base font-semibold text-gray-700 uppercase tracking-wide mb-3 pb-2 border-b border-gray-200">
                {category.name}
              </h2>
              <div className="space-y-2">
                {resources.map((resource) => (
                  <div
                    key={resource.id}
                    className="bg-white rounded-lg border border-gray-200 px-4 py-3 flex items-center justify-between gap-4"
                  >
                    <div className="min-w-0">
                      <a
                        href={resource.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline font-medium text-sm"
                      >
                        {resource.title ?? resource.url}
                      </a>
                      {resource.description && (
                        <p className="text-xs text-gray-500 mt-0.5">{resource.description}</p>
                      )}
                    </div>
                    <span className="text-xs text-gray-400 shrink-0">
                      {new Date(resource.updated_at).toLocaleDateString('es-VE', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
