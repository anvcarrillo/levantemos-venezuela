import { ImageResponse } from 'next/og'

const W = 1080
const H = 1350
const YELLOW = '#FCD116'
const BLUE = '#003DA5'
const RED = '#CF0921'
const DARK = '#111827'
const GRAY = '#6B7280'
const LIGHT = '#F3F4F6'
const CW = [160, 148, 200, 128, 68, 148, 148]

function clip(s: string, max: number) {
  return s.length > max ? s.slice(0, max - 1) + '...' : s
}

type Org = {
  nombre: string; tipo: string; estado: string; ciudad: string
  direccion: string; contactoNombre: string | null; contactoTelefono: string | null; verificada: boolean
}
type OrgGroup = { orgId: number; org: Org; matLines: string[]; activaCount: number; parcialCount: number; totalItems: number }

// Static test data — no network needed
const TEST_ORGS: OrgGroup[] = [
  { orgId: 1, activaCount: 55, parcialCount: 0, totalItems: 55, org: { nombre: 'CENTRO DE ACOPIO CENTRO PARIMA', tipo: 'centro acopio', estado: 'Caracas DC', ciudad: 'Caracas', direccion: 'Av Libertador frente al Centro Parima', contactoNombre: 'Pedro Gonzalez', contactoTelefono: '0412-5551234', verificada: true }, matLines: ['Esmeril x5', 'Disco de corte x10', 'Mandarria x3', 'Agua mineral x200', '+51 mas'] },
  { orgId: 2, activaCount: 13, parcialCount: 0, totalItems: 13, org: { nombre: 'Bomberos de la UCV', tipo: 'otro', estado: 'Caracas DC', ciudad: 'Caracas', direccion: 'Ciudad Universitaria, UCV, Caracas', contactoNombre: null, contactoTelefono: '0212-6052222', verificada: true }, matLines: ['Equipo rescate x2', 'Cuerda seguridad x5', 'Linterna x10', 'Radio x3'] },
  { orgId: 3, activaCount: 8, parcialCount: 0, totalItems: 8, org: { nombre: 'Tu Protocolo Venezuela', tipo: 'otro', estado: 'Caracas DC', ciudad: 'Caracas', direccion: 'Caracas, zona norte', contactoNombre: 'Katerine Falcon', contactoTelefono: '04244948304', verificada: false }, matLines: ['Dermalon 3-0 x10', 'Suero x20', 'Gasas x100', 'Guantes x50'] },
  { orgId: 4, activaCount: 5, parcialCount: 0, totalItems: 5, org: { nombre: 'Instituto Diseno Caracas', tipo: 'lugar afectado', estado: 'Caracas DC', ciudad: 'Caracas', direccion: 'El Bosque, Caracas', contactoNombre: 'Maria Lopez', contactoTelefono: '04123334455', verificada: true }, matLines: ['Generador x1', 'Comida x100 raciones', 'Agua x50 litros'] },
  { orgId: 5, activaCount: 4, parcialCount: 0, totalItems: 4, org: { nombre: 'Residencias Vista Mar', tipo: 'lugar afectado', estado: 'La Guaira', ciudad: 'Caraballeda', direccion: 'Av. La Playa, Caraballeda, La Guaira', contactoNombre: 'Carlos Ruiz', contactoTelefono: '04165556789', verificada: false }, matLines: ['Medicamentos x30', 'Mantas x20', 'Comida x50'] },
  { orgId: 6, activaCount: 3, parcialCount: 0, totalItems: 3, org: { nombre: 'Residencias Palmar', tipo: 'lugar afectado', estado: 'La Guaira', ciudad: 'Caraballeda', direccion: 'Calle El Palmar, Caraballeda', contactoNombre: null, contactoTelefono: null, verificada: false }, matLines: ['Agua x100 litros', 'Alimentos no perecederos x30', 'Ropa x20 kg'] },
  { orgId: 7, activaCount: 2, parcialCount: 0, totalItems: 2, org: { nombre: 'HOSPITAL PEREZ CARRENO', tipo: 'hospital centro medico', estado: 'Caracas DC', ciudad: 'Caracas', direccion: 'La Yaguara, Caracas', contactoNombre: 'Dra. Ana Blanco', contactoTelefono: '0212-4421111', verificada: true }, matLines: ['Antibioticos x50 cajas', 'Suero x100 bolsas'] },
  { orgId: 8, activaCount: 2, parcialCount: 0, totalItems: 2, org: { nombre: 'HOSPITAL VARGAS', tipo: 'hospital centro medico', estado: 'Caracas DC', ciudad: 'Caracas', direccion: 'San Jose, Caracas', contactoNombre: 'Dr. Luis Mendez', contactoTelefono: '0212-4623344', verificada: true }, matLines: ['Analgesicos x30', 'Vendas x200'] },
]

const COL_BORDER = { borderRightWidth: 1, borderRightStyle: 'solid' as const, borderRightColor: '#E5E7EB' }
const DARK_COL_BORDER = { borderRightWidth: 1, borderRightStyle: 'solid' as const, borderRightColor: '#374151' }
const ROW_BORDER = { borderBottomWidth: 1, borderBottomStyle: 'solid' as const, borderBottomColor: '#E5E7EB' }

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))

  const pageOrgs = TEST_ORGS.slice((page - 1) * 8, page * 8)
  if (!pageOrgs.length) return new Response('Page not found', { status: 404 })

  const rowH = Math.floor((H - 90 - 30 - 28) / 8)
  const totalPages = Math.ceil(TEST_ORGS.length / 8)

  return new ImageResponse(
    <div style={{ display: 'flex', flexDirection: 'column', width: W, height: H, backgroundColor: '#ffffff', fontFamily: 'sans-serif' }}>

      {/* Flag */}
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
          <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 9, marginTop: 3 }}>ayudaencamino.com - {TEST_ORGS.length} organizaciones</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
          <div style={{ color: '#ffffff', fontSize: 9, fontWeight: 700 }}>Datos en vivo</div>
          <div style={{ display: 'flex', flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 20, paddingLeft: 10, paddingRight: 10, paddingTop: 2, paddingBottom: 2, marginTop: 5 }}>
            <div style={{ color: '#ffffff', fontSize: 9, fontWeight: 700 }}>{page} / {totalPages}</div>
          </div>
        </div>
      </div>

      {/* Column headers */}
      <div style={{ display: 'flex', flexDirection: 'row', height: 30, backgroundColor: DARK, paddingLeft: 40 }}>
        <div style={{ display: 'flex', alignItems: 'center', width: CW[0], paddingLeft: 6, ...DARK_COL_BORDER }}><div style={{ color: YELLOW, fontSize: 8, fontWeight: 800 }}>CENTRO</div></div>
        <div style={{ display: 'flex', alignItems: 'center', width: CW[1], paddingLeft: 6, ...DARK_COL_BORDER }}><div style={{ color: YELLOW, fontSize: 8, fontWeight: 800 }}>DIRECCION</div></div>
        <div style={{ display: 'flex', alignItems: 'center', width: CW[2], paddingLeft: 6, ...DARK_COL_BORDER }}><div style={{ color: YELLOW, fontSize: 8, fontWeight: 800 }}>MATERIALES</div></div>
        <div style={{ display: 'flex', alignItems: 'center', width: CW[3], paddingLeft: 6, ...DARK_COL_BORDER }}><div style={{ color: YELLOW, fontSize: 8, fontWeight: 800 }}>CONTACTO</div></div>
        <div style={{ display: 'flex', alignItems: 'center', width: CW[4], paddingLeft: 4, ...DARK_COL_BORDER }}><div style={{ color: YELLOW, fontSize: 8, fontWeight: 800 }}>NIVEL</div></div>
        <div style={{ display: 'flex', alignItems: 'center', width: CW[5], paddingLeft: 6, ...DARK_COL_BORDER }}><div style={{ color: YELLOW, fontSize: 8, fontWeight: 800 }}>ADVERTENCIAS</div></div>
        <div style={{ display: 'flex', alignItems: 'center', width: CW[6], paddingLeft: 6 }}><div style={{ color: YELLOW, fontSize: 8, fontWeight: 800 }}>RECOMENDACIONES</div></div>
      </div>

      {/* Rows */}
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, paddingLeft: 40 }}>
        {pageOrgs.map((g, ri) => {
          const nivelBg = g.activaCount > 0 ? RED : '#D97706'
          const nivelLabel = g.activaCount > 0 ? 'CRITICA' : 'PARCIAL'
          const rowBg = ri % 2 === 1 ? LIGHT : '#ffffff'
          const recText = g.org.contactoTelefono
            ? 'Llamar: ' + (g.org.contactoNombre ? g.org.contactoNombre.split(' ')[0] + ' ' : '') + g.org.contactoTelefono
            : g.org.verificada ? 'Org. verificada' : 'Coordinar por redes'
          return (
            <div key={String(g.orgId)} style={{ display: 'flex', flexDirection: 'row', height: rowH, backgroundColor: rowBg, ...ROW_BORDER }}>
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', width: CW[0], paddingLeft: 6, paddingRight: 6, ...COL_BORDER }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: DARK }}>{clip(g.org.nombre, 28)}</div>
                <div style={{ fontSize: 8, color: GRAY, marginTop: 2 }}>{clip(g.org.tipo, 22)}</div>
                {g.org.verificada ? <div style={{ fontSize: 8, color: '#059669', fontWeight: 700 }}>Verificada</div> : null}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', width: CW[1], paddingLeft: 6, paddingRight: 6, ...COL_BORDER }}>
                <div style={{ fontSize: 8, color: DARK }}>{clip(g.org.direccion, 50)}</div>
                <div style={{ fontSize: 8, color: GRAY, marginTop: 2, fontWeight: 600 }}>{g.org.ciudad}, {g.org.estado}</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', width: CW[2], paddingLeft: 6, paddingRight: 6, ...COL_BORDER }}>
                {g.matLines.map((line, li) => (
                  <div key={String(li)} style={{ fontSize: 8, color: DARK }}>{'• '}{line}</div>
                ))}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', width: CW[3], paddingLeft: 6, paddingRight: 6, ...COL_BORDER }}>
                {g.org.contactoNombre ? <div style={{ fontSize: 8, color: DARK, fontWeight: 600 }}>{clip(g.org.contactoNombre, 22)}</div> : null}
                {g.org.contactoTelefono ? <div style={{ fontSize: 8, color: BLUE, marginTop: 2 }}>{g.org.contactoTelefono}</div> : null}
                {!g.org.contactoNombre && !g.org.contactoTelefono ? <div style={{ fontSize: 8, color: GRAY }}>N/D</div> : null}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: CW[4], ...COL_BORDER }}>
                <div style={{ display: 'flex', flexDirection: 'row', backgroundColor: nivelBg, borderRadius: 3, paddingLeft: 4, paddingRight: 4, paddingTop: 3, paddingBottom: 3 }}>
                  <div style={{ color: '#ffffff', fontSize: 8, fontWeight: 800 }}>{nivelLabel}</div>
                </div>
                <div style={{ fontSize: 7, color: GRAY, marginTop: 3 }}>{String(g.totalItems)} items</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', width: CW[5], paddingLeft: 6, paddingRight: 6, ...COL_BORDER }}>
                <div style={{ fontSize: 8, color: '#92400E' }}>{String(g.activaCount)} sin compromiso</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', width: CW[6], paddingLeft: 6, paddingRight: 6 }}>
                <div style={{ fontSize: 8, color: '#1E40AF' }}>{clip(recText, 55)}</div>
              </div>
            </div>
          )
        })}
        {pageOrgs.length < 8 ? <div style={{ display: 'flex', flex: 1, backgroundColor: '#FAFAFA' }} /> : null}
      </div>

      {/* Footer */}
      <div style={{ display: 'flex', flexDirection: 'row', height: 28, backgroundColor: '#1F2937', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 8 }}>levantandoavenezuela.vercel.app - ayudaencamino.com - Urgencia CRITICA</div>
      </div>

    </div>,
    { width: W, height: H }
  )
}
