"use client"

import { useState, useMemo } from 'react'
import { KpiCards } from '@/components/accounting/kpi-cards'
import { SalesChart } from '@/components/accounting/sales-chart'
import { SalesHistory } from '@/components/accounting/sales-history'
import { InventoryTab } from '@/components/accounting/inventory-tab'
import { FiscalReports } from '@/components/fiscal/fiscal-reports'
import { useStore } from '@/lib/store'
import { cn } from '@/lib/utils'
import { Banknote, CreditCard, BarChart2, History, Package } from 'lucide-react'
import type { Sale } from '@/lib/mock-data'

type Period = 'today' | 'week' | 'month' | 'all'
type Tab    = 'overview' | 'history' | 'inventory'

function filterByPeriod(sales: Sale[], period: Period) {
  const now = new Date()
  return sales.filter(s => {
    const d = new Date(s.created_at)
    if (period === 'today') return d.toDateString() === now.toDateString()
    if (period === 'week') { const start = new Date(now); start.setDate(now.getDate() - 7); return d >= start }
    if (period === 'month') return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    return true
  })
}

const PERIODS: { key: Period; label: string }[] = [
  { key: 'today', label: 'დღეს' },
  { key: 'week',  label: 'კვირა' },
  { key: 'month', label: 'თვე' },
  { key: 'all',   label: 'ყველა' },
]

const TABS: { key: Tab; label: string; icon: React.ElementType }[] = [
  { key: 'overview',  label: 'მიმოხილვა',        icon: BarChart2 },
  { key: 'history',   label: 'გაყიდვების ისტ.', icon: History   },
  { key: 'inventory', label: 'პროდუქცია',        icon: Package   },
]

export default function AccountingPage() {
  const { sales, saleItems } = useStore()
  const [period, setPeriod] = useState<Period>('month')
  const [tab, setTab]       = useState<Tab>('overview')

  const filteredSales = useMemo(() => filterByPeriod(sales, period), [sales, period])

  const cashTotal  = filteredSales.filter(s => s.payment_method === 'cash').reduce((s, x) => s + x.total, 0)
  const cardTotal  = filteredSales.filter(s => s.payment_method === 'card').reduce((s, x) => s + x.total, 0)
  const grandTotal = cashTotal + cardTotal
  const cashPct    = grandTotal > 0 ? Math.round((cashTotal / grandTotal) * 100) : 0

  return (
    <div className="flex flex-col gap-5 animate-fade-up">

      {/* Toolbar: tabs + period picker */}
      <div className="flex items-center justify-between flex-wrap gap-3">

        {/* Tab switcher */}
        <div className="flex items-center gap-1 bg-white border border-border rounded-2xl p-1 shadow-sm">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200',
                tab === key
                  ? 'bg-gradient-to-r from-primary to-indigo-600 text-white shadow-md shadow-primary/25'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent'
              )}
            >
              <Icon className="size-3.5" />
              {label}
            </button>
          ))}
        </div>

        {/* Period pills */}
        <div className="flex items-center gap-1 bg-white border border-border rounded-2xl p-1 shadow-sm">
          {PERIODS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setPeriod(key)}
              className={cn(
                'px-3.5 py-2 rounded-xl text-xs font-bold transition-all duration-200',
                period === key
                  ? 'bg-foreground text-white shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Overview tab */}
      {tab === 'overview' && (
        <div className="flex flex-col gap-5">
          <FiscalReports />
          <KpiCards sales={filteredSales} />
          <SalesChart sales={filteredSales} />

          {/* Payment breakdown */}
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'ნაღდი გადახდა',  amount: cashTotal, pct: cashPct,       icon: Banknote,   gradientFrom: 'from-emerald-500', gradientTo: 'to-teal-500',    softBg: 'bg-emerald-50',  border: 'border-emerald-200', textColor: 'text-emerald-700', pctBg: 'bg-emerald-100 text-emerald-700' },
              { label: 'ბარათი გადახდა', amount: cardTotal, pct: 100 - cashPct, icon: CreditCard, gradientFrom: 'from-blue-500',    gradientTo: 'to-indigo-600', softBg: 'bg-blue-50',     border: 'border-blue-200',    textColor: 'text-blue-700',    pctBg: 'bg-blue-100 text-blue-700'    },
            ].map(item => (
              <div key={item.label} className={cn('card-3d flex items-center gap-4 px-5 py-4 rounded-2xl border bg-white shadow-sm overflow-hidden relative', item.border)}>
                <div className={cn('absolute inset-0 opacity-[0.04] bg-gradient-to-br pointer-events-none', item.gradientFrom, item.gradientTo)} />
                <div className={cn('size-11 rounded-2xl bg-gradient-to-br flex items-center justify-center shadow-md shrink-0', item.gradientFrom, item.gradientTo)}>
                  <item.icon className="size-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground font-semibold">{item.label}</p>
                  <p className="text-2xl font-black text-foreground tabular-nums">₾{item.amount.toFixed(2)}</p>
                </div>
                <div className={cn('shrink-0 text-sm font-black px-3 py-1.5 rounded-xl', item.pctBg)}>
                  {item.pct}%
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'history' && (
        <SalesHistory sales={filteredSales} saleItems={saleItems} />
      )}

      {tab === 'inventory' && (
        <InventoryTab />
      )}
    </div>
  )
}
