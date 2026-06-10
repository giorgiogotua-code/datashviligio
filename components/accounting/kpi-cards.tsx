"use client"

import { useEffect, useRef, useState } from 'react'
import { TrendingUp, ShoppingBag, DollarSign, Receipt } from 'lucide-react'
import { cn } from '@/lib/utils'
import { saleAmount, type Sale, type SaleItem, type Product, type Purchase } from '@/lib/mock-data'

interface Props {
  sales: Sale[]
  saleItems: SaleItem[]
  products: Product[]
  purchases: Purchase[]
}

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
  label, rawValue, monetary, sub, icon: Icon,
  gradient, iconGradient, valueColor, delay,
}: {
  label: string
  rawValue: number
  monetary: boolean
  sub: string
  icon: React.ElementType
  gradient: string
  iconGradient: string
  valueColor?: string
  delay: number
}) {
  const animated = useCountUp(rawValue)
  const display = monetary ? `₾${animated.toFixed(2)}` : String(Math.round(animated))

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
        <p className={cn('text-3xl font-black tabular-nums tracking-tight leading-none', valueColor ?? 'text-foreground')}>
          {display}
        </p>
        <p className="text-xs text-muted-foreground mt-2">{sub}</p>
      </div>
    </div>
  )
}

export function KpiCards({ sales, saleItems, products, purchases }: Props) {
  const total = sales.reduce((s, x) => s + saleAmount(x), 0) // revenue, net of returns
  const count = sales.filter(s => s.type === 'sale').length

  // Real expense = money spent on purchases (restocking) in this period.
  const expense = purchases.reduce((s, p) => s + p.total, 0)

  // Real profit = revenue − cost of goods sold (COGS).
  // COGS uses each sold product's current purchase_price (best estimate).
  const costOf = (id: string | null) => (id ? products.find(p => p.id === id)?.purchase_price ?? 0 : 0)
  const saleType = new Map(sales.map(s => [s.id, s.type]))
  const cogs = saleItems.reduce((s, it) => {
    const t = saleType.get(it.sale_id)
    if (!t) return s // item not in the current period
    const dir = t === 'return' ? -1 : 1
    return s + dir * costOf(it.product_id) * it.quantity
  }, 0)
  const profit = total - cogs

  const avg = count > 0 ? total / count : 0

  const cards = [
    { label: 'შემოსავალი',        rawValue: total,   monetary: true, sub: `${count} გაყიდვა`,                icon: TrendingUp,  gradient: 'from-blue-500 to-indigo-600',   iconGradient: 'from-blue-500 to-indigo-600',   delay: 0   },
    { label: 'ხარჯი (შესყიდვები)', rawValue: expense, monetary: true, sub: 'პროდუქციის შესყიდვაზე',          icon: ShoppingBag, gradient: 'from-rose-500 to-red-600',      iconGradient: 'from-rose-500 to-red-600',      valueColor: 'text-rose-600', delay: 60  },
    { label: 'მოგება',            rawValue: profit,  monetary: true, sub: 'გაყიდულის თვითღირებულების გამოკლებით', icon: DollarSign,  gradient: 'from-emerald-500 to-teal-500',  iconGradient: 'from-emerald-500 to-teal-500',  valueColor: profit >= 0 ? 'text-emerald-600' : 'text-rose-600', delay: 120 },
    { label: 'საშ. ქვითარი',     rawValue: avg,     monetary: true, sub: 'ერთ გაყიდვაზე',                   icon: Receipt,     gradient: 'from-amber-400 to-orange-500',  iconGradient: 'from-amber-400 to-orange-500',  delay: 180 },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map(card => <KpiCard key={card.label} {...card} />)}
    </div>
  )
}
