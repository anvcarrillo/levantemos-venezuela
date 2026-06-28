import type { Metadata } from 'next'
import { Geist } from 'next/font/google'
import Link from 'next/link'
import './globals.css'
import { supabase } from '@/lib/supabase'
import NavMenu from './components/NavMenu'

const geist = Geist({ subsets: ['latin'], variable: '--font-geist' })

export const metadata: Metadata = {
  title: 'Levantando a Venezuela — Directorio de Recursos',
  description: 'Directorio de recursos, fundaciones e iniciativas para la crisis del terremoto en Venezuela',
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [{ data: categories }, { data: foundationCategories }, { data: zoneCategories }] =
    await Promise.all([
      supabase.from('resources_categories').select('*').order('name'),
      supabase.from('foundation_categories').select('*').order('name'),
      supabase.from('zones_categories').select('*').order('name'),
    ])

  return (
    <html lang="es" className={`${geist.variable} h-full antialiased`}>
      <body className="min-h-full bg-gray-50 text-gray-900">
        <nav className="bg-[#003DA5] sticky top-0 z-40 shadow-md">
          <div className="max-w-5xl mx-auto px-6 py-3.5 flex items-center justify-between">
            <Link href="/" className="font-black text-lg text-[#FCD116] hover:text-yellow-300 transition-colors tracking-tight">
              Levantando a Venezuela
            </Link>
            <NavMenu
              categories={categories ?? []}
              foundationCategories={foundationCategories ?? []}
              zoneCategories={zoneCategories ?? []}
            />
          </div>
        </nav>
        <main className="max-w-5xl mx-auto px-6 py-10">{children}</main>
      </body>
    </html>
  )
}
