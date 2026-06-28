import { ImageResponse } from 'next/og'

const W = 1080
const H = 1350
const YELLOW = '#FCD116'
const BLUE = '#003DA5'
const RED = '#CF0921'
const DARK = '#111827'
const GRAY = '#6B7280'
const LIGHT = '#F3F4F6'

// 7 column widths — 1000px total (40px left pad, 40px right pad)
const CW = [160, 148, 200, 128, 68, 148, 148]

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

async function fetchOrgs(): Promise<{ orgs: OrgGroup[]; generatedAt: string; error?: string }> {
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
      if (n.status === 'activa') { g.activaCount++ } else { g.parcialCount++ }
    }
    return { orgs: [...byOrg.values()].sort((a, b) => b.needs.length - a.needs.length), generatedAt }
  } catch (e) {
    return { orgs: [], generatedAt, error: String(e) }
  }
}

// Shared border style for column separators (long-form — Satori-safe)
const COL_BORDER = {
  borderRightWidth: 1,
  borderRightStyle: 'solid' as const,
  borderRightColor: '#E5E7EB',
}

const COL_BORDER_DARK = {
  borderRightWidth: 1,
  borderRightStyle: 'solid' as const,
  borderRightColor: '#374151',
}

const ROW_BORDER = {
  borderBottomWidth: 1,
  borderBottomStyle: 'solid' as const,
  borderBottomColor: '#E5E7EB',
}

function TablePage({ orgs, pageOrgs, page, totalPages, generatedAt, rowH }: {
  orgs: OrgGroup[]; pageOrgs: OrgGroup[]; page: number; totalPages: number; generatedAt: string; rowH: number
}) {
  const totalNeeds = orgs.reduce((s, g) => s + g.needs.length, 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: W, height: H, backgroundColor: '#ffffff', fontFamily: 'sans-serif' }}>

      {/* Flag stripe */}
      <div style={{ display: 'flex', flexDirection: 'row', height: 8 }}>
        <div style={{ flex: 1, backgroundColor: YELLOW }} />
        <div style={{ flex: 1, backgroundColor: BLUE }} />
        <div style={{ flex: 1, backgroundColor: RED }} />
      </div>

      {/* Header */}
      <div style={{ display: 'flex', flexDirection: 'row', backgroundColor: BLUE, paddingLeft: 40, paddingRight: 40, paddingTop: 10, paddingBottom: 10, height: 82, alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ color: YELLOW, fontSize: 12, fontWeight: 900 }}>Levantando a Venezuela - Coordinacion de Voluntarios</div>
          <div style={{ color: '#ffffff', fontSize: 20, fontWeight: 900, marginTop: 2 }}>Centros con Necesidades Criticas</div>
          <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 9, marginTop: 3 }}>ayudaencamino.com - {orgs.length} organizaciones - {totalNeeds} items urgentes</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
          <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 8 }}>Generado el</div>
          <div style={{ color: '#ffffff', fontSize: 9, fontWeight: 700 }}>{generatedAt}</div>
          <div style={{ display: 'flex', flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 20, paddingLeft: 10, paddingRight: 10, paddingTop: 2, paddingBottom: 2, marginTop: 5 }}>
            <div style={{ color: '#ffffff', fontSize: 9, fontWeight: 700 }}>{page} / {totalPages}</div>
          </div>
        </div>
      </div>

      {/* Column headers row */}
      <div style={{ display: 'flex', flexDirection: 'row', height: 30, backgroundColor: DARK, paddingLeft: 40 }}>
        <div style={{ display: 'flex', alignItems: 'center', width: CW[0], paddingLeft: 6, ...COL_BORDER_DARK }}>
          <div style={{ color: YELLOW, fontSize: 8, fontWeight: 800 }}>CENTRO</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', width: CW[1], paddingLeft: 6, ...COL_BORDER_DARK }}>
          <div style={{ color: YELLOW, fontSize: 8, fontWeight: 800 }}>DIRECCIÓN</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', width: CW[2], paddingLeft: 6, ...COL_BORDER_DARK }}>
          <div style={{ color: YELLOW, fontSize: 8, fontWeight: 800 }}>MATERIALES</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', width: CW[3], paddingLeft: 6, ...COL_BORDER_DARK }}>
          <div style={{ color: YELLOW, fontSize: 8, fontWeight: 800 }}>CONTACTO</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', width: CW[4], paddingLeft: 4, ...COL_BORDER_DARK }}>
          <div style={{ color: YELLOW, fontSize: 8, fontWeight: 800 }}>NIVEL</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', width: CW[5], paddingLeft: 6, ...COL_BORDER_DARK }}>
          <div style={{ color: YELLOW, fontSize: 8, fontWeight: 800 }}>ADVERTENCIAS</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', width: CW[6], paddingLeft: 6 }}>
          <div style={{ color: YELLOW, fontSize: 8, fontWeight: 800 }}>RECOMENDACIONES</div>
        </div>
      </div>

      {/* Data rows */}
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, paddingLeft: 40 }}>
        {pageOrgs.map((g, ri) => {
          const org = g.org
          const nivelBg = g.activaCount > 0 ? RED : '#D97706'
          const nivelLabel = g.activaCount > 0 ? 'CRITICA' : 'PARCIAL'
          const advText = g.activaCount > 0
            ? String(g.activaCount) + ' sin compromiso'
            : String(g.parcialCount) + ' parcial'
          const recText = org.contactoTelefono
            ? 'Llamar: ' + (org.contactoNombre ? org.contactoNombre.split(' ')[0] + ' ' : '') + org.contactoTelefono
            : org.verificada ? 'Org. verificada - ir directo' : 'Coordinar por redes primero'
          const tipo = org.tipo.replace(/_/g, ' ')
          const matLines: string[] = g.needs.slice(0, 4).map(n => {
            const rem = n.cantidadNecesaria - n.cantidadComprometida - n.cantidadCumplida
            return clip(n.nombreArticulo, 20) + (rem > 0 ? ' x' + String(rem) : '')
          })
          if (g.needs.length > 4) matLines.push('+' + String(g.needs.length - 4) + ' mas')
          const rowBg = ri % 2 === 1 ? LIGHT : '#ffffff'

          return (
            <div key={String(g.orgId)} style={{ display: 'flex', flexDirection: 'row', height: rowH, backgroundColor: rowBg, ...ROW_BORDER }}>
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', width: CW[0], height: rowH, paddingLeft: 6, paddingRight: 6, ...COL_BORDER }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: DARK }}>{clip(org.nombre, 28)}</div>
                <div style={{ fontSize: 8, color: GRAY, marginTop: 2 }}>{clip(tipo, 22)}</div>
                {org.verificada ? <div style={{ fontSize: 8, color: '#059669', marginTop: 1, fontWeight: 700 }}>Verificada</div> : null}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', width: CW[1], height: rowH, paddingLeft: 6, paddingRight: 6, ...COL_BORDER }}>
                <div style={{ fontSize: 8, color: DARK }}>{clip(org.direccion, 50)}</div>
                <div style={{ fontSize: 8, color: GRAY, marginTop: 2, fontWeight: 600 }}>{org.ciudad}, {org.estado}</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', width: CW[2], height: rowH, paddingLeft: 6, paddingRight: 6, ...COL_BORDER }}>
                {matLines.map((line, li) => (
                  <div key={String(li)} style={{ fontSize: 8, color: DARK }}>{'• '}{line}</div>
                ))}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', width: CW[3], height: rowH, paddingLeft: 6, paddingRight: 6, ...COL_BORDER }}>
                {org.contactoNombre ? <div style={{ fontSize: 8, color: DARK, fontWeight: 600 }}>{clip(org.contactoNombre, 22)}</div> : null}
                {org.contactoTelefono ? <div style={{ fontSize: 8, color: BLUE, marginTop: 2 }}>{org.contactoTelefono}</div> : null}
                {!org.contactoNombre && !org.contactoTelefono ? <div style={{ fontSize: 8, color: GRAY }}>N/D</div> : null}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: CW[4], height: rowH, paddingLeft: 4, paddingRight: 4, ...COL_BORDER }}>
                <div style={{ display: 'flex', flexDirection: 'row', backgroundColor: nivelBg, borderRadius: 3, paddingLeft: 4, paddingRight: 4, paddingTop: 3, paddingBottom: 3 }}>
                  <div style={{ color: '#ffffff', fontSize: 8, fontWeight: 800 }}>{nivelLabel}</div>
                </div>
                <div style={{ fontSize: 7, color: GRAY, marginTop: 3 }}>{String(g.needs.length)} items</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', width: CW[5], height: rowH, paddingLeft: 6, paddingRight: 6, ...COL_BORDER }}>
                <div style={{ fontSize: 8, color: '#92400E' }}>{advText}</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', width: CW[6], height: rowH, paddingLeft: 6, paddingRight: 6 }}>
                <div style={{ fontSize: 8, color: '#1E40AF' }}>{clip(recText, 55)}</div>
              </div>
            </div>
          )
        })}
        {pageOrgs.length < 8
          ? <div style={{ display: 'flex', flex: 1, backgroundColor: '#FAFAFA' }} />
          : null}
      </div>

      {/* Footer */}
      <div style={{ display: 'flex', flexDirection: 'row', height: 28, backgroundColor: '#1F2937', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 8 }}>levantandoavenezuela.vercel.app - ayudaencamino.com - Urgencia CRITICA</div>
      </div>

    </div>
  )
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))

  const { orgs, generatedAt, error } = await fetchOrgs()

  if (!orgs.length) {
    return new ImageResponse(
      <div style={{ display: 'flex', width: W, height: H, backgroundColor: BLUE, alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
        <div style={{ color: YELLOW, fontSize: 30, fontWeight: 900 }}>Levantando a Venezuela</div>
        <div style={{ color: '#ffffff', fontSize: 16, marginTop: 20 }}>Datos no disponibles temporalmente</div>
        {error ? <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10, marginTop: 10 }}>{String(error).slice(0, 80)}</div> : null}
      </div>,
      { width: W, height: H }
    )
  }

  const PER_PAGE = 8
  const pageOrgs = orgs.slice((page - 1) * PER_PAGE, page * PER_PAGE)
  const totalPages = Math.ceil(orgs.length / PER_PAGE)
  if (!pageOrgs.length) return new Response('Page not found', { status: 404 })

  const rowH = Math.floor((H - 90 - 30 - 28) / PER_PAGE)

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
