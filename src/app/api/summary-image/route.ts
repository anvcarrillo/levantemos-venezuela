import { ImageResponse } from 'next/og'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type Volunteer = { zone: string; details: string }
type Donation = { location: string; items: string[] }

export async function GET() {
  const { data: summary } = await supabase
    .from('daily_summary')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  const volunteers: Volunteer[] = summary?.volunteers_needed ?? []
  const donations: Donation[] = summary?.donations_needed ?? []
  const megaSynthesis: string = summary?.mega_synthesis ?? 'Información no disponible aún.'
  const conclusions: string = summary?.conclusions ?? ''
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

  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          height: '100%',
          backgroundColor: '#ffffff',
          fontFamily: 'sans-serif',
        }}
      >
        {/* Flag stripe */}
        <div style={{ display: 'flex', height: 14 }}>
          <div style={{ flex: 1, backgroundColor: '#FCD116' }} />
          <div style={{ flex: 1, backgroundColor: '#003DA5' }} />
          <div style={{ flex: 1, backgroundColor: '#CF0921' }} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', padding: '36px 52px', flex: 1 }}>
          {/* Header row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ color: '#003DA5', fontSize: 18, fontWeight: 700 }}>Levantando a Venezuela</div>
              <div style={{ color: '#111827', fontSize: 40, fontWeight: 900, lineHeight: 1.1, marginTop: 4 }}>
                ¿Qué se necesita?
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', marginTop: 6 }}>
              <div style={{ color: '#6b7280', fontSize: 13 }}>Actualizado</div>
              <div style={{ color: '#374151', fontSize: 13, fontWeight: 600 }}>{createdAt}</div>
            </div>
          </div>

          {/* Mega synthesis pill */}
          <div
            style={{
              display: 'flex',
              backgroundColor: '#FEF9C3',
              border: '2px solid #FCD116',
              borderRadius: 12,
              padding: '14px 20px',
              marginBottom: 28,
              color: '#78350F',
              fontSize: 17,
              fontWeight: 600,
              lineHeight: 1.4,
            }}
          >
            {megaSynthesis}
          </div>

          {/* Two columns */}
          <div style={{ display: 'flex', gap: 28, flex: 1 }}>
            {/* Volunteers */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  color: '#003DA5',
                  fontSize: 15,
                  fontWeight: 800,
                  marginBottom: 14,
                  paddingBottom: 8,
                  borderBottom: '2px solid #003DA5',
                }}
              >
                🙋 Voluntarios necesarios
              </div>
              {volunteers.slice(0, 3).map((v, i) => (
                <div key={i} style={{ display: 'flex', flexDirection: 'column', marginBottom: 10 }}>
                  <div style={{ color: '#111827', fontWeight: 700, fontSize: 13 }}>📍 {v.zone}</div>
                  <div style={{ color: '#6b7280', fontSize: 12, marginTop: 2, lineHeight: 1.4 }}>{v.details}</div>
                </div>
              ))}
              {volunteers.length === 0 && (
                <div style={{ color: '#9ca3af', fontSize: 13 }}>Sin datos disponibles</div>
              )}
            </div>

            {/* Donations */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  color: '#CF0921',
                  fontSize: 15,
                  fontWeight: 800,
                  marginBottom: 14,
                  paddingBottom: 8,
                  borderBottom: '2px solid #CF0921',
                }}
              >
                📦 Donaciones urgentes
              </div>
              {donations.slice(0, 3).map((d, i) => (
                <div key={i} style={{ display: 'flex', flexDirection: 'column', marginBottom: 10 }}>
                  <div style={{ color: '#111827', fontWeight: 700, fontSize: 13 }}>📍 {d.location}</div>
                  <div style={{ color: '#6b7280', fontSize: 12, marginTop: 2 }}>
                    {d.items?.slice(0, 4).join(' · ')}
                  </div>
                </div>
              ))}
              {donations.length === 0 && (
                <div style={{ color: '#9ca3af', fontSize: 13 }}>Sin datos disponibles</div>
              )}
            </div>
          </div>

          {/* Conclusions */}
          {conclusions ? (
            <div
              style={{
                display: 'flex',
                borderTop: '1px solid #e5e7eb',
                paddingTop: 16,
                marginTop: 16,
                color: '#374151',
                fontSize: 12,
                lineHeight: 1.5,
              }}
            >
              <span style={{ fontWeight: 700, color: '#CF0921', marginRight: 6 }}>Conclusiones:</span>
              {conclusions.slice(0, 220)}
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            padding: '10px 52px',
            backgroundColor: '#003DA5',
            color: 'rgba(255,255,255,0.65)',
            fontSize: 12,
          }}
        >
          levantandoavenezuela.vercel.app · Información generada automáticamente a partir de recursos comunitarios
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  )
}
