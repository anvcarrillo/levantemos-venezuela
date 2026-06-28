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
  try {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 14000)
    const headers = { 'User-Agent': 'Mozilla/5.0 Chrome/125', 'Accept': 'application/json', 'Referer': 'https://ayudaencamino.com/organizaciones' }
    const [r1, r2] = await Promise.allSettled([
      fetch('https://ayudaencamino.com/api/needs?urgencia=critica&status=activa', { cache: 'no-store', signal: ctrl.signal, headers }),
      fetch('https://ayudaencamino.com/api/needs?urgencia=critica&status=parcial', { cache: 'no-store', signal: ctrl.signal, headers }),
    ])
    clearTimeout(timer)
    const all: AyudaNeed[] = []
    if (r1.status === 'fulfilled' && r1.value.ok) all.push(...(await r1.value.json() as AyudaNeed[]))
    if (r2.status === 'fulfilled' && r2.value.ok) all.push(...(await r2.value.json() as AyudaNeed[]))
    const seen = new Set<number>()
    const unique = all.filter(n => { if (seen.has(n.id)) return false; seen.add(n.id); return true })
    const byOrg = new Map<number, AyudaOrg>()
    for (const n of unique) {
      if (!byOrg.has(n.orgId)) byOrg.set(n.orgId, { orgId: n.orgId, org: n.organizacion, needs: [], activaCount: 0, parcialCount: 0 })
      const g = byOrg.get(n.orgId)!
      g.needs.push(n)
      if (n.status === 'activa') { g.activaCount++ } else { g.parcialCount++ }
    }
    return { orgs: [...byOrg.values()].sort((a, b) => b.needs.length - a.needs.length), generatedAt }
  } catch {
    return { orgs: [], generatedAt }
  }
}

// ─── Instagram portrait image (1080×1350) ─────────────────────────────────────

function InstagramPage({
  orgs,
  pageOrgs,
  page,
  totalPages,
  generatedAt,
  rowH,
  totalNeeds,
}: {
  orgs: AyudaOrg[]
  pageOrgs: AyudaOrg[]
  page: number
  totalPages: number
  generatedAt: string
  rowH: number
  totalNeeds: number
}) {
  const CW = [160, 148, 200, 128, 68, 148, 148]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', backgroundColor: '#ffffff', fontFamily: 'sans-serif' }}>

      {/* Flag stripe */}
      <div style={{ display: 'flex', height: 8 }}>
        <div style={{ flex: 1, backgroundColor: '#FCD116' }} />
        <div style={{ flex: 1, backgroundColor: '#003DA5' }} />
        <div style={{ flex: 1, backgroundColor: '#CF0921' }} />
      </div>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 40px', height: 82, backgroundColor: '#003DA5' }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ color: '#FCD116', fontSize: 12, fontWeight: 900 }}>Levantando a Venezuela - Coordinacion de Voluntarios</div>
          <div style={{ color: '#ffffff', fontSize: 20, fontWeight: 900, lineHeight: 1.1, marginTop: 2 }}>Centros con Necesidades Criticas</div>
          <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 9, marginTop: 3 }}>ayudaencamino.com - {orgs.length} organizaciones - {totalNeeds} items</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
          <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 8 }}>Generado el</div>
          <div style={{ color: '#ffffff', fontSize: 9, fontWeight: 700 }}>{generatedAt}</div>
          <div style={{ display: 'flex', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 20, padding: '2px 10px', marginTop: 5 }}>
            <div style={{ color: '#ffffff', fontSize: 9, fontWeight: 700 }}>{page} / {totalPages}</div>
          </div>
        </div>
      </div>

      {/* Column headers */}
      <div style={{ display: 'flex', height: 30, backgroundColor: '#111827', paddingLeft: 40 }}>
        <div style={{ display: 'flex', alignItems: 'center', width: CW[0], paddingLeft: 6, borderRight: '1px solid #374151' }}>
          <div style={{ color: '#FCD116', fontSize: 8, fontWeight: 800 }}>CENTRO</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', width: CW[1], paddingLeft: 6, borderRight: '1px solid #374151' }}>
          <div style={{ color: '#FCD116', fontSize: 8, fontWeight: 800 }}>DIRECCION</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', width: CW[2], paddingLeft: 6, borderRight: '1px solid #374151' }}>
          <div style={{ color: '#FCD116', fontSize: 8, fontWeight: 800 }}>MATERIALES</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', width: CW[3], paddingLeft: 6, borderRight: '1px solid #374151' }}>
          <div style={{ color: '#FCD116', fontSize: 8, fontWeight: 800 }}>CONTACTO</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', width: CW[4], paddingLeft: 4, borderRight: '1px solid #374151' }}>
          <div style={{ color: '#FCD116', fontSize: 8, fontWeight: 800 }}>NIVEL</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', width: CW[5], paddingLeft: 6, borderRight: '1px solid #374151' }}>
          <div style={{ color: '#FCD116', fontSize: 8, fontWeight: 800 }}>ADVERTENCIAS</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', width: CW[6], paddingLeft: 6 }}>
          <div style={{ color: '#FCD116', fontSize: 8, fontWeight: 800 }}>RECOMENDACIONES</div>
        </div>
      </div>

      {/* Data rows */}
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, paddingLeft: 40 }}>
        {pageOrgs.map((g, ri) => {
          const org = g.org
          const nivelBg = g.activaCount > 0 ? '#CF0921' : '#D97706'
          const nivelLabel = g.activaCount > 0 ? 'CRITICA' : 'PARCIAL'
          const tipo = org.tipo.replace(/_/g, ' ')
          const matLines: string[] = g.needs.slice(0, 4).map(n => {
            const rem = n.cantidadNecesaria - n.cantidadComprometida - n.cantidadCumplida
            return igClip(n.nombreArticulo, 20) + (rem > 0 ? ' x' + String(rem) : '')
          })
          if (g.needs.length > 4) matLines.push('+' + String(g.needs.length - 4) + ' mas')
          const advText = g.activaCount > 0
            ? String(g.activaCount) + ' sin compromiso'
            : String(g.parcialCount) + ' parcialmente'
          const recText = org.contactoTelefono
            ? 'Llamar: ' + (org.contactoNombre ? org.contactoNombre.split(' ')[0] + ' ' : '') + org.contactoTelefono
            : org.verificada ? 'Org. verificada' : 'Coordinar por redes'

          return (
            <div key={String(g.orgId)} style={{ display: 'flex', height: rowH, backgroundColor: ri % 2 === 1 ? '#F3F4F6' : '#ffffff', borderBottom: '1px solid #E5E7EB' }}>
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', width: CW[0], paddingLeft: 6, paddingRight: 6, borderRight: '1px solid #E5E7EB' }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#111827' }}>{igClip(org.nombre, 28)}</div>
                <div style={{ fontSize: 8, color: '#6B7280', marginTop: 2 }}>{igClip(tipo, 22)}</div>
                {org.verificada ? <div style={{ fontSize: 8, color: '#059669', fontWeight: 700 }}>Verificada</div> : null}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', width: CW[1], paddingLeft: 6, paddingRight: 6, borderRight: '1px solid #E5E7EB' }}>
                <div style={{ fontSize: 8, color: '#111827' }}>{igClip(org.direccion, 50)}</div>
                <div style={{ fontSize: 8, color: '#6B7280', marginTop: 2, fontWeight: 600 }}>{org.ciudad}, {org.estado}</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', width: CW[2], paddingLeft: 6, paddingRight: 6, borderRight: '1px solid #E5E7EB' }}>
                {matLines.map((line, li) => (
                  <div key={li} style={{ fontSize: 8, color: '#111827' }}>{'• '}{line}</div>
                ))}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', width: CW[3], paddingLeft: 6, paddingRight: 6, borderRight: '1px solid #E5E7EB' }}>
                {org.contactoNombre ? <div style={{ fontSize: 8, color: '#111827', fontWeight: 600 }}>{igClip(org.contactoNombre, 22)}</div> : null}
                {org.contactoTelefono ? <div style={{ fontSize: 8, color: '#003DA5', marginTop: 2 }}>{org.contactoTelefono}</div> : null}
                {!org.contactoNombre && !org.contactoTelefono ? <div style={{ fontSize: 8, color: '#6B7280' }}>N/D</div> : null}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: CW[4], borderRight: '1px solid #E5E7EB' }}>
                <div style={{ display: 'flex', backgroundColor: nivelBg, borderRadius: 3, padding: '3px 4px' }}>
                  <div style={{ color: '#ffffff', fontSize: 8, fontWeight: 800 }}>{nivelLabel}</div>
                </div>
                <div style={{ fontSize: 7, color: '#6B7280', marginTop: 3 }}>{String(g.needs.length)} items</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', width: CW[5], paddingLeft: 6, paddingRight: 6, borderRight: '1px solid #E5E7EB' }}>
                <div style={{ fontSize: 8, color: '#92400E' }}>{advText}</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', width: CW[6], paddingLeft: 6, paddingRight: 6 }}>
                <div style={{ fontSize: 8, color: '#1E40AF' }}>{igClip(recText, 55)}</div>
              </div>
            </div>
          )
        })}
        {pageOrgs.length < 8 ? <div style={{ display: 'flex', flex: 1, backgroundColor: '#FAFAFA' }} /> : null}
      </div>

      {/* Footer */}
      <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 40px', height: 28, backgroundColor: '#1F2937' }}>
        <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 8 }}>levantandoavenezuela.vercel.app - ayudaencamino.com - Urgencia CRITICA</div>
      </div>

    </div>
  )
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
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
    const { orgs, generatedAt } = await fetchAyudaOrgs()

    if (!orgs.length) {
      return new ImageResponse(
        <div style={{ display: 'flex', width: '100%', height: '100%', backgroundColor: '#003DA5', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
          <div style={{ color: '#FCD116', fontSize: 30, fontWeight: 900 }}>Levantando a Venezuela</div>
          <div style={{ color: '#ffffff', fontSize: 16, marginTop: 20 }}>Datos no disponibles temporalmente</div>
        </div>,
        { width: 1080, height: 1350 }
      )
    }

    const PER_PAGE = 8
    const pageOrgs = orgs.slice((page - 1) * PER_PAGE, page * PER_PAGE)
    const totalPages = Math.ceil(orgs.length / PER_PAGE)
    if (!pageOrgs.length) return new Response('Page not found', { status: 404 })

    const rowH = Math.floor((1350 - 90 - 30 - 28) / PER_PAGE)
    const totalNeeds = orgs.reduce((s, g) => s + g.needs.length, 0)

    return new ImageResponse(
      <InstagramPage
        orgs={orgs}
        pageOrgs={pageOrgs}
        page={page}
        totalPages={totalPages}
        generatedAt={generatedAt}
        rowH={rowH}
        totalNeeds={totalNeeds}
      />,
      { width: 1080, height: 1350 }
    )
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
