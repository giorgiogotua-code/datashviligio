"use client"

import { useState } from 'react'
import { ChevronDown, ChevronRight, Receipt } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { Sale, SaleItem } from '@/lib/mock-data'

const PAGE_SIZE = 25

interface Props {
  sales: Sale[]
  saleItems: SaleItem[]
}

function formatDt(iso: string) {
  const d = new Date(iso)
  const date = `${d.getDate().toString().padStart(2, '0')}.${(d.getMonth() + 1).toString().padStart(2, '0')}.${d.getFullYear()}`
  const time = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
  return { date, time }
}

export function SalesHistory({ sales, saleItems }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [method, setMethod] = useState('all')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  const filtered = sales.filter(s => {
    const matchMethod = method === 'all' || s.payment_method === method
    return matchMethod
  })

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const pageSales = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <div className="flex flex-col gap-4">
      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <Select value={method} onValueChange={(v: string | null) => { setMethod(v ?? 'all'); setPage(1) }}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">ყველა</SelectItem>
            <SelectItem value="cash">ნაღდი</SelectItem>
            <SelectItem value="card">ბარათი</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground w-8"></th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">#</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">თარიღი</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">დრო</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground">პოზ.</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground">გადახდა</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground">სულ</th>
            </tr>
          </thead>
          <tbody>
            {pageSales.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-16 text-muted-foreground">
                  <Receipt className="size-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">გაყიდვები ვერ მოიძებნა</p>
                </td>
              </tr>
            ) : (
              pageSales.map((sale, i) => {
                const { date, time } = formatDt(sale.created_at)
                const isExpanded = expandedId === sale.id
                const items = saleItems.filter(si => si.sale_id === sale.id)
                return (
                  <>
                    <tr
                      key={sale.id}
                      className="border-b border-border/50 cursor-pointer hover:bg-muted/30 transition-colors"
                      onClick={() => setExpandedId(isExpanded ? null : sale.id)}
                    >
                      <td className="px-4 py-3 text-muted-foreground">
                        {isExpanded ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">{(page - 1) * PAGE_SIZE + i + 1}</td>
                      <td className="px-4 py-3 text-foreground">{date}</td>
                      <td className="px-4 py-3 text-muted-foreground">{time}</td>
                      <td className="px-4 py-3 text-center">
                        <Badge variant="secondary">{sale.items_count}</Badge>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge className={cn(
                          sale.payment_method === 'cash'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-blue-100 text-blue-700'
                        )}>
                          {sale.payment_method === 'cash' ? 'ნაღდი' : 'ბარათი'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-primary">₾{sale.total.toFixed(2)}</td>
                    </tr>
                    {isExpanded && items.length > 0 && (
                      <tr key={`${sale.id}-expand`} className="border-b border-border/50 bg-muted/20">
                        <td colSpan={7} className="px-8 py-3">
                          <div className="flex flex-col gap-1.5">
                            {items.map(si => (
                              <div key={si.id} className="flex items-center justify-between text-xs">
                                <span className="text-foreground">{si.product_name}</span>
                                <span className="text-muted-foreground">{si.quantity} x ₾{si.unit_price.toFixed(2)}</span>
                                <span className="font-semibold text-foreground">₾{si.total_price.toFixed(2)}</span>
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                )
              })
            )}
          </tbody>
        </table>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-muted/20">
            <p className="text-xs text-muted-foreground">გვ. {page} / {totalPages}</p>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" disabled={page === 1} onClick={() => setPage(p => p - 1)}>უკან</Button>
              <Button size="sm" variant="outline" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>წინ</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
