import { supabase } from '@/lib/supabase'
import LandingDashboard from './components/LandingDashboard'
import SummaryBanner from './components/SummaryBanner'

export const revalidate = 300

export default async function LandingPage() {
  const [{ count: resourceCount }, { count: foundationCount }, { data: latestSummary }] = await Promise.all([
    supabase
      .from('resources')
      .select('*', { count: 'exact', head: true })
      .or('status.eq.active,status.is.null'),
    supabase
      .from('foundations')
      .select('*', { count: 'exact', head: true })
      .eq('accepts_international', true),
    supabase
      .from('daily_summary')
      .select('mega_synthesis, created_at')
      .order('created_at', { ascending: false })
      .limit(1)
      .single(),
  ])

  const counts = {
    resources: resourceCount ?? 0,
    foundations: foundationCount ?? 0,
    missing: 0,
  }

  return (
    <div>
      {/* Summary banner — only shown once daily_summary has data */}
      {latestSummary?.mega_synthesis && (
        <SummaryBanner
          megaSynthesis={latestSummary.mega_synthesis}
          createdAt={latestSummary.created_at}
        />
      )}

      {/* Banner de emergencia */}
      <div className="bg-[#CF0921] text-white rounded-xl text-center text-sm py-3 px-4 mb-10 flex items-center justify-center gap-2.5">
        <span className="w-2 h-2 bg-white rounded-full animate-pulse shrink-0" />
        <span className="font-medium">Crisis activa — Terremoto Venezuela 2025 · Esta plataforma se actualiza en tiempo real con información de la comunidad</span>
      </div>

      {/* Hero */}
      <div className="text-center mb-14">
        {/* Venezuelan flag stripe */}
        <div className="flex justify-center mb-6">
          <div className="flex rounded-full overflow-hidden h-1.5 w-32">
            <div className="flex-1 bg-[#FCD116]" />
            <div className="flex-1 bg-[#003DA5]" />
            <div className="flex-1 bg-[#CF0921]" />
          </div>
        </div>

        <h1 className="text-5xl font-black leading-tight mb-4">
          <span className="text-gray-900">Levantando a </span>
          <span className="text-[#003DA5] underline decoration-[#FCD116] decoration-4 underline-offset-4">Venezuela</span>
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
    blue: 'text-[#003DA5]',
    green: 'text-emerald-600',
    red: 'text-[#CF0921]',
  }
  return (
    <div className="text-center">
      <p className={`text-4xl font-black ${colors[color]}`}>{value}</p>
      <p className="text-xs text-gray-500 mt-0.5 uppercase tracking-wide font-medium">{label}</p>
    </div>
  )
}
