"use client"

import { useState, useEffect, useCallback } from 'react'
import { useStore } from '@/lib/store'
import { cn } from '@/lib/utils'
import { Lock, Delete, ShieldCheck } from 'lucide-react'

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del']

export function PinLock() {
  const { isLocked, unlock, settings } = useStore()
  const [input, setInput] = useState('')
  const [shake, setShake] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleKey = useCallback((key: string) => {
    if (key === 'del') {
      setInput(p => p.slice(0, -1))
      return
    }
    if (input.length >= 6) return
    const next = input + key
    setInput(next)

    if (next.length >= 4) {
      const ok = unlock(next)
      if (ok) {
        setSuccess(true)
        setTimeout(() => { setSuccess(false); setInput('') }, 400)
      } else if (next.length === 6 || next.length === 4) {
        setShake(true)
        setTimeout(() => { setShake(false); setInput('') }, 600)
      }
    }
  }, [input, unlock])

  // Keyboard support
  useEffect(() => {
    if (!isLocked) return
    const handler = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') handleKey(e.key)
      if (e.key === 'Backspace') handleKey('del')
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isLocked, handleKey])

  if (!isLocked) return null

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-gradient-to-br from-slate-100 via-blue-50 to-indigo-100">
      {/* Decorative blobs */}
      <div className="absolute top-0 left-0 size-96 rounded-full bg-primary/8 blur-3xl -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
      <div className="absolute bottom-0 right-0 size-80 rounded-full bg-indigo-400/10 blur-3xl translate-x-1/3 translate-y-1/3 pointer-events-none" />

      <div className="relative w-full max-w-xs mx-4">
        {/* Card */}
        <div className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl shadow-primary/10 border border-white/60 px-8 py-10 flex flex-col items-center gap-7">

          {/* Icon */}
          <div className={cn(
            'size-16 rounded-2xl flex items-center justify-center transition-all duration-300',
            success
              ? 'bg-gradient-to-br from-emerald-400 to-teal-500 shadow-lg shadow-emerald-500/30'
              : 'bg-gradient-to-br from-primary to-indigo-700 shadow-lg shadow-primary/30'
          )}>
            {success
              ? <ShieldCheck className="size-8 text-white" />
              : <Lock className="size-8 text-white" />
            }
          </div>

          {/* Title */}
          <div className="text-center">
            <h2 className="text-lg font-bold text-foreground">
              {settings.companyName || 'AccessoryShop'}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">PIN კოდი შეიყვანეთ</p>
          </div>

          {/* Dots */}
          <div className={cn('flex items-center gap-3 transition-all', shake && 'animate-shake')}>
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  'size-3.5 rounded-full border-2 transition-all duration-200',
                  i < input.length
                    ? success
                      ? 'bg-emerald-500 border-emerald-500 scale-110'
                      : 'bg-primary border-primary scale-110'
                    : shake
                      ? 'bg-red-300 border-red-400'
                      : 'bg-transparent border-border'
                )}
              />
            ))}
          </div>

          {/* Numpad */}
          <div className="grid grid-cols-3 gap-3 w-full">
            {KEYS.map((key, i) => {
              if (key === '') return <div key={i} />
              const isDel = key === 'del'
              return (
                <button
                  key={i}
                  onClick={() => handleKey(key)}
                  className={cn(
                    'h-14 rounded-2xl text-base font-semibold transition-all duration-150 active:scale-95 select-none',
                    isDel
                      ? 'bg-muted text-muted-foreground hover:bg-destructive/10 hover:text-destructive flex items-center justify-center'
                      : 'bg-accent hover:bg-primary hover:text-white hover:shadow-md hover:shadow-primary/30 text-foreground'
                  )}
                >
                  {isDel ? <Delete className="size-4.5" /> : key}
                </button>
              )
            })}
          </div>

          {shake && (
            <p className="text-xs text-red-500 font-medium animate-fade-in">PIN კოდი არასწორია</p>
          )}
        </div>
      </div>
    </div>
  )
}
