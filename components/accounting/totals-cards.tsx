"use client"

import { Boxes, TrendingDown, Wallet, Layers } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useStore } from '@/lib/store'
import { saleAmount } from '@/lib/mock-data'

// All-time business snapshot — independent of the period filter above.
export function TotalsCards() {
  const { products, purchases, sales, saleItems } = useStore()

  // Current stock value at cost.
  const inventoryValue = products.reduce((s, p) => s + p.purchase_price * p.quantity, 0)

  // All money ever spent on purchases.
  const totalExpense = purchases.reduce((s, p) => s + p.total, 0)

  // All-time profit = all revenue − all COGS (cost at sale time, fallback to current).
  const costOf = (id: string | null) => (id ? products.find(p => p.id === id)?.purchase_price ?? 0 : 0)
  const saleType = new Map(sales.map(s => [s.id, s.type]))
  const allRevenue = sales.reduce((s, x) => s + saleAmount(x), 0)
  const allCogs = saleItems.reduce((s, it) => {
    const t = saleType.get(it.sale_id)
    if (!t) return s
    const dir = t === 'return' ? -1 : 1
    const cost = it.unit_cost || costOf(it.product_id)
    return s + dir * cost * it.quantity
  }, 0)
  const totalProfit = allRevenue - allCogs

  const cards = [
    {
      label: 'სრული ღირებულება', value: inventoryValue, sub: 'ნაშთის ღირებულება თვითღირებულებით',
      icon: Boxes, gradient: 'from-indigo-500 to-blue-600', valueColor: 'text-foreground',
    },
    {
      label: 'სრული ხარჯი', value: totalExpense, sub: 'ყველა შესყიდვა ჯამში',
      icon: TrendingDown, gradient: 'from-rose-500 to-red-600', valueColor: 'text-rose-600',
    },
    {
      label: 'სრული მოგება', value: totalProfit, sub: 'ყველა დროის (შემოსავალი − თვითღირებულება)',
      icon: Wallet, gradient: 'from-emerald-500 to-teal-600', valueColor: totalProfit >= 0 ? 'text-emerald-600' : 'text-rose-600',
    },
  ]

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 px-1">
        <Layers className="size-4 text-muted-foreground" />
        <h3 className="text-sm font-bold text-foreground">ბიზნესის სრული სურათი</h3>
        <span className="text-[11px] text-muted-foreground">· ყველა დროის ჯამური მაჩვენებლები (პერიოდის ფილტრის გარეშე)</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {cards.map((c, i) => (
          <div
            key={c.label}
            className="card-3d animate-fade-up relative overflow-hidden rounded-2xl border border-border bg-white p-5 flex flex-col gap-4"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <div className={cn('absolute inset-x-0 top-0 h-1 rounded-t-2xl bg-gradient-to-r', c.gradient)} />
            <div className={cn('absolute inset-0 opacity-[0.03] bg-gradient-to-br rounded-2xl pointer-events-none', c.gradient)} />
            <div className="relative flex items-start justify-between">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{c.label}</p>
              <div className={cn('size-10 rounded-2xl bg-gradient-to-br flex items-center justify-center shadow-lg', c.gradient)}>
                <c.icon className="size-4.5 text-white" />
              </div>
            </div>
            <div className="relative">
              <p className={cn('text-3xl font-black tabular-nums tracking-tight leading-none', c.valueColor)}>
                ₾{c.value.toFixed(2)}
              </p>
              <p className="text-xs text-muted-foreground mt-2">{c.sub}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
