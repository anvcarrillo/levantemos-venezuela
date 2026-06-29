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
  const d = new Date()
  const generatedAt = String(d.getDate()) + '/' + String(d.getMonth() + 1) + '/' + String(d.getFullYear()) + ' ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0')
  try {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 7000)
    const hdrs = { 'User-Agent': 'Mozilla/5.0 Chrome/125', 'Accept': 'application/json', 'Referer': 'https://ayudaencamino.com/organizaciones' }
    const [r1, r2] = await Promise.allSettled([
      fetch('https://ayudaencamino.com/api/needs?urgencia=critica&status=activa', { cache: 'no-store', signal: ctrl.signal, headers: hdrs }),
      fetch('https://ayudaencamino.com/api/needs?urgencia=critica&status=parcial', { cache: 'no-store', signal: ctrl.signal, headers: hdrs }),
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
      if (n.status === 'activa') g.activaCount++; else g.parcialCount++
    }
    return { orgs: [...byOrg.values()].sort((a, b) => b.needs.length - a.needs.length), generatedAt }
  } catch {
    return { orgs: [], generatedAt }
  }
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

  // ── Instagram infographic (1080×1350) ──
  if (format === 'instagram') {
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
    const { orgs, generatedAt } = await fetchAyudaOrgs()
    const PER_PAGE = 4
    const pageOrgs = orgs.slice((page - 1) * PER_PAGE, page * PER_PAGE)
    const totalPages = Math.max(1, Math.ceil(orgs.length / PER_PAGE))
    const pageLabel = String(page) + ' / ' + String(totalPages)
    const totalItems = orgs.reduce((s, g) => s + g.needs.length, 0)
    const totalItemsLabel = String(totalItems)
    const totalOrgsLabel = String(orgs.length)
    const now = new Date()
    const dateShort = String(now.getDate()) + '/' + String(now.getMonth() + 1)

    type Row = {
      entryNum: string; itemsCount: string
      name: string; tipo: string; location: string; addr: string
      materialsStr: string; contact: string
      badge: string; badgeBg: string; verified: boolean
    }
    const rows: Row[] = pageOrgs.map((g, idx) => {
      const o = g.org
      const top3 = g.needs.slice(0, 3).map(n => {
        const rem = n.cantidadNecesaria - n.cantidadComprometida - n.cantidadCumplida
        return igClip(n.nombreArticulo, 24) + (rem > 0 ? ' (' + String(rem) + ')' : '')
      })
      const extra = g.needs.length > 3 ? '  +' + String(g.needs.length - 3) + ' mas' : ''
      const isCrit = g.activaCount > 0
      return {
        entryNum: String((page - 1) * PER_PAGE + idx + 1).padStart(2, '0'),
        itemsCount: String(g.needs.length),
        name: igClip(o.nombre, 36),
        tipo: igClip(o.tipo.replace(/_/g, ' '), 30),
        location: o.ciudad + ', ' + o.estado,
        addr: igClip(o.direccion, 62),
        materialsStr: top3.join('  ·  ') + extra,
        contact: o.contactoTelefono
          ? (o.contactoNombre ? igClip(o.contactoNombre.split(' ')[0], 16) + ': ' : '') + o.contactoTelefono
          : (o.contactoNombre ? igClip(o.contactoNombre, 28) : 'Sin contacto registrado'),
        badge: isCrit ? 'CRITICA' : 'PARCIAL',
        badgeBg: isCrit ? '#CF0921' : '#D97706',
        verified: o.verificada,
      }
    })

    return new ImageResponse(
      <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', backgroundColor: '#0F172A', fontFamily: 'sans-serif' }}>

        {/* Flag stripe */}
        <div style={{ display: 'flex', height: 10 }}>
          <div style={{ flex: 1, backgroundColor: '#FCD116' }} />
          <div style={{ flex: 1, backgroundColor: '#003DA5' }} />
          <div style={{ flex: 1, backgroundColor: '#CF0921' }} />
        </div>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingLeft: 36, paddingRight: 36, paddingTop: 18, paddingBottom: 18, backgroundColor: '#003DA5' }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ color: '#FCD116', fontSize: 12, fontWeight: 900, letterSpacing: 2 }}>LEVANTANDO A VENEZUELA</div>
            <div style={{ color: '#ffffff', fontSize: 26, fontWeight: 900, lineHeight: 1.1, marginTop: 4 }}>Necesidades Criticas</div>
            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, marginTop: 5 }}>ayudaencamino.com · Urgencia CRITICA</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
            <div style={{ display: 'flex', backgroundColor: '#FCD116', borderRadius: 6, paddingLeft: 16, paddingRight: 16, paddingTop: 6, paddingBottom: 6 }}>
              <div style={{ color: '#000000', fontSize: 15, fontWeight: 900 }}>{pageLabel}</div>
            </div>
            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10 }}>{generatedAt}</div>
          </div>
        </div>

        {/* Stats strip */}
        <div style={{ display: 'flex', backgroundColor: '#1E293B', height: 76 }}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', borderRight: '1px solid #334155' }}>
            <div style={{ fontSize: 36, fontWeight: 900, color: '#FCD116', lineHeight: 1 }}>{totalOrgsLabel}</div>
            <div style={{ fontSize: 10, color: '#64748B', marginTop: 4, letterSpacing: 1 }}>CENTROS</div>
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', borderRight: '1px solid #334155' }}>
            <div style={{ fontSize: 36, fontWeight: 900, color: '#CF0921', lineHeight: 1 }}>{totalItemsLabel}</div>
            <div style={{ fontSize: 10, color: '#64748B', marginTop: 4, letterSpacing: 1 }}>ITEMS SIN CUBRIR</div>
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ fontSize: 36, fontWeight: 900, color: '#ffffff', lineHeight: 1 }}>{dateShort}</div>
            <div style={{ fontSize: 10, color: '#64748B', marginTop: 4, letterSpacing: 1 }}>HOY</div>
          </div>
        </div>

        {/* Org entries */}
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
          {!rows.length ? (
            <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ color: '#64748B', fontSize: 18 }}>No hay datos disponibles</div>
            </div>
          ) : rows.map((r, i) => (
            <div key={i} style={{ display: 'flex', flex: 1, borderBottom: '1px solid #1E293B' }}>

              {/* Left indicator column */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: 88, backgroundColor: r.badgeBg, paddingTop: 16, paddingBottom: 16 }}>
                <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: 10, fontWeight: 700, letterSpacing: 1 }}>N</div>
                <div style={{ color: '#ffffff', fontSize: 38, fontWeight: 900, lineHeight: 1, marginTop: 2 }}>{r.entryNum}</div>
                <div style={{ width: 32, height: 1, backgroundColor: 'rgba(255,255,255,0.25)', marginTop: 10, marginBottom: 10 }} />
                <div style={{ color: '#ffffff', fontSize: 18, fontWeight: 900, lineHeight: 1 }}>{r.itemsCount}</div>
                <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 9, marginTop: 3, letterSpacing: 0.5 }}>ITEMS</div>
              </div>

              {/* Right content */}
              <div style={{ display: 'flex', flexDirection: 'column', flex: 1, backgroundColor: '#ffffff', paddingLeft: 24, paddingRight: 28, paddingTop: 18, paddingBottom: 18 }}>

                {/* Badge row */}
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
                  <div style={{ display: 'flex', backgroundColor: r.badgeBg, borderRadius: 4, paddingLeft: 9, paddingRight: 9, paddingTop: 3, paddingBottom: 3, marginRight: 10 }}>
                    <div style={{ color: '#ffffff', fontSize: 10, fontWeight: 900, letterSpacing: 1 }}>{r.badge}</div>
                  </div>
                  {r.verified ? <div style={{ fontSize: 11, color: '#059669', fontWeight: 800 }}>VERIFICADA</div> : null}
                </div>

                {/* Org name */}
                <div style={{ fontSize: 19, fontWeight: 900, color: '#0F172A', lineHeight: 1.2, marginBottom: 5 }}>{r.name}</div>

                {/* Type + location */}
                <div style={{ fontSize: 12, color: '#94A3B8', fontWeight: 500, marginBottom: 10 }}>{r.tipo + '  ·  ' + r.location}</div>

                {/* Address */}
                <div style={{ fontSize: 13, color: '#475569', fontWeight: 600, marginBottom: 12 }}>{r.addr}</div>

                {/* Materials box */}
                <div style={{ display: 'flex', flexDirection: 'column', backgroundColor: '#FFFBEB', borderRadius: 6, paddingLeft: 14, paddingRight: 14, paddingTop: 10, paddingBottom: 10, marginBottom: 12, borderLeft: '4px solid #FCD116' }}>
                  <div style={{ fontSize: 9, fontWeight: 900, color: '#92400E', letterSpacing: 1, marginBottom: 5 }}>MATERIALES NECESARIOS</div>
                  <div style={{ fontSize: 13, color: '#78350F', lineHeight: 1.5 }}>{r.materialsStr}</div>
                </div>

                {/* Contact */}
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <div style={{ fontSize: 10, fontWeight: 900, color: '#003DA5', letterSpacing: 1, marginRight: 10 }}>CONTACTO</div>
                  <div style={{ fontSize: 13, color: '#1D4ED8', fontWeight: 700 }}>{r.contact}</div>
                </div>

              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', paddingTop: 11, paddingBottom: 11, backgroundColor: '#0F172A' }}>
          <div style={{ color: '#334155', fontSize: 10 }}>levantandoavenezuela.vercel.app  ·  ayudaencamino.com  ·  Solo urgencia CRITICA</div>
        </div>

      </div>,
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
