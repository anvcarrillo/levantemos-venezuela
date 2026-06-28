import { ImageResponse } from 'next/og'

const W = 1080
const H = 1350
const YELLOW = '#FCD116'
const BLUE = '#003DA5'
const RED = '#CF0921'
const DARK = '#111827'
const GRAY = '#6B7280'
const BORDER = '#E5E7EB'
const LIGHT = '#F3F4F6'

// 7 columns totalling 1000px (40px left padding)
const CW = [160, 148, 200, 128, 68, 148, 148]
const CLABELS = ['CENTRO', 'DIRECCIÓN', 'MATERIALES', 'CONTACTO', 'NIVEL', 'ADVERTENCIAS', 'RECOMENDACIONES']

function clip(s: string, max: number) {
  return s.length > max ? s.slice(0, max - 1) + '...' : s
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
  const timer = setTimeout(() => ctrl.abort(), 12000)
  const headers = {
    'User-Agent': 'Mozilla/5.0 Chrome/125.0.0.0',
    'Accept': 'application/json',
    'Referer': 'https://ayudaencamino.com/organizaciones',
  }
  try {
    const [r1, r2] = await Promise.allSettled([
      fetch('https://ayudaencamino.com/api/needs?urgencia=critica&status=activa', { cache: 'no-store', signal: ctrl.signal, headers }),
      fetch('https://ayudaencamino.com/api/needs?urgencia=critica&status=parcial', { cache: 'no-store', signal: ctrl.signal, headers }),
    ])
    clearTimeout(timer)
    const all: Need[] = []
    if (r1.status === 'fulfilled' && r1.value.ok) all.push(...(await r1.value.json() as Need[]))
    if (r2.status === 'fulfilled' && r2.value.ok) all.push(...(await r2.value.json() as Need[]))
    const seen = new Set<number>()
    const unique = all.filter(n => { if (seen.has(n.id)) return false; seen.add(n.id); return true })
    const byOrg = new Map<number, OrgGroup>()
    for (const n of unique) {
      if (!byOrg.has(n.orgId)) byOrg.set(n.orgId, { orgId: n.orgId, org: n.organizacion, needs: [], activaCount: 0, parcialCount: 0 })
      const g = byOrg.get(n.orgId)!
      g.needs.push(n)
      if (n.status === 'activa') g.activaCount++ ; else g.parcialCount++
    }
    return {
      orgs: [...byOrg.values()].sort((a, b) => b.needs.length - a.needs.length),
      generatedAt: new Date().toLocaleString('es-VE', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'America/Caracas' }),
    }
  } catch (e) {
    clearTimeout(timer)
    throw e
  }
}

// ─── Page component (Satori-compatible, all props passed explicitly) ───────────

function TablePage({
  orgs, pageOrgs, page, totalPages, generatedAt, rowH,
}: {
  orgs: OrgGroup[]
  pageOrgs: OrgGroup[]
  page: number
  totalPages: number
  generatedAt: string
  rowH: number
}) {
  const totalNeeds = orgs.reduce((s, g) => s + g.needs.length, 0)
  const HEADER_H = 90
  const COL_H = 30
  const FOOTER_H = 28
  const PER_PAGE = 8

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: W, height: H, background: '#fff', fontFamily: 'sans-serif' }}>

      {/* Flag stripe */}
      <div style={{ display: 'flex', height: 8 }}>
        <div style={{ flex: 1, background: YELLOW }} />
        <div style={{ flex: 1, background: BLUE }} />
        <div style={{ flex: 1, background: RED }} />
      </div>

      {/* Header */}
      <div style={{ display: 'flex', flexDirection: 'row', background: BLUE, paddingLeft: 40, paddingRight: 40, paddingTop: 10, paddingBottom: 10, height: HEADER_H - 8, alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ color: YELLOW, fontSize: 12, fontWeight: 900 }}>Levantando a Venezuela - Coordinacion de Voluntarios</div>
          <div style={{ color: '#fff', fontSize: 20, fontWeight: 900, marginTop: 2 }}>Centros con Necesidades Criticas</div>
          <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 9, marginTop: 3 }}>ayudaencamino.com - {orgs.length} organizaciones - {totalNeeds} items urgentes</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
          <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 8 }}>Generado el</div>
          <div style={{ color: '#fff', fontSize: 9, fontWeight: 700 }}>{generatedAt}</div>
          <div style={{ display: 'flex', background: 'rgba(255,255,255,0.15)', borderRadius: 20, paddingLeft: 10, paddingRight: 10, paddingTop: 2, paddingBottom: 2, marginTop: 5 }}>
            <div style={{ color: '#fff', fontSize: 9, fontWeight: 700 }}>{page} / {totalPages}</div>
          </div>
        </div>
      </div>

      {/* Column headers */}
      <div style={{ display: 'flex', flexDirection: 'row', height: COL_H, background: DARK, paddingLeft: 40 }}>
        {CLABELS.map((label, ci) => (
          <div key={ci} style={{ display: 'flex', alignItems: 'center', width: CW[ci], paddingLeft: 6, borderRight: ci < CLABELS.length - 1 ? `1px solid #374151` : 'none' }}>
            <div style={{ color: YELLOW, fontSize: 8, fontWeight: 800 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Rows */}
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, paddingLeft: 40 }}>
        {pageOrgs.map((g, ri) => {
          const org = g.org
          const nivel = g.activaCount > 0 ? 'CRITICA' : 'PARCIAL'
          const nivelBg = g.activaCount > 0 ? RED : '#D97706'
          const advText = g.activaCount > 0
            ? `${g.activaCount} sin compromiso`
            : `${g.parcialCount} parcial`
          const recText = org.contactoTelefono
            ? `Llamar: ${org.contactoNombre ? org.contactoNombre + ' ' : ''}${org.contactoTelefono}`
            : org.verificada ? 'Org. verificada - ir directo' : 'Coordinar por redes primero'
          const matLines = g.needs.slice(0, 4).map(n => {
            const rem = n.cantidadNecesaria - n.cantidadComprometida - n.cantidadCumplida
            return `${clip(n.nombreArticulo, 19)}${rem > 0 ? ` x${rem}` : ''}`
          })
          if (g.needs.length > 4) matLines.push(`+${g.needs.length - 4} mas`)
          const tipo = org.tipo.replace(/_/g, ' ')

          return (
            <div key={g.orgId} style={{ display: 'flex', flexDirection: 'row', height: rowH, background: ri % 2 === 1 ? LIGHT : '#fff', borderBottom: `1px solid ${BORDER}` }}>
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', width: CW[0], height: rowH, paddingLeft: 6, paddingRight: 6, borderRight: `1px solid ${BORDER}` }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: DARK }}>{clip(org.nombre, 28)}</div>
                <div style={{ fontSize: 8, color: GRAY, marginTop: 2 }}>{clip(tipo, 22)}</div>
                {org.verificada && <div style={{ fontSize: 8, color: '#059669', marginTop: 1, fontWeight: 700 }}>Verificada</div>}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', width: CW[1], height: rowH, paddingLeft: 6, paddingRight: 6, borderRight: `1px solid ${BORDER}` }}>
                <div style={{ fontSize: 8, color: DARK }}>{clip(org.direccion, 50)}</div>
                <div style={{ fontSize: 8, color: GRAY, marginTop: 2, fontWeight: 600 }}>{org.ciudad}, {org.estado}</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', width: CW[2], height: rowH, paddingLeft: 6, paddingRight: 6, borderRight: `1px solid ${BORDER}` }}>
                {matLines.map((line, li) => (
                  <div key={li} style={{ fontSize: 8, color: DARK }}>{'• '}{line}</div>
                ))}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', width: CW[3], height: rowH, paddingLeft: 6, paddingRight: 6, borderRight: `1px solid ${BORDER}` }}>
                {org.contactoNombre
                  ? <div style={{ fontSize: 8, color: DARK, fontWeight: 600 }}>{clip(org.contactoNombre, 22)}</div>
                  : null}
                {org.contactoTelefono
                  ? <div style={{ fontSize: 8, color: BLUE, marginTop: 2 }}>{org.contactoTelefono}</div>
                  : null}
                {!org.contactoNombre && !org.contactoTelefono
                  ? <div style={{ fontSize: 8, color: GRAY }}>N/D</div>
                  : null}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: CW[4], height: rowH, paddingLeft: 4, paddingRight: 4, borderRight: `1px solid ${BORDER}` }}>
                <div style={{ display: 'flex', background: nivelBg, color: '#fff', fontSize: 8, fontWeight: 800, paddingLeft: 4, paddingRight: 4, paddingTop: 3, paddingBottom: 3, borderRadius: 3 }}>{nivel}</div>
                <div style={{ fontSize: 7, color: GRAY, marginTop: 3 }}>{g.needs.length} items</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', width: CW[5], height: rowH, paddingLeft: 6, paddingRight: 6, borderRight: `1px solid ${BORDER}` }}>
                <div style={{ fontSize: 8, color: '#92400E' }}>{advText}</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', width: CW[6], height: rowH, paddingLeft: 6, paddingRight: 6 }}>
                <div style={{ fontSize: 8, color: '#1E40AF' }}>{clip(recText, 55)}</div>
              </div>
            </div>
          )
        })}
        {pageOrgs.length < PER_PAGE && (
          <div style={{ display: 'flex', flex: 1, background: '#FAFAFA' }} />
        )}
      </div>

      {/* Footer */}
      <div style={{ display: 'flex', height: FOOTER_H, background: '#1F2937', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 8 }}>
          levantandoavenezuela.vercel.app - ayudaencamino.com - Urgencia CRITICA
        </div>
      </div>

    </div>
  )
}

// ─── Route handler ─────────────────────────────────────────────────────────────

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))

  const { orgs, generatedAt } = await fetchOrgs()

  const PER_PAGE = 8
  const pageOrgs = orgs.slice((page - 1) * PER_PAGE, page * PER_PAGE)
  const totalPages = Math.ceil(orgs.length / PER_PAGE)
  if (!pageOrgs.length) return new Response('Page not found', { status: 404 })

  const HEADER_H = 90
  const COL_H = 30
  const FOOTER_H = 28
  const rowH = Math.floor((H - HEADER_H - COL_H - FOOTER_H) / PER_PAGE)

  return new ImageResponse(
    <TablePage
      orgs={orgs}
      pageOrgs={pageOrgs}
      page={page}
      totalPages={totalPages}
      generatedAt={generatedAt}
      rowH={rowH}
    />,
    { width: W, height: H }
  )
}
