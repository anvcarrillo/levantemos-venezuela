import { ImageResponse } from 'next/og'

const W = 1080
const H = 1350

const YELLOW = '#FCD116'
const BLUE = '#003DA5'
const RED = '#CF0921'
const DARK = '#111827'
const GRAY = '#6B7280'
const LIGHT = '#F3F4F6'
const BORDER = '#E5E7EB'

// 7 columns, total 1000px (40px left padding, 40px right)
const COLS = [
  { label: 'CENTRO',              w: 160 },
  { label: 'DIRECCIÓN',           w: 148 },
  { label: 'MATERIALES',          w: 200 },
  { label: 'CONTACTO',            w: 128 },
  { label: 'NIVEL',               w:  68 },
  { label: 'ADVERTENCIAS',        w: 148 },
  { label: 'RECOMENDACIONES',     w: 148 },
]

const FETCH_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  'Accept': 'application/json',
  'Referer': 'https://ayudaencamino.com/organizaciones',
}

type Need = {
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

type OrgGroup = {
  orgId: number
  org: Need['organizacion']
  needs: Need[]
  activaCount: number
  parcialCount: number
}

async function fetchOrgs(): Promise<{ orgs: OrgGroup[]; generatedAt: string }> {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), 12000)

  const [r1, r2] = await Promise.allSettled([
    fetch('https://ayudaencamino.com/api/needs?urgencia=critica&status=activa',
      { cache: 'no-store', signal: ctrl.signal, headers: FETCH_HEADERS }),
    fetch('https://ayudaencamino.com/api/needs?urgencia=critica&status=parcial',
      { cache: 'no-store', signal: ctrl.signal, headers: FETCH_HEADERS }),
  ])
  clearTimeout(t)

  const all: Need[] = []
  if (r1.status === 'fulfilled' && r1.value.ok) all.push(...await r1.value.json() as Need[])
  if (r2.status === 'fulfilled' && r2.value.ok) all.push(...await r2.value.json() as Need[])

  const seen = new Set<number>()
  const unique = all.filter(n => { if (seen.has(n.id)) return false; seen.add(n.id); return true })

  const byOrg = new Map<number, OrgGroup>()
  for (const n of unique) {
    if (!byOrg.has(n.orgId)) {
      byOrg.set(n.orgId, { orgId: n.orgId, org: n.organizacion, needs: [], activaCount: 0, parcialCount: 0 })
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
  return s.length > max ? s.slice(0, max - 1) + '...' : s
}

function Row({ g, rowH, shade, idx }: { g: OrgGroup; rowH: number; shade: boolean; idx: number }) {
  void idx
  const org = g.org
  const tipo = org.tipo.replace(/_/g, ' ')
  const nivel = g.activaCount > 0 ? 'CRITICA' : 'PARCIAL'
  const nivelColor = g.activaCount > 0 ? RED : '#D97706'
  const countLabel = `${g.needs.length} item${g.needs.length !== 1 ? 's' : ''}`

  const materialLines = g.needs.slice(0, 4).map(n => {
    const rem = n.cantidadNecesaria - n.cantidadComprometida - n.cantidadCumplida
    return `• ${clip(n.nombreArticulo, 20)}${rem > 0 ? ` x${rem}` : ''}`
  })
  if (g.needs.length > 4) materialLines.push(`  +${g.needs.length - 4} mas`)

  const advText = g.activaCount > 0
    ? `${g.activaCount} sin compromiso - urgente`
    : `${g.parcialCount} parcialmente cubiertos`

  const recLines = org.contactoTelefono
    ? ['Llamar antes de ir:', org.contactoNombre ?? '', org.contactoTelefono]
    : [org.verificada ? 'Org. verificada' : 'Coordinar por redes', 'antes de ir']

  const colStyle = (idx2: number): React.CSSProperties => ({
    display: 'flex' as const,
    flexDirection: 'column' as const,
    justifyContent: 'center' as const,
    width: COLS[idx2].w,
    height: rowH,
    padding: '4px 6px',
    borderRight: idx2 < COLS.length - 1 ? `1px solid ${BORDER}` : undefined,
  })

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'row',
      height: rowH,
      backgroundColor: shade ? LIGHT : '#ffffff',
      borderBottom: `1px solid ${BORDER}`,
    }}>
      {/* Centro */}
      <div style={colStyle(0)}>
        <div style={{ fontSize: 10, fontWeight: 700, color: DARK, lineHeight: 1.2 }}>{clip(org.nombre, 28)}</div>
        <div style={{ fontSize: 8.5, color: GRAY, marginTop: 2 }}>{clip(tipo, 22)}</div>
        {org.verificada && <div style={{ fontSize: 8, color: '#059669', marginTop: 2, fontWeight: 700 }}>Verificada</div>}
      </div>

      {/* Direccion */}
      <div style={colStyle(1)}>
        <div style={{ fontSize: 8.5, color: DARK, lineHeight: 1.3 }}>{clip(org.direccion, 50)}</div>
        <div style={{ fontSize: 8.5, color: GRAY, marginTop: 2, fontWeight: 600 }}>{org.ciudad}, {org.estado}</div>
      </div>

      {/* Materiales */}
      <div style={colStyle(2)}>
        {materialLines.map((line, li) => (
          <div key={li} style={{ fontSize: 8.5, color: DARK, lineHeight: 1.3 }}>{line}</div>
        ))}
      </div>

      {/* Contacto */}
      <div style={colStyle(3)}>
        {org.contactoNombre
          ? <div style={{ fontSize: 8.5, color: DARK, fontWeight: 600, lineHeight: 1.2 }}>{clip(org.contactoNombre, 22)}</div>
          : null}
        {org.contactoTelefono
          ? <div style={{ fontSize: 8.5, color: BLUE, marginTop: 2 }}>{org.contactoTelefono}</div>
          : null}
        {!org.contactoNombre && !org.contactoTelefono
          ? <div style={{ fontSize: 8.5, color: GRAY }}>No disponible</div>
          : null}
      </div>

      {/* Nivel */}
      <div style={{ ...colStyle(4), alignItems: 'center' }}>
        <div style={{ display: 'flex', backgroundColor: nivelColor, color: 'white', fontSize: 8, fontWeight: 800, padding: '3px 4px', borderRadius: 3 }}>
          {nivel}
        </div>
        <div style={{ fontSize: 8, color: GRAY, marginTop: 3 }}>{countLabel}</div>
      </div>

      {/* Advertencias */}
      <div style={colStyle(5)}>
        <div style={{ fontSize: 8.5, color: '#92400E', lineHeight: 1.3 }}>{advText}</div>
      </div>

      {/* Recomendaciones */}
      <div style={{ ...colStyle(6), borderRight: undefined }}>
        {recLines.filter(Boolean).map((line, li) => (
          <div key={li} style={{ fontSize: 8.5, color: '#1E40AF', lineHeight: 1.3 }}>{line}</div>
        ))}
      </div>
    </div>
  )
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))

    const { orgs, generatedAt } = await fetchOrgs()

    const perPage = 8
    const start = (page - 1) * perPage
    const pageOrgs = orgs.slice(start, start + perPage)
    const totalPages = Math.ceil(orgs.length / perPage)

    if (!pageOrgs.length) {
      return new Response('Page not found', { status: 404 })
    }

    const HEADER_H = 90
    const COL_H = 30
    const FOOTER_H = 28
    const rowH = Math.floor((H - HEADER_H - COL_H - FOOTER_H) / perPage)

    const totalNeeds = orgs.reduce((s, g) => s + g.needs.length, 0)

    return new ImageResponse(
      (
        <div style={{ display: 'flex', flexDirection: 'column', width: W, height: H, backgroundColor: '#ffffff', fontFamily: 'sans-serif' }}>

          {/* Flag stripe */}
          <div style={{ display: 'flex', height: 8 }}>
            <div style={{ flex: 1, backgroundColor: YELLOW }} />
            <div style={{ flex: 1, backgroundColor: BLUE }} />
            <div style={{ flex: 1, backgroundColor: RED }} />
          </div>

          {/* Header */}
          <div style={{ display: 'flex', flexDirection: 'row', backgroundColor: BLUE, padding: '10px 40px', height: HEADER_H - 8, alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ color: YELLOW, fontSize: 12, fontWeight: 900 }}>Levantando a Venezuela · Coordinacion de Voluntarios</div>
              <div style={{ color: '#ffffff', fontSize: 20, fontWeight: 900, marginTop: 2 }}>Centros con Necesidades Criticas</div>
              <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 9.5, marginTop: 3 }}>
                Fuente: ayudaencamino.com · {orgs.length} organizaciones · {totalNeeds} items urgentes
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
              <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 8.5 }}>Generado el</div>
              <div style={{ color: '#ffffff', fontSize: 9.5, fontWeight: 700 }}>{generatedAt}</div>
              <div style={{ display: 'flex', marginTop: 5, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 20, padding: '2px 10px' }}>
                <div style={{ color: '#ffffff', fontSize: 9.5, fontWeight: 700 }}>{page} / {totalPages}</div>
              </div>
            </div>
          </div>

          {/* Column headers */}
          <div style={{ display: 'flex', flexDirection: 'row', height: COL_H, backgroundColor: DARK, paddingLeft: 40 }}>
            {COLS.map((col, ci) => (
              <div key={ci} style={{ display: 'flex', alignItems: 'center', width: col.w, paddingLeft: 6, borderRight: ci < COLS.length - 1 ? '1px solid #374151' : undefined }}>
                <div style={{ color: YELLOW, fontSize: 8.5, fontWeight: 800 }}>{col.label}</div>
              </div>
            ))}
          </div>

          {/* Rows */}
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, paddingLeft: 40 }}>
            {pageOrgs.map((g, i) => (
              <Row key={g.orgId} g={g} rowH={rowH} shade={i % 2 === 1} idx={i} />
            ))}
            {pageOrgs.length < perPage && (
              <div style={{ display: 'flex', flex: 1, backgroundColor: '#FAFAFA' }} />
            )}
          </div>

          {/* Footer */}
          <div style={{ display: 'flex', height: FOOTER_H, backgroundColor: '#1F2937', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 8.5 }}>
              levantandoavenezuela.vercel.app · Datos de ayudaencamino.com · Solo urgencia CRITICA
            </div>
          </div>

        </div>
      ),
      { width: W, height: H }
    )
  } catch (err) {
    return new Response(`Error: ${String(err)}`, { status: 500, headers: { 'Content-Type': 'text/plain' } })
  }
}
