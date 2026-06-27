import { supabase } from '@/lib/supabase'

export const revalidate = 0

export default async function FundacionesPage() {
  const { data: foundations } = await supabase
    .from('foundations')
    .select('*')
    .eq('accepts_international', true)
    .order('name')

  const lista = foundations ?? []

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Fundaciones</h1>
        <p className="text-sm text-gray-500 mt-1">
          Organizaciones que aceptan donaciones internacionales · {lista.length} registrada{lista.length !== 1 ? 's' : ''}
        </p>
      </div>

      {lista.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-lg">No hay fundaciones registradas aún.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {lista.map((f) => (
            <div key={f.id} className="bg-white rounded-lg border border-gray-200 p-5 flex flex-col">
              <h2 className="font-semibold text-gray-900">{f.name}</h2>

              <div className="flex flex-wrap gap-2 mt-2">
                {f.focus_area && (
                  <span className="text-xs bg-blue-50 text-blue-700 rounded-full px-2 py-0.5">
                    {f.focus_area}
                  </span>
                )}
                {f.region && (
                  <span className="text-xs bg-gray-100 text-gray-600 rounded-full px-2 py-0.5">
                    {f.region}
                  </span>
                )}
              </div>

              {f.notes && (
                <p className="text-sm text-gray-600 mt-3 leading-relaxed">{f.notes}</p>
              )}

              {f.donation_url && (
                <div className="mt-auto pt-4">
                  <a
                    href={f.donation_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block bg-green-600 text-white text-sm font-medium px-4 py-1.5 rounded-lg hover:bg-green-700 transition-colors"
                  >
                    Donar →
                  </a>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
