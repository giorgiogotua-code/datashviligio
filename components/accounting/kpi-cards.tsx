"use client"

import { useEffect, useRef, useState } from 'react'
import { TrendingUp, ShoppingBag, DollarSign, Receipt, ArrowUpRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Sale } from '@/lib/mock-data'

interface Props { sales: Sale[] }

function useCountUp(target: number, duration = 900) {
  const [value, setValue] = useState(0)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    const start = performance.now()
    const from = 0
    const step = (now: number) => {
      const pct = Math.min((now - start) / duration, 1)
      const ease = 1 - Math.pow(1 - pct, 3)
      setValue(from + (target - from) * ease)
      if (pct < 1) rafRef.current = requestAnimationFrame(step)
    }
    rafRef.current = requestAnimationFrame(step)
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [target, duration])

  return value
}

function KpiCard({
  label, rawValue, formatted, sub, icon: Icon,
  gradient, iconGradient, sparkColor, delay,
}: {
  label: string
  rawValue: number
  formatted: string
  sub: string
  icon: React.ElementType
  gradient: string
  iconGradient: string
  sparkColor: string
  delay: number
}) {
  const animated = useCountUp(rawValue)
  const isMonetary = formatted.startsWith('₾')
  const display = isMonetary ? `₾${animated.toFixed(2)}` : String(Math.round(animated))

  return (
    <div
      className={cn('card-3d animate-fade-up relative overflow-hidden rounded-2xl border border-border bg-white p-5 flex flex-col gap-4 cursor-default')}
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* Gradient top strip */}
      <div className={cn('absolute inset-x-0 top-0 h-1 rounded-t-2xl bg-gradient-to-r', gradient)} />

      {/* Subtle background tint */}
      <div className={cn('absolute inset-0 opacity-[0.03] bg-gradient-to-br rounded-2xl pointer-events-none', gradient)} />

      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{label}</p>
        </div>
        <div className={cn('size-10 rounded-2xl bg-gradient-to-br flex items-center justify-center shadow-lg', iconGradient)}>
          <Icon className="size-4.5 text-white" />
        </div>
      </div>

      <div className="relative">
        <p className="text-3xl font-black text-foreground tabular-nums tracking-tight leading-none">
          {display}
        </p>
        <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
          <span className={cn('inline-flex items-center gap-0.5 text-xs font-semibold', sparkColor)}>
            <ArrowUpRight className="size-3" />
            +12%
          </span>
          {sub}
        </p>
      </div>
    </div>
  )
}

export function KpiCards({ sales }: Props) {
  const total  = sales.reduce((s, x) => s + x.total, 0)
  const count  = sales.length
  const profit = total * 0.4
  const avg    = count > 0 ? total / count : 0

  const cards = [
    { label: 'შემოსავალი',      rawValue: total,  formatted: `₾${total.toFixed(2)}`,  sub: `${count} გაყიდვა`,      icon: TrendingUp,  gradient: 'from-blue-500 to-indigo-600',   iconGradient: 'from-blue-500 to-indigo-600',   sparkColor: 'text-blue-500',    delay: 0   },
    { label: 'გაყიდვები',       rawValue: count,  formatted: String(count),            sub: 'დასრულებული',           icon: ShoppingBag, gradient: 'from-violet-500 to-purple-600', iconGradient: 'from-violet-500 to-purple-600', sparkColor: 'text-violet-500',  delay: 60  },
    { label: 'მოგება (~40%)',   rawValue: profit, formatted: `₾${profit.toFixed(2)}`, sub: 'სავარაუდო',            icon: DollarSign,  gradient: 'from-emerald-500 to-teal-500',  iconGradient: 'from-emerald-500 to-teal-500',  sparkColor: 'text-emerald-500', delay: 120 },
    { label: 'საშ. ქვითარი',   rawValue: avg,    formatted: `₾${avg.toFixed(2)}`,    sub: 'ერთ გაყიდვაზე',        icon: Receipt,     gradient: 'from-amber-400 to-orange-500',  iconGradient: 'from-amber-400 to-orange-500',  sparkColor: 'text-amber-500',   delay: 180 },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map(card => <KpiCard key={card.label} {...card} />)}
    </div>
  )
}
