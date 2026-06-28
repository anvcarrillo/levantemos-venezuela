'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

function CountUp({ value }: { value: number }) {
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (value === 0) return
    const duration = 1400
    const step = value / (duration / 16)
    let current = 0
    const timer = setInterval(() => {
      current += step
      if (current >= value) {
        setCount(value)
        clearInterval(timer)
      } else {
        setCount(Math.floor(current))
      }
    }, 16)
    return () => clearInterval(timer)
  }, [value])

  return <>{count}</>
}

const SECTIONS = [
  {
    icon: '📋',
    title: 'Recursos & Apps',
    href: '/recursos',
    description: 'Directorio completo de apps, grupos de WhatsApp, redes de apoyo y recursos útiles para la emergencia.',
    color: 'blue' as const,
    countKey: 'resources',
  },
  {
    icon: '🏛️',
    title: 'Fundaciones',
    href: '/fundaciones',
    description: 'Organizaciones verificadas que aceptan donaciones nacionales e internacionales.',
    color: 'green' as const,
    countKey: 'foundations',
  },
  {
    icon: '📍',
    title: 'Zonas de Interés',
    href: '/zonas',
    description: 'Mapa interactivo con centros de acopio, refugios y comedores activos en las zonas afectadas.',
    color: 'yellow' as const,
    countKey: null,
  },
  {
    icon: '🔍',
    title: 'Lista de Desaparecidos',
    href: '/desaparecidos',
    description: 'Personas reportadas como desaparecidas o encontradas tras el terremoto. Información actualizada por la comunidad.',
    color: 'red' as const,
    countKey: 'missing',
  },
  {
    icon: '💡',
    title: 'Iniciativas de Ciudadanos',
    href: '/iniciativas',
    description: 'Acciones organizadas por la comunidad venezolana dentro y fuera del país.',
    color: 'purple' as const,
    countKey: null,
  },
]

const COLOR = {
  blue:   { border: 'border-[#003DA5]', bg: 'bg-blue-50',   icon: 'bg-[#003DA5]/10', badge: 'bg-[#003DA5]/10 text-[#003DA5]', link: 'text-[#003DA5]'  },
  green:  { border: 'border-emerald-500', bg: 'bg-emerald-50', icon: 'bg-emerald-100', badge: 'bg-emerald-100 text-emerald-700', link: 'text-emerald-600' },
  yellow: { border: 'border-[#FCD116]', bg: 'bg-yellow-50', icon: 'bg-[#FCD116]/20', badge: 'bg-[#FCD116]/20 text-amber-700',  link: 'text-amber-600'  },
  red:    { border: 'border-[#CF0921]', bg: 'bg-red-50',    icon: 'bg-[#CF0921]/10', badge: 'bg-[#CF0921]/10 text-[#CF0921]', link: 'text-[#CF0921]'  },
  purple: { border: 'border-purple-400', bg: 'bg-purple-50', icon: 'bg-purple-100',   badge: 'bg-purple-100 text-purple-700',  link: 'text-purple-600' },
}

export default function LandingDashboard({
  counts,
}: {
  counts: { resources: number; foundations: number; missing: number }
}) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 80)
    return () => clearTimeout(t)
  }, [])

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
      {SECTIONS.map((section, i) => {
        const c = COLOR[section.color]
        const count = section.countKey ? counts[section.countKey as keyof typeof counts] : null

        return (
          <Link
            key={section.href}
            href={section.href}
            className={`group relative bg-white rounded-2xl border-2 ${c.border} p-6 flex flex-col gap-4
              shadow-sm hover:shadow-xl hover:shadow-black/10 hover:-translate-y-1.5 transition-all duration-300 cursor-pointer
              ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
            style={{
              transitionDelay: visible ? '0ms' : `${i * 90}ms`,
              transitionProperty: 'opacity, transform, box-shadow',
              transitionDuration: '400ms',
            }}
          >
            {/* Icon */}
            <div className={`w-14 h-14 rounded-2xl ${c.icon} flex items-center justify-center text-3xl`}>
              {section.icon}
            </div>

            {/* Content */}
            <div className="flex-1">
              <h3 className="font-bold text-gray-900 text-lg leading-tight">{section.title}</h3>
              <p className="text-sm text-gray-500 mt-1.5 leading-relaxed">{section.description}</p>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between pt-1 border-t border-gray-100">
              {count !== null ? (
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${c.badge}`}>
                  <CountUp value={count} /> entradas
                </span>
              ) : (
                <span className="text-xs text-gray-400 italic">Próximamente más info</span>
              )}
              <span className={`text-sm font-semibold ${c.link} group-hover:underline`}>
                Ver →
              </span>
            </div>
          </Link>
        )
      })}
    </div>
  )
}
