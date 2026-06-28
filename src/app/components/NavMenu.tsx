'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { Category, FoundationCategory } from '@/lib/supabase'

const ZONE_ITEMS = [
  { name: 'Centros de Acopio', slug: 'centros-acopio' },
  { name: 'Refugios para Niños', slug: 'refugios-ninos' },
  { name: 'Comedores', slug: 'comedores' },
]

export default function NavMenu({
  categories,
  foundationCategories,
}: {
  categories: Category[]
  foundationCategories: FoundationCategory[]
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const pathname = usePathname()

  useEffect(() => { setOpen(false) }, [pathname])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const close = () => setOpen(false)

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
      >
        Menú
        <svg
          className={`w-4 h-4 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-gray-200 z-50 overflow-hidden py-1">

          {/* Recursos & Apps */}
          <Link href="/recursos" onClick={close} className="flex items-center gap-2 px-4 py-2.5 font-medium text-sm text-gray-900 hover:bg-gray-50">
            <span>📋</span> Recursos & Apps
          </Link>
          {categories.map(cat => (
            <Link key={cat.id} href={`/recursos#${cat.slug}`} onClick={close}
              className="flex pl-10 pr-4 py-1.5 text-xs text-gray-500 hover:bg-blue-50 hover:text-blue-700">
              {cat.name}
            </Link>
          ))}

          <div className="my-1 border-t border-gray-100" />

          {/* Fundaciones */}
          <Link href="/fundaciones" onClick={close} className="flex items-center gap-2 px-4 py-2.5 font-medium text-sm text-gray-900 hover:bg-gray-50">
            <span>🏛️</span> Fundaciones
          </Link>
          {foundationCategories.map(cat => (
            <Link key={cat.id} href={`/fundaciones#${cat.slug}`} onClick={close}
              className="flex pl-10 pr-4 py-1.5 text-xs text-gray-500 hover:bg-blue-50 hover:text-blue-700">
              {cat.name}
            </Link>
          ))}

          <div className="my-1 border-t border-gray-100" />

          {/* Iniciativas */}
          <Link href="/iniciativas" onClick={close} className="flex items-center gap-2 px-4 py-2.5 font-medium text-sm text-gray-900 hover:bg-gray-50">
            <span>💡</span> Iniciativas de Ciudadanos
          </Link>

          <div className="my-1 border-t border-gray-100" />

          {/* Zonas de Interés */}
          <Link href="/zonas" onClick={close} className="flex items-center gap-2 px-4 py-2.5 font-medium text-sm text-gray-900 hover:bg-gray-50">
            <span>📍</span> Zonas de Interés
          </Link>
          {ZONE_ITEMS.map(z => (
            <Link key={z.slug} href={`/zonas#${z.slug}`} onClick={close}
              className="flex pl-10 pr-4 py-1.5 text-xs text-gray-500 hover:bg-blue-50 hover:text-blue-700">
              {z.name}
            </Link>
          ))}

          <div className="my-1 border-t border-gray-100" />

          {/* Desaparecidos */}
          <Link href="/desaparecidos" onClick={close} className="flex items-center gap-2 px-4 py-2.5 font-medium text-sm text-gray-900 hover:bg-gray-50">
            <span>🔍</span> Lista de Desaparecidos
          </Link>
        </div>
      )}
    </div>
  )
}
