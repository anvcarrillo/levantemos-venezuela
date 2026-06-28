'use client'

import { useEffect, useState } from 'react'

function timeAgo(dateStr: string): string {
  const minutes = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000)
  if (minutes < 2) return 'hace un momento'
  if (minutes < 60) return `hace ${minutes} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `hace ${hours}h`
  return `hace ${Math.floor(hours / 24)} días`
}

export default function SummaryBanner({
  megaSynthesis,
  createdAt,
}: {
  megaSynthesis: string
  createdAt: string
}) {
  const [ago, setAgo] = useState('')

  useEffect(() => {
    setAgo(timeAgo(createdAt))
    const interval = setInterval(() => setAgo(timeAgo(createdAt)), 60000)
    return () => clearInterval(interval)
  }, [createdAt])

  return (
    <div className="bg-white border-2 border-[#003DA5] rounded-2xl p-5 mb-10 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-2.5 rounded-full overflow-hidden w-8">
            <div className="flex-1 bg-[#FCD116]" />
            <div className="flex-1 bg-[#003DA5]" />
            <div className="flex-1 bg-[#CF0921]" />
          </div>
          <span className="text-sm font-bold text-[#003DA5] uppercase tracking-wide">
            ¿Qué se necesita ahora?
          </span>
        </div>
        {ago && (
          <span className="text-xs text-gray-400">Actualizado {ago}</span>
        )}
      </div>

      {/* Mega synthesis */}
      <p className="text-gray-800 text-base leading-relaxed font-medium">
        {megaSynthesis}
      </p>

      {/* Download button */}
      <div className="mt-4 flex justify-end">
        <a
          href="/api/summary-image"
          download="resumen-levantando-venezuela.png"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 bg-[#003DA5] text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-blue-800 transition-colors"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Descargar resumen para compartir
        </a>
      </div>
    </div>
  )
}
