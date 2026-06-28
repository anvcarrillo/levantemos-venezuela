import { ImageResponse } from 'next/og'

// Instagram portrait format: 1080 × 1350
const W = 1080
const H = 1350

const YELLOW = '#FCD116'
const BLUE = '#003DA5'
const RED = '#CF0921'
const DARK = '#111827'
const GRAY = '#6B7280'
const LIGHT = '#F3F4F6'
const BORDER = '#E5E7EB'

// Column config — total 1000px (40px padding each side)
const COLS = [
  { label: 'Centro',              w: 165, key: 'centro'          },
  { label: 'Dirección',           w: 150, key: 'direccion'       },
  { label: 'Materiales Necesarios', w: 200, key: 'materiales'   },
  { label: 'Info de Contacto',    w: 130, key: 'contacto'        },
  { label: 'Nivel',               w:  70, key: 'nivel'           },
  { label: 'Advertencias',        w: 140, key: 'advertencias'    },
  { label: 'Recomendaciones',     w: 145, key: 'recomendaciones' },
]
// 165+150+200+130+70+140+145 = 1000

const FETCH_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  'Accept': 'application/json, */*',
  'Referer': 'https://ayudaencamino.com/organizaciones',
}

type Need = {
  id: number
  orgId: number
  nombreArticulo: string
  categoria: string
  descripcion: string
  cantidadNecesaria: number
  cantidadComprometida: number
  cantidadCumplida: number
  status: string
  organizacion: {
    id: number
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

type OrgGroup = {
  org: Need['organizacion']
  needs: Need[]
  activaCount: number
  parcialCount: number
}

async function fetchOrgs(): Promise<{ orgs: OrgGroup[]; generatedAt: string }> {
  const controller = new AbortController()
  setTimeout(() => controller.abort(), 12000)

  const [r1, r2] = await Promise.allSettled([
    fetch('https://ayudaencamino.com/api/needs?urgencia=critica&status=activa',
      { cache: 'no-store', signal: controller.signal, headers: FETCH_HEADERS }),
    fetch('https://ayudaencamino.com/api/needs?urgencia=critica&status=parcial',
      { cache: 'no-store', signal: controller.signal, headers: FETCH_HEADERS }),
  ])

  const all: Need[] = []
  if (r1.status === 'fulfilled' && r1.value.ok) all.push(...await r1.value.json() as Need[])
  if (r2.status === 'fulfilled' && r2.value.ok) all.push(...await r2.value.json() as Need[])

  const seen = new Set<number>()
  const unique = all.filter(n => { if (seen.has(n.id)) return false; seen.add(n.id); return true })

  const byOrg = new Map<number, OrgGroup>()
  for (const n of unique) {
    if (!byOrg.has(n.orgId)) {
      byOrg.set(n.orgId, { org: n.organizacion, needs: [], activaCount: 0, parcialCount: 0 })
    }
    const g = byOrg.get(n.orgId)!
    g.needs.push(n)
    if (n.status === 'activa') g.activaCount++
    else g.parcialCount++
  }

  const orgs = [...byOrg.values()].sort((a, b) => b.needs.length - a.needs.length)
  const generatedAt = new Date().toLocaleString('es-VE', {
    day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit', timeZone: 'America/Caracas',
  })
  return { orgs, generatedAt }
}

function clip(s: string, max: number) {
  return s.length > max ? s.slice(0, max - 1) + '…' : s
}

function OrgRow({ g, rowH, shade }: { g: OrgGroup; rowH: number; shade: boolean }) {
  const org = g.org
  const remaining = g.needs.map(n => n.cantidadNecesaria - n.cantidadComprometida - n.cantidadCumplida)
  const materialsLines = g.needs.slice(0, 4).map((n, i) => {
    const rem = remaining[i]
    return `• ${clip(n.nombreArticulo, 22)}${rem > 0 ? ` ×${rem}` : ''}`
  })
  if (g.needs.length > 4) materialsLines.push(`  +${g.needs.length - 4} más`)

  const tipo = org.tipo.replace(/_/g, ' ')
  const nivel = g.activaCount > 0 ? `CRÍTICA` : 'PARCIAL'
  const nivelColor = g.activaCount > 0 ? RED : '#D97706'
  const advertencia = g.activaCount > 0
    ? `${g.activaCount} item${g.activaCount > 1 ? 's' : ''} sin ningún compromiso — actuar ya`
    : `${g.parcialCount} item${g.parcialCount > 1 ? 's' : ''} parcialmente cubiertos`
  const recomendacion = org.contactoTelefono
    ? `Llamar antes de ir:\n${org.contactoNombre ?? ''}\n${org.contactoTelefono}`
    : org.verificada ? 'Organización verificada — ir directo a la dirección' : 'Coordinar por redes antes de ir'

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'row',
        height: rowH,
        backgroundColor: shade ? LIGHT : '#ffffff',
        borderBottom: `1px solid ${BORDER}`,
        alignItems: 'stretch',
      }}
    >
      {/* Centro */}
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', width: COLS[0].w, padding: '4px 8px', borderRight: `1px solid ${BORDER}` }}>
        <div style={{ fontSize: 10, fontWeight: 800, color: DARK, lineHeight: 1.3 }}>{clip(org.nombre, 30)}</div>
        <div style={{ fontSize: 9, color: GRAY, marginTop: 2 }}>{clip(tipo, 22)}</div>
        {org.verificada && <div style={{ fontSize: 8, color: '#059669', marginTop: 2, fontWeight: 700 }}>✓ Verificada</div>}
      </div>

      {/* Dirección */}
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', width: COLS[1].w, padding: '4px 8px', borderRight: `1px solid ${BORDER}` }}>
        <div style={{ fontSize: 9, color: DARK, lineHeight: 1.35 }}>{clip(org.direccion, 55)}</div>
        <div style={{ fontSize: 9, color: GRAY, marginTop: 3, fontWeight: 600 }}>{org.ciudad}, {org.estado}</div>
      </div>

      {/* Materiales */}
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', width: COLS[2].w, padding: '4px 8px', borderRight: `1px solid ${BORDER}` }}>
        {materialsLines.map((line, i) => (
          <div key={i} style={{ fontSize: 9, color: DARK, lineHeight: 1.35 }}>{line}</div>
        ))}
      </div>

      {/* Contacto */}
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', width: COLS[3].w, padding: '4px 8px', borderRight: `1px solid ${BORDER}` }}>
        {org.contactoNombre && <div style={{ fontSize: 9, color: DARK, fontWeight: 600 }}>{clip(org.contactoNombre, 20)}</div>}
        {org.contactoTelefono && <div style={{ fontSize: 9, color: BLUE, marginTop: 2 }}>{org.contactoTelefono}</div>}
        {!org.contactoNombre && !org.contactoTelefono && <div style={{ fontSize: 9, color: GRAY }}>No disponible</div>}
      </div>

      {/* Nivel */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: COLS[4].w, padding: '4px 4px', borderRight: `1px solid ${BORDER}` }}>
        <div style={{ display: 'flex', backgroundColor: nivelColor, color: 'white', fontSize: 8, fontWeight: 800, padding: '3px 5px', borderRadius: 4 }}>
          {nivel}
        </div>
        <div style={{ fontSize: 8, color: GRAY, marginTop: 4, textAlign: 'center' }}>
          {g.needs.length} items
        </div>
      </div>

      {/* Advertencias */}
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', width: COLS[5].w, padding: '4px 8px', borderRight: `1px solid ${BORDER}` }}>
        <div style={{ fontSize: 9, color: '#92400E', lineHeight: 1.35 }}>{advertencia}</div>
      </div>

      {/* Recomendaciones */}
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', width: COLS[6].w, padding: '4px 8px' }}>
        <div style={{ fontSize: 9, color: '#1E40AF', lineHeight: 1.35, whiteSpace: 'pre-wrap' }}>{recomendacion}</div>
      </div>
    </div>
  )
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') ?? '1', 10)

  const { orgs, generatedAt } = await fetchOrgs()

  const perPage = 8
  const start = (page - 1) * perPage
  const pageOrgs = orgs.slice(start, start + perPage)
  const totalPages = Math.ceil(orgs.length / perPage)

  if (!pageOrgs.length) {
    return new Response('Page not found', { status: 404 })
  }

  const HEADER_H = 95
  const COL_HEADER_H = 32
  const FOOTER_H = 30
  const rowH = Math.floor((H - HEADER_H - COL_HEADER_H - FOOTER_H) / perPage)

  return new ImageResponse(
    (
      <div style={{ display: 'flex', flexDirection: 'column', width: W, height: H, backgroundColor: '#ffffff', fontFamily: 'sans-serif' }}>

        {/* Flag stripe */}
        <div style={{ display: 'flex', height: 10 }}>
          <div style={{ flex: 1, backgroundColor: YELLOW }} />
          <div style={{ flex: 1, backgroundColor: BLUE }} />
          <div style={{ flex: 1, backgroundColor: RED }} />
        </div>

        {/* Header */}
        <div style={{ display: 'flex', backgroundColor: BLUE, padding: '12px 40px', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ color: YELLOW, fontSize: 13, fontWeight: 900 }}>Levantando a Venezuela · Coordinación de Voluntarios</div>
            <div style={{ color: '#ffffff', fontSize: 22, fontWeight: 900, marginTop: 3 }}>Centros con Necesidades Críticas</div>
            <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: 10, marginTop: 4 }}>
              Fuente: ayudaencamino.com · {orgs.length} organizaciones · {orgs.reduce((s, g) => s + g.needs.length, 0)} items urgentes
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 9 }}>Generado el</div>
            <div style={{ color: '#ffffff', fontSize: 10, fontWeight: 700 }}>{generatedAt}</div>
            <div style={{ display: 'flex', marginTop: 6, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 20, padding: '3px 10px' }}>
              <div style={{ color: '#ffffff', fontSize: 10, fontWeight: 600 }}>{page} / {totalPages}</div>
            </div>
          </div>
        </div>

        {/* Column headers */}
        <div style={{ display: 'flex', flexDirection: 'row', height: COL_HEADER_H, backgroundColor: DARK, paddingLeft: 40 }}>
          {COLS.map(col => (
            <div
              key={col.key}
              style={{
                display: 'flex',
                alignItems: 'center',
                width: col.w,
                paddingLeft: 8,
                borderRight: '1px solid #374151',
              }}
            >
              <div style={{ color: YELLOW, fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                {col.label}
              </div>
            </div>
          ))}
        </div>

        {/* Table rows */}
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, paddingLeft: 40 }}>
          {pageOrgs.map((g, i) => (
            <OrgRow key={g.org.id} g={g} rowH={rowH} shade={i % 2 === 1} />
          ))}
          {/* Fill remaining rows if less than perPage */}
          {pageOrgs.length < perPage && (
            <div style={{ display: 'flex', flex: 1, backgroundColor: '#FAFAFA' }} />
          )}
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', height: FOOTER_H, backgroundColor: '#1F2937', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 9 }}>
            levantandoavenezuela.vercel.app · Datos verificados de ayudaencamino.com · Urgencia CRÍTICA únicamente
          </div>
        </div>
      </div>
    ),
    { width: W, height: H }
  )
}
