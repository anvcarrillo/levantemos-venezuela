import { ImageResponse } from 'next/og'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// ─── AyudaEnCamino types & fetcher (for Instagram images) ────────────────────

type AyudaNeed = {
  id: number
  orgId: number
  nombreArticulo: string
  cantidadNecesaria: number
  cantidadComprometida: number
  cantidadCumplida: number
  status: string
  organizacion: {
    nombre: string
    tipo: string
    estado: string
    ciudad: string
    direccion: string
    contactoNombre: string | null
    contactoTelefono: string | null
    verificada: boolean
  }
}

type AyudaOrg = {
  orgId: number
  org: AyudaNeed['organizacion']
  needs: AyudaNeed[]
  activaCount: number
  parcialCount: number
}

function igClip(s: string, max: number) {
  return s.length > max ? s.slice(0, max - 1) + '...' : s
}

async function fetchAyudaOrgs(): Promise<{ orgs: AyudaOrg[]; generatedAt: string }> {
  const generatedAt = new Date().toLocaleString('es-VE', {
    day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'America/Caracas',
  })
  // DEBUG: Return static data while testing Satori rendering
  const staticNeed = (id: number, orgId: number, nombre: string, status: string): AyudaNeed => ({
    id, orgId, nombreArticulo: nombre, cantidadNecesaria: 5, cantidadComprometida: 0, cantidadCumplida: 0, status,
    organizacion: { nombre: 'TEST ORG', tipo: 'centro_acopio', estado: 'Caracas', ciudad: 'Caracas', direccion: 'Av Test 123', contactoNombre: 'Juan', contactoTelefono: '0412-0000000', verificada: true },
  })
  const testOrg: AyudaOrg = { orgId: 1, org: { nombre: 'CENTRO DE ACOPIO PARIMA', tipo: 'centro_acopio', estado: 'Caracas DC', ciudad: 'Caracas', direccion: 'Av Libertador frente Centro Parima', contactoNombre: 'Pedro Garcia', contactoTelefono: '0412-5551234', verificada: true }, needs: [staticNeed(1,1,'Esmeril','activa'), staticNeed(2,1,'Agua mineral x200','activa'), staticNeed(3,1,'Mandarria','activa')], activaCount: 3, parcialCount: 0 }
  const testOrgs: AyudaOrg[] = Array.from({ length: 6 }, (_, i) => ({ ...testOrg, orgId: i + 1, org: { ...testOrg.org, nombre: 'CENTRO ' + String(i + 1), ciudad: i < 3 ? 'Caracas' : 'La Guaira' } }))
  return { orgs: testOrgs, generatedAt }
}


type CategorySummary = {
  category: string
  slug: string
  zones: string[]
  materials: string[]
  warnings: string[]
  tips: string[]
}

function formatVET(isoString: string) {
  return new Date(isoString).toLocaleString('es-VE', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Caracas',
  })
}

function BulletSection({
  label,
  items,
  color,
}: {
  label: string
  items: string[]
  color: string
}) {
  if (!items.length) return null
  return (
    <div style={{ display: 'flex', flexDirection: 'column', marginBottom: 12 }}>
      <div
        style={{
          fontSize: 11,
          fontWeight: 800,
          color,
          textTransform: 'uppercase',
          letterSpacing: 1,
          marginBottom: 4,
        }}
      >
        {label}
      </div>
      {items.slice(0, 4).map((item, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 6, marginBottom: 3 }}>
          <div
            style={{
              width: 6,
              height: 6,
              borderRadius: 3,
              backgroundColor: color,
              marginTop: 5,
              flexShrink: 0,
            }}
          />
          <div style={{ color: '#374151', fontSize: 12, lineHeight: 1.4 }}>
            {item.slice(0, 80)}
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Single-category image (1200x630) ───────────────────────────────────────
function CategoryImage({
  cat,
  createdAt,
}: {
  cat: CategorySummary
  createdAt: string
}) {
  return (
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
          padding: '16px 44px 12px',
          backgroundColor: '#003DA5',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ color: '#FCD116', fontSize: 11, fontWeight: 700 }}>
            Levantando a Venezuela · Resumen de categoría
          </div>
          <div style={{ color: 'white', fontSize: 26, fontWeight: 900, lineHeight: 1.1 }}>
            {cat.category}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
          <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: 10 }}>Generado el</div>
          <div style={{ color: 'white', fontSize: 12, fontWeight: 700 }}>{createdAt}</div>
        </div>
      </div>

      {/* Content — 2 columns */}
      <div style={{ display: 'flex', flex: 1, padding: '24px 44px', gap: 32 }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <BulletSection label="Zonas / Direcciones" items={cat.zones} color="#003DA5" />
          <BulletSection label="Materiales necesarios" items={cat.materials} color="#CF0921" />
        </div>
        <div style={{ width: 1, backgroundColor: '#e5e7eb' }} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <BulletSection label="Advertencias" items={cat.warnings} color="#D97706" />
          <BulletSection label="Consejos" items={cat.tips} color="#059669" />
        </div>
      </div>

      {/* Footer */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          padding: '9px 44px',
          backgroundColor: '#1f2937',
          color: 'rgba(255,255,255,0.45)',
          fontSize: 10,
        }}
      >
        levantandoavenezuela.vercel.app · Generado automáticamente a partir de recursos comunitarios verificados
      </div>
    </div>
  )
}

// ─── Full summary image (all categories, 1200x630) ───────────────────────────
function FullImage({
  megaSynthesis,
  cats,
  conclusions,
  createdAt,
}: {
  megaSynthesis: string
  cats: CategorySummary[]
  conclusions: string
  createdAt: string
}) {
  const leftCats = cats.filter((_, i) => i % 2 === 0)
  const rightCats = cats.filter((_, i) => i % 2 !== 0)

  function CategoryBlock({ cat }: { cat: CategorySummary }) {
    const bullets: string[] = [
      ...cat.zones.slice(0, 2).map(z => `📍 ${z}`),
      ...cat.materials.slice(0, 2).map(m => `📦 ${m}`),
      ...cat.warnings.slice(0, 1).map(w => `⚠️ ${w}`),
    ]
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
          <div
            key={i}
            style={{ color: '#374151', fontSize: 11, lineHeight: 1.4, marginBottom: 2, paddingLeft: 6 }}
          >
            {b.slice(0, 70)}
          </div>
        ))}
      </div>
    )
  }

  return (
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
      <div style={{ display: 'flex', height: 10 }}>
        <div style={{ flex: 1, backgroundColor: '#FCD116' }} />
        <div style={{ flex: 1, backgroundColor: '#003DA5' }} />
        <div style={{ flex: 1, backgroundColor: '#CF0921' }} />
      </div>

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
          <div style={{ color: '#FCD116', fontSize: 13, fontWeight: 900 }}>Levantando a Venezuela</div>
          <div style={{ color: 'white', fontSize: 22, fontWeight: 900, lineHeight: 1.1 }}>
            ¿Qué se necesita ahora?
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
          <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: 10 }}>Generado el</div>
          <div style={{ color: 'white', fontSize: 11, fontWeight: 700 }}>{createdAt}</div>
        </div>
      </div>

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

      <div style={{ display: 'flex', flex: 1, padding: '14px 40px', gap: 24 }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {leftCats.map((cat, i) => (
            <CategoryBlock key={i} cat={cat} />
          ))}
        </div>
        <div style={{ width: 1, backgroundColor: '#e5e7eb' }} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {rightCats.map((cat, i) => (
            <CategoryBlock key={i} cat={cat} />
          ))}
        </div>
      </div>

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

      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          padding: '8px 40px',
          backgroundColor: '#1f2937',
          color: 'rgba(255,255,255,0.45)',
          fontSize: 10,
        }}
      >
        levantandoavenezuela.vercel.app · Generado automáticamente a partir de recursos comunitarios verificados
      </div>
    </div>
  )
}

// ─── Route handler ────────────────────────────────────────────────────────────
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const slug = searchParams.get('slug')
  const format = searchParams.get('format')

  // ── Instagram portrait image (1080×1350) ──
  if (format === 'instagram') {
    // Step 3: test fetchAyudaOrgs() with static data
    try {
      const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
      const { orgs, generatedAt } = await fetchAyudaOrgs()
      return new Response(JSON.stringify({ ok: true, orgsCount: orgs.length, firstOrg: orgs[0]?.org.nombre, generatedAt, page }), {
        headers: { 'Content-Type': 'application/json' },
      })
    } catch (e) {
      return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { 'Content-Type': 'application/json' } })
    }
  }

  const { data: summary } = await supabase
    .from('daily_summary')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  const createdAt = summary?.created_at ? formatVET(summary.created_at) : ''
  const cats: CategorySummary[] = (summary?.category_summaries ?? []).filter(
    (c: CategorySummary) =>
      c.zones.length > 0 || c.materials.length > 0 || c.warnings.length > 0 || c.tips.length > 0
  )

  // ── Category-specific image ──
  if (slug) {
    const cat = cats.find(c => c.slug === slug)
    if (!cat) {
      return new Response('Category not found', { status: 404 })
    }
    return new ImageResponse(
      <CategoryImage cat={cat} createdAt={createdAt} />,
      { width: 1200, height: 630 }
    )
  }

  // ── Full summary image ──
  return new ImageResponse(
    <FullImage
      megaSynthesis={summary?.mega_synthesis ?? 'Información no disponible aún.'}
      cats={cats.slice(0, 6)}
      conclusions={summary?.conclusions ?? ''}
      createdAt={createdAt}
    />,
    { width: 1200, height: 630 }
  )
}
