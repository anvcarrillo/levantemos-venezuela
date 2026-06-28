import { ImageResponse } from 'next/og'

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          width: 1080,
          height: 1350,
          backgroundColor: '#003DA5',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div style={{ color: '#FCD116', fontSize: 60, fontWeight: 900 }}>
          Levantando a Venezuela
        </div>
      </div>
    ),
    { width: 1080, height: 1350 }
  )
}
