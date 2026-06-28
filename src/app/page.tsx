import { supabase } from '@/lib/supabase'
import AgregarRecursoModal from './components/AgregarRecursoModal'
import ResourceDirectory from './components/ResourceDirectory'

export const revalidate = 0

export default async function HomePage() {
  const [{ data: categories }, { data: resources }] = await Promise.all([
    supabase.from('categories').select('*').order('name'),
    supabase
      .from('resources')
      .select('*')
      .neq('status', 'inactive')
      .order('upvotes', { ascending: false })
      .order('updated_at', { ascending: false }),
  ])

  const cats = categories ?? []
  const res = resources ?? []

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
      <ResourceDirectory categories={cats} resources={res} />
    </div>
  )
}
