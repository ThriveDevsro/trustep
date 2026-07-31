'use client'

import { useEffect, useRef, useState } from 'react'
import { Check, ChevronDown } from 'lucide-react'
import { useLanguage } from '@/components/LanguageProvider'

const languages = [
  { value: 'sk' as const, short: 'SK', label: 'Slovenčina' },
  { value: 'en' as const, short: 'EN', label: 'English' },
]

export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { language, setLanguage } = useLanguage()
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function close(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  const current = languages.find((item) => item.value === language) ?? languages[0]

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className={`inline-flex items-center gap-1.5 rounded-full bg-gray-100 font-extrabold text-[#111827] transition-colors hover:bg-gray-200 ${
          compact ? 'px-3 py-2 text-[11px]' : 'px-4 py-2.5 text-xs'
        }`}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label="Vybrať jazyk"
      >
        {current.short}
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-[70] mt-2 w-44 overflow-hidden rounded-2xl border border-gray-200 bg-white p-1.5 text-[#111827] shadow-[0_16px_50px_rgba(17,24,39,0.14)]">
          {languages.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => {
                setLanguage(item.value)
                setOpen(false)
              }}
              className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm font-bold transition-colors ${
                language === item.value ? 'bg-gray-100' : 'hover:bg-gray-50'
              }`}
              role="option"
              aria-selected={language === item.value}
            >
              <span>{item.label}</span>
              {language === item.value && <Check className="h-4 w-4 text-[#ff4f00]" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
