"use client"

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import type { Sale } from '@/lib/mock-data'

interface Props { sales: Sale[] }

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number; name: string }[]; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-border rounded-2xl shadow-xl px-4 py-3 text-xs">
      <p className="font-bold text-foreground mb-2">{label}</p>
      {payload.map(p => (
        <div key={p.name} className="flex justify-between gap-6">
          <span className="text-muted-foreground">{p.name}:</span>
          <span className="font-bold text-primary">₾{p.value.toFixed(2)}</span>
        </div>
      ))}
    </div>
  )
}

export function SalesChart({ sales }: Props) {
  const byDate: Record<string, { revenue: number; profit: number }> = {}
  sales.forEach(s => {
    const d   = new Date(s.created_at)
    const key = `${d.getDate().toString().padStart(2,'0')}.${(d.getMonth()+1).toString().padStart(2,'0')}`
    if (!byDate[key]) byDate[key] = { revenue: 0, profit: 0 }
    byDate[key].revenue += s.total
    byDate[key].profit  += s.total * 0.4
  })

  const data = Object.entries(byDate)
    .sort((a, b) => {
      const [ad, am] = a[0].split('.').map(Number)
      const [bd, bm] = b[0].split('.').map(Number)
      return am !== bm ? am - bm : ad - bd
    })
    .map(([date, v], i) => ({ date, შემოსავალი: Math.round(v.revenue*100)/100, მოგება: Math.round(v.profit*100)/100, idx: i }))

  const maxIdx = data.reduce((mi, d, i, arr) => d.შემოსავალი > arr[mi].შემოსავალი ? i : mi, 0)

  return (
    <div className="bg-white rounded-2xl border border-border shadow-sm p-5">
      <div className="flex items-center justify-between mb-5">
        <div>
          <p className="text-sm font-bold text-foreground">გაყიდვების დინამიკა</p>
          <p className="text-xs text-muted-foreground mt-0.5">შემოსავალი და მოგება</p>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-sm bg-primary inline-block" />
            <span className="text-muted-foreground">შემოსავალი</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-sm bg-emerald-400 inline-block" />
            <span className="text-muted-foreground">მოგება</span>
          </div>
        </div>
      </div>

      {data.length === 0 ? (
        <div className="h-52 flex items-center justify-center text-muted-foreground text-sm">მონაცემი არ არის</div>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data} barGap={3} barCategoryGap="35%">
            <defs>
              <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="oklch(0.56 0.24 262)" />
                <stop offset="100%" stopColor="oklch(0.56 0.24 262 / 0.7)" />
              </linearGradient>
              <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#34d399" />
                <stop offset="100%" stopColor="#34d399bb" />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8', fontWeight: 500 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={v => `₾${v}`} width={56} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'oklch(0.56 0.24 262 / 0.04)', radius: 8 } as unknown as React.ReactElement} />
            <Bar dataKey="შემოსავალი" fill="url(#revenueGrad)" radius={[8,8,0,0]} maxBarSize={36}>
              {data.map((d) => (
                <Cell key={d.date} fillOpacity={d.idx === maxIdx ? 1 : 0.7} />
              ))}
            </Bar>
            <Bar dataKey="მოგება" fill="url(#profitGrad)" radius={[8,8,0,0]} maxBarSize={36} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
