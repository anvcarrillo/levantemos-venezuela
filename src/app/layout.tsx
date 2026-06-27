import type { Metadata } from 'next'
import { Geist } from 'next/font/google'
import Link from 'next/link'
import './globals.css'

const geist = Geist({ subsets: ['latin'], variable: '--font-geist' })

export const metadata: Metadata = {
  title: 'Directorio de Recursos — Terremoto Venezuela',
  description: 'Directorio de recursos y fundaciones para la crisis del terremoto en Venezuela',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${geist.variable} h-full antialiased`}>
      <body className="min-h-full bg-gray-50 text-gray-900">
        <nav className="bg-white border-b border-gray-200">
          <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
            <Link href="/" className="font-bold text-gray-900 hover:text-gray-700">
              Levantando a Venezuela
            </Link>
            <div className="flex gap-6 text-sm">
              <Link href="/" className="text-gray-600 hover:text-gray-900 transition-colors">
                Recursos
              </Link>
              <Link href="/fundaciones" className="text-gray-600 hover:text-gray-900 transition-colors">
                Fundaciones
              </Link>
            </div>
          </div>
        </nav>
        <main className="max-w-5xl mx-auto px-6 py-10">{children}</main>
      </body>
    </html>
  )
}
