import { ImageResponse } from 'next/og'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type CategorySummary = {
  category: string
  slug: string
  zones: string[]
  materials: string[]
  warnings: string[]
  tips: string[]
}

export async function GET() {
  const { data: summary } = await supabase
    .from('daily_summary')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  const megaSynthesis: string = summary?.mega_synthesis ?? 'Información no disponible aún.'
  const conclusions: string = summary?.conclusions ?? ''
  const cats: CategorySummary[] = (summary?.category_summaries ?? []).filter(
    (c: CategorySummary) => c.zones.length > 0 || c.materials.length > 0 || c.warnings.length > 0
  ).slice(0, 6)

  const createdAt = summary?.created_at
    ? new Date(summary.created_at).toLocaleString('es-VE', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'America/Caracas',
      })
    : ''

  // Split categories into two columns
  const leftCats = cats.filter((_, i) => i % 2 === 0)
  const rightCats = cats.filter((_, i) => i % 2 !== 0)

  function CategoryBlock({ cat }: { cat: CategorySummary }) {
    const bullets: string[] = []
    cat.zones.slice(0, 2).forEach(z => bullets.push(`📍 ${z}`))
    cat.materials.slice(0, 2).forEach(m => bullets.push(`📦 ${m}`))
    cat.warnings.slice(0, 1).forEach(w => bullets.push(`⚠️ ${w}`))

    return (
      <div style={{ display: 'flex', flexDirection: 'column', marginBottom: 14 }}>
        <div
          style={{
            color: '#003DA5',
            fontSize: 12,
            fontWeight: 800,
            marginBottom: 4,
            borderLeft: '3px solid #FCD116',
            paddingLeft: 6,
          }}
        >
          {cat.category}
        </div>
        {bullets.slice(0, 3).map((b, i) => (
          <div key={i} style={{ color: '#374151', fontSize: 11, lineHeight: 1.4, marginBottom: 2, paddingLeft: 6 }}>
            {b.slice(0, 70)}
          </div>
        ))}
      </div>
    )
  }

  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          height: '100%',
          backgroundColor: '#f9fafb',
          fontFamily: 'sans-serif',
        }}
      >
        {/* Flag stripe */}
        <div style={{ display: 'flex', height: 10 }}>
          <div style={{ flex: 1, backgroundColor: '#FCD116' }} />
          <div style={{ flex: 1, backgroundColor: '#003DA5' }} />
          <div style={{ flex: 1, backgroundColor: '#CF0921' }} />
        </div>

        {/* Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '14px 40px 10px',
            backgroundColor: '#003DA5',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ color: '#FCD116', fontSize: 13, fontWeight: 900 }}>
              Levantando a Venezuela
            </div>
            <div style={{ color: 'white', fontSize: 22, fontWeight: 900, lineHeight: 1.1 }}>
              ¿Qué se necesita ahora?
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
            <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11 }}>Actualizado</div>
            <div style={{ color: 'white', fontSize: 11, fontWeight: 600 }}>{createdAt}</div>
          </div>
        </div>

        {/* Mega synthesis */}
        <div
          style={{
            display: 'flex',
            backgroundColor: '#FEF9C3',
            borderBottom: '2px solid #FCD116',
            padding: '10px 40px',
            color: '#78350F',
            fontSize: 13,
            fontWeight: 600,
            lineHeight: 1.4,
          }}
        >
          {megaSynthesis.slice(0, 180)}
        </div>

        {/* Category grid */}
        <div style={{ display: 'flex', flex: 1, padding: '14px 40px', gap: 24 }}>
          {/* Left column */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            {leftCats.map((cat, i) => (
              <CategoryBlock key={i} cat={cat} />
            ))}
          </div>

          {/* Divider */}
          <div style={{ width: 1, backgroundColor: '#e5e7eb' }} />

          {/* Right column */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            {rightCats.map((cat, i) => (
              <CategoryBlock key={i} cat={cat} />
            ))}
          </div>
        </div>

        {/* Conclusions */}
        {conclusions ? (
          <div
            style={{
              display: 'flex',
              padding: '8px 40px',
              borderTop: '1px solid #e5e7eb',
              color: '#6b7280',
              fontSize: 11,
              lineHeight: 1.4,
            }}
          >
            <span style={{ fontWeight: 700, color: '#CF0921', marginRight: 4 }}>Resumen:</span>
            {conclusions.slice(0, 200)}
          </div>
        ) : null}

        {/* Footer */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            padding: '8px 40px',
            backgroundColor: '#1f2937',
            color: 'rgba(255,255,255,0.5)',
            fontSize: 10,
          }}
        >
          levantandoavenezuela.vercel.app · Generado automáticamente a partir de recursos comunitarios verificados
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  )
}
