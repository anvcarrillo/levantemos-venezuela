import { supabase } from '@/lib/supabase'
import LandingDashboard from './components/LandingDashboard'

export const revalidate = 60

export default async function LandingPage() {
  const [
    { count: resourceCount },
    { count: foundationCount },
    { data: missingCats },
  ] = await Promise.all([
    supabase
      .from('resources')
      .select('*', { count: 'exact', head: true })
      .or('status.eq.active,status.is.null'),
    supabase
      .from('foundations')
      .select('*', { count: 'exact', head: true })
      .eq('accepts_international', true),
    supabase
      .from('categories')
      .select('id')
      .in('slug', ['personas-desaparecidas', 'personas-encontradas']),
  ])

  const missingCatIds = (missingCats ?? []).map(c => c.id)
  const { count: missingCount } = missingCatIds.length
    ? await supabase
        .from('resources')
        .select('*', { count: 'exact', head: true })
        .in('category_id', missingCatIds)
        .or('status.eq.active,status.is.null')
    : { count: 0 }

  const counts = {
    resources: resourceCount ?? 0,
    foundations: foundationCount ?? 0,
    missing: missingCount ?? 0,
  }

  return (
    <div>
      {/* Banner de emergencia */}
      <div className="bg-red-600 text-white rounded-xl text-center text-sm py-3 px-4 mb-10 flex items-center justify-center gap-2.5">
        <span className="w-2 h-2 bg-white rounded-full animate-pulse shrink-0" />
        <span className="font-medium">Crisis activa — Terremoto Venezuela 2025 · Esta plataforma se actualiza en tiempo real con información de la comunidad</span>
      </div>

      {/* Hero */}
      <div className="text-center mb-14">
        <h1 className="text-5xl font-black text-gray-900 leading-tight mb-4">
          Levantando a Venezuela
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed">
          Directorio unificado de recursos, fundaciones e iniciativas para la crisis del terremoto.
          Información verificada y actualizada por la comunidad venezolana.
        </p>

        {/* Stats */}
        <div className="flex items-center justify-center gap-10 mt-10">
          <StatPill value={counts.resources} label="recursos" color="blue" />
          <div className="w-px h-10 bg-gray-200" />
          <StatPill value={counts.foundations} label="fundaciones" color="green" />
          {counts.missing > 0 && (
            <>
              <div className="w-px h-10 bg-gray-200" />
              <StatPill value={counts.missing} label="reportes" color="red" />
            </>
          )}
        </div>
      </div>

      {/* Dashboard animado */}
      <LandingDashboard counts={counts} />

      {/* Footer note */}
      <p className="text-center text-xs text-gray-400 mt-12">
        Esta plataforma es de código abierto y mantenida por voluntarios.
        Si tienes información que agregar, usa el botón &ldquo;+ Agregar recurso&rdquo; en el directorio.
      </p>
    </div>
  )
}

function StatPill({
  value,
  label,
  color,
}: {
  value: number
  label: string
  color: 'blue' | 'green' | 'red'
}) {
  const colors = {
    blue: 'text-blue-700',
    green: 'text-green-700',
    red: 'text-red-700',
  }
  return (
    <div className="text-center">
      <p className={`text-4xl font-black ${colors[color]}`}>{value}</p>
      <p className="text-xs text-gray-500 mt-0.5 uppercase tracking-wide font-medium">{label}</p>
    </div>
  )
}
