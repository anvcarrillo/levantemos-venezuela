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

// ─── Instagram portrait image (1080×1350) — card layout ──────────────────────
// Each page shows 6 org cards in a 2-column grid

function OrgCard({ g }: { g: AyudaOrg }) {
  const org = g.org
  const nivelBg = g.activaCount > 0 ? '#CF0921' : '#D97706'
  const nivelLabel = g.activaCount > 0 ? 'CRITICA' : 'PARCIAL'
  const tipo = org.tipo.replace(/_/g, ' ')
  const topNeeds = g.needs.slice(0, 3).map(n => {
    const rem = n.cantidadNecesaria - n.cantidadComprometida - n.cantidadCumplida
    return igClip(n.nombreArticulo, 24) + (rem > 0 ? ' ×' + String(rem) : '')
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: 480, backgroundColor: '#ffffff', borderRadius: 10, margin: 10, padding: 16, border: '1px solid #E5E7EB' }}>
      {/* Top row: name + badge */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, marginRight: 8 }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: '#111827', lineHeight: 1.2 }}>{igClip(org.nombre, 30)}</div>
          <div style={{ fontSize: 9, color: '#6B7280', marginTop: 2 }}>{igClip(tipo, 26)}</div>
        </div>
        <div style={{ display: 'flex', backgroundColor: nivelBg, borderRadius: 4, padding: '3px 7px' }}>
          <div style={{ color: '#ffffff', fontSize: 8, fontWeight: 800 }}>{nivelLabel}</div>
        </div>
      </div>

      {/* Address */}
      <div style={{ display: 'flex', marginBottom: 8 }}>
        <div style={{ fontSize: 9, color: '#374151', lineHeight: 1.3 }}>
          {igClip(org.direccion, 55)} — {org.ciudad}, {org.estado}
        </div>
      </div>

      {/* Materials */}
      <div style={{ display: 'flex', flexDirection: 'column', marginBottom: 8 }}>
        <div style={{ fontSize: 8, fontWeight: 700, color: '#003DA5', marginBottom: 3 }}>MATERIALES NECESARIOS</div>
        {topNeeds.map((need, ni) => (
          <div key={ni} style={{ display: 'flex', fontSize: 9, color: '#374151', marginBottom: 1 }}>
            {'• '}{need}
          </div>
        ))}
        {g.needs.length > 3 ? <div style={{ fontSize: 8, color: '#6B7280' }}>{'+'}{String(g.needs.length - 3)}{' mas...'}</div> : null}
      </div>

      {/* Contact + verified */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {org.contactoNombre ? <div style={{ fontSize: 9, color: '#111827', fontWeight: 600 }}>{igClip(org.contactoNombre, 22)}</div> : null}
          {org.contactoTelefono ? <div style={{ fontSize: 9, color: '#003DA5' }}>{org.contactoTelefono}</div> : null}
          {!org.contactoNombre && !org.contactoTelefono ? <div style={{ fontSize: 9, color: '#6B7280' }}>Contacto no disponible</div> : null}
        </div>
        {org.verificada ? <div style={{ fontSize: 8, color: '#059669', fontWeight: 700, marginLeft: 6 }}>Verificada</div> : null}
      </div>
    </div>
  )
}

function InstagramPage({
  orgs,
  pageOrgs,
  page,
  totalPages,
  generatedAt,
  totalNeeds,
}: {
  orgs: AyudaOrg[]
  pageOrgs: AyudaOrg[]
  page: number
  totalPages: number
  generatedAt: string
  totalNeeds: number
}) {
  const leftCol = pageOrgs.filter((_, i) => i % 2 === 0)
  const rightCol = pageOrgs.filter((_, i) => i % 2 === 1)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', backgroundColor: '#F9FAFB', fontFamily: 'sans-serif' }}>

      {/* Flag stripe */}
      <div style={{ display: 'flex', height: 10 }}>
        <div style={{ flex: 1, backgroundColor: '#FCD116' }} />
        <div style={{ flex: 1, backgroundColor: '#003DA5' }} />
        <div style={{ flex: 1, backgroundColor: '#CF0921' }} />
      </div>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 30px', backgroundColor: '#003DA5' }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ color: '#FCD116', fontSize: 13, fontWeight: 900 }}>Levantando a Venezuela</div>
          <div style={{ color: '#ffffff', fontSize: 22, fontWeight: 900, lineHeight: 1.1 }}>Coordinacion de Voluntarios</div>
          <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: 10, marginTop: 3 }}>
            {orgs.length} centros · {totalNeeds} necesidades criticas
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
          <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 9 }}>{generatedAt}</div>
          <div style={{ display: 'flex', backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20, padding: '3px 12px', marginTop: 6 }}>
            <div style={{ color: '#ffffff', fontSize: 11, fontWeight: 700 }}>{page} / {totalPages}</div>
          </div>
        </div>
      </div>

      {/* 2-column card grid */}
      <div style={{ display: 'flex', flex: 1, padding: '0 10px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', width: 500 }}>
          {leftCol.map(g => <OrgCard key={String(g.orgId)} g={g} />)}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', width: 500 }}>
          {rightCol.map(g => <OrgCard key={String(g.orgId)} g={g} />)}
        </div>
      </div>

      {/* Footer */}
      <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 40px', backgroundColor: '#1F2937' }}>
        <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 10 }}>
          levantandoavenezuela.vercel.app · ayudaencamino.com · Solo urgencia CRITICA
        </div>
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

    // Minimal test: just confirm 1080x1350 renders at all in this route
    return new ImageResponse(
      <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', backgroundColor: '#003DA5', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: '#FCD116', fontSize: 40, fontWeight: 900 }}>Levantando a Venezuela</div>
        <div style={{ color: '#ffffff', fontSize: 18, marginTop: 16 }}>Pagina {page} - {orgs.length} orgs</div>
        <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, marginTop: 8 }}>{generatedAt}</div>
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
