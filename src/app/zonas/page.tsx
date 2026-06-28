import { supabase } from '@/lib/supabase'
import ResourceCard from '../components/ResourceCard'

export const revalidate = 0

const ZONE_SECTIONS = [
  { name: 'Centros de Acopio', slug: 'centros-acopio' },
  { name: 'Refugios para Niños', slug: 'refugios-ninos' },
  { name: 'Comedores', slug: 'comedores' },
]

export default async function ZonasPage() {
  const { data: cats } = await supabase
    .from('categories')
    .select('id, slug, name')
    .eq('slug', 'refugio-vivienda')

  const catId = cats?.[0]?.id ?? null

  const { data: resources } = catId
    ? await supabase
        .from('resources')
        .select('*')
        .eq('category_id', catId)
        .or('status.eq.active,status.is.null')
        .order('upvotes', { ascending: false })
        .order('updated_at', { ascending: false })
    : { data: [] }

  const res = resources ?? []

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Zonas de Interés</h1>
        <p className="text-sm text-gray-500 mt-1">Centros de acopio, refugios y comedores activos</p>
      </div>

      {/* Category anchors */}
      <div className="flex flex-wrap gap-2 mb-8">
        <a href="#mapa" className="text-xs bg-white border border-gray-200 rounded-full px-3 py-1 text-gray-600 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 transition-colors">
          Mapa Interactivo
        </a>
        {res.length > 0 && (
          <a href="#refugios" className="text-xs bg-white border border-gray-200 rounded-full px-3 py-1 text-gray-600 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 transition-colors">
            Refugios y Vivienda
          </a>
        )}
        {ZONE_SECTIONS.map(z => (
          <a key={z.slug} href={`#${z.slug}`} className="text-xs bg-white border border-gray-200 rounded-full px-3 py-1 text-gray-600 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 transition-colors">
            {z.name}
          </a>
        ))}
      </div>

      {/* Mapa interactivo */}
      <section id="mapa" className="mb-10 scroll-mt-20">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-gray-700 uppercase tracking-wide">Mapa Interactivo</h2>
          <a
            href="https://terremotovenezuela.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-blue-600 hover:underline"
          >
            Abrir en nueva pestaña →
          </a>
        </div>
        <div className="w-full h-96 rounded-xl border border-gray-200 overflow-hidden bg-gray-100">
          <iframe
            src="https://terremotovenezuela.com"
            className="w-full h-full"
            title="Mapa Terremoto Venezuela"
            loading="lazy"
          />
        </div>
        <p className="text-xs text-gray-400 mt-2 text-center">
          Si el mapa no carga, ábrelo directamente en{' '}
          <a href="https://terremotovenezuela.com" target="_blank" rel="noopener noreferrer" className="underline">
            terremotovenezuela.com
          </a>
        </p>
      </section>

      {/* Recursos de refugio/vivienda del directorio */}
      {res.length > 0 && (
        <section id="refugios" className="mb-10 scroll-mt-20">
          <h2 className="text-base font-semibold text-gray-700 uppercase tracking-wide mb-3 pb-2 border-b border-gray-200">
            Refugios y Vivienda
          </h2>
          <div className="space-y-2">
            {res.map(r => (
              <ResourceCard key={r.id} resource={r} />
            ))}
          </div>
        </section>
      )}

      {/* Zonas estáticas — por ahora placeholder */}
      <div className="space-y-10">
        {ZONE_SECTIONS.map(section => (
          <section key={section.slug} id={section.slug} className="scroll-mt-20">
            <h2 className="text-base font-semibold text-gray-700 uppercase tracking-wide mb-3 pb-2 border-b border-gray-200">
              {section.name}
            </h2>
            <p className="text-sm text-gray-400 py-4">
              Próximamente — agrega ubicaciones desde el directorio principal.
            </p>
          </section>
        ))}
      </div>
    </div>
  )
}
