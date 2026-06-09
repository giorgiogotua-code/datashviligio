"use client"

import { useState } from 'react'
import { AlertTriangle, Download, ArrowUp, ArrowDown } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useStore } from '@/lib/store'

type SortKey = 'name' | 'quantity' | 'purchase_price' | 'sale_price' | 'value' | 'potential'
type SortDir = 'asc' | 'desc'

export function InventoryTab() {
  const { products, categories } = useStore()
  const [sortKey, setSortKey] = useState<SortKey>('name')
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  const getCatName = (id: string) => categories.find(c => c.id === id)?.name ?? '—'

  const enriched = products.map(p => ({
    ...p,
    catName: getCatName(p.category_id),
    value: p.purchase_price * p.quantity,
    potential: p.sale_price * p.quantity,
  }))

  const totalValue = enriched.reduce((s, p) => s + p.value, 0)
  const totalPotential = enriched.reduce((s, p) => s + p.potential, 0)
  const lowStock = enriched.filter(p => p.quantity <= 5)

  const handleSort = (key: SortKey) => {
    if (key === sortKey) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }

  const sorted = [...enriched].sort((a, b) => {
    let va: string | number = a[sortKey] as string | number
    let vb: string | number = b[sortKey] as string | number
    if (typeof va === 'string') va = va.toLowerCase()
    if (typeof vb === 'string') vb = vb.toLowerCase()
    if (va < vb) return sortDir === 'asc' ? -1 : 1
    if (va > vb) return sortDir === 'asc' ? 1 : -1
    return 0
  })

  const downloadCSV = () => {
    const header = 'სახელი,კატეგ.,მარაგი,შეს.ფასი,გაყ.ფასი,ღირებ.,პოტ.'
    const rows = sorted.map(p =>
      `${p.name},${p.catName},${p.quantity},${p.purchase_price},${p.sale_price},${p.value.toFixed(2)},${p.potential.toFixed(2)}`
    )
    const csv = [header, ...rows].join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'inventory.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  const SortIcon = ({ k }: { k: SortKey }) =>
    sortKey === k
      ? sortDir === 'asc' ? <ArrowUp className="size-3 inline ml-1" /> : <ArrowDown className="size-3 inline ml-1" />
      : null

  return (
    <div className="flex flex-col gap-5">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'პროდუქტების სახეობა', value: products.length, suffix: '' },
          { label: 'საწყობის ღირებულება', value: totalValue.toFixed(2), suffix: '₾' },
          { label: 'პოტ. შემოსავალი', value: totalPotential.toFixed(2), suffix: '₾' },
        ].map(card => (
          <div key={card.label} className="card-3d bg-white rounded-2xl border border-border shadow-sm p-5">
            <p className="text-xs text-muted-foreground mb-1">{card.label}</p>
            <p className="text-2xl font-bold text-foreground">
              {card.suffix}{card.value}
            </p>
          </div>
        ))}
      </div>

      {/* Low stock */}
      {lowStock.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="size-4 text-amber-600" />
            <span className="text-sm font-semibold text-amber-800">მცირე მარაგი</span>
            <Badge className="bg-amber-200 text-amber-800">{lowStock.length}</Badge>
          </div>
          <div className="flex flex-col gap-1.5">
            {lowStock.map(p => (
              <div key={p.id} className="flex items-center justify-between text-sm">
                <span className="text-amber-900 font-medium">{p.name}</span>
                <div className="flex items-center gap-3 text-amber-700 text-xs">
                  <span>{p.catName}</span>
                  <Badge className="bg-red-100 text-red-700">{p.quantity} ერთ.</Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <p className="text-sm font-semibold">სრული ასორტიმენტი</p>
          <Button size="sm" variant="outline" onClick={downloadCSV}>
            <Download data-icon="inline-start" />
            CSV გადმოწერა
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                {([
                  ['name', 'სახელი'],
                  ['catName', 'კატეგ.'],
                  ['quantity', 'მარაგი'],
                  ['purchase_price', 'შეს. ფასი'],
                  ['sale_price', 'გაყ. ფასი'],
                  ['value', 'ღირებ.'],
                  ['potential', 'პოტ.'],
                ] as [SortKey | 'catName', string][]).map(([k, label]) => (
                  <th
                    key={k}
                    className="px-4 py-3 text-xs font-semibold text-muted-foreground text-left cursor-pointer hover:text-foreground select-none"
                    onClick={() => k !== 'catName' && handleSort(k as SortKey)}
                  >
                    {label}
                    {k !== 'catName' && <SortIcon k={k as SortKey} />}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map((p, i) => (
                <tr key={p.id} className="border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-medium text-foreground max-w-48">
                    <span className="line-clamp-1">{p.name}</span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{p.catName}</td>
                  <td className="px-4 py-3">
                    <Badge className={cn(
                      p.quantity === 0 ? 'bg-red-100 text-red-700' :
                      p.quantity <= 3 ? 'bg-red-100 text-red-700' :
                      p.quantity <= 10 ? 'bg-amber-100 text-amber-700' :
                      'bg-green-100 text-green-700'
                    )}>
                      {p.quantity}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">₾{p.purchase_price.toFixed(2)}</td>
                  <td className="px-4 py-3 font-semibold text-primary">₾{p.sale_price.toFixed(2)}</td>
                  <td className="px-4 py-3 text-foreground">₾{p.value.toFixed(2)}</td>
                  <td className="px-4 py-3 text-emerald-700 font-semibold">₾{p.potential.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
