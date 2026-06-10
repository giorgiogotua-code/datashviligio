"use client"

import { useState, useMemo, useEffect, useRef } from 'react'
import { Search, Plus, Trash2, Package, ShoppingBag, Loader2, ScanLine } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useStore } from '@/lib/store'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { useBarcodeScanner } from '@/hooks/use-barcode-scanner'
import type { PurchaseItem } from '@/lib/mock-data'

interface Props {
  open: boolean
  onClose: () => void
  presetSupplierId?: string | null
}

type Line = { product_id: string; product_name: string; barcode: string | null; quantity: number; unit_cost: number }

export function PurchaseDialog({ open, onClose, presetSupplierId }: Props) {
  const { products, suppliers, createPurchase } = useStore()
  const [supplierId, setSupplierId] = useState<string>('')
  const [search, setSearch] = useState('')
  const [lines, setLines] = useState<Line[]>([])
  const [paid, setPaid] = useState('')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)

  // Reset on open
  useEffect(() => {
    if (open) {
      setSupplierId(presetSupplierId ?? '')
      setSearch(''); setLines([]); setPaid(''); setNote('')
    }
  }, [open, presetSupplierId])

  const results = useMemo(() => {
    const q = search.toLowerCase().trim()
    if (!q) return []
    return products.filter(p =>
      p.name.toLowerCase().includes(q) || (p.barcode ?? '').includes(q)
    ).slice(0, 6)
  }, [search, products])

  const addLine = (p: typeof products[number]) => {
    setLines(prev => {
      const existing = prev.find(l => l.product_id === p.id)
      if (existing) return prev.map(l => l.product_id === p.id ? { ...l, quantity: l.quantity + 1 } : l)
      return [...prev, { product_id: p.id, product_name: p.name, barcode: p.barcode ?? null, quantity: 1, unit_cost: p.purchase_price || 0 }]
    })
    setSearch('')
  }

  const updateLine = (id: string, patch: Partial<Line>) =>
    setLines(prev => prev.map(l => l.product_id === id ? { ...l, ...patch } : l))
  const removeLine = (id: string) => setLines(prev => prev.filter(l => l.product_id !== id))

  // Barcode: scanner (global) + manual Enter both add the matching product.
  // dedup so a scan into the focused input doesn't add twice.
  const lastAdd = useRef<{ code: string; t: number }>({ code: '', t: 0 })
  const addByBarcode = (raw: string) => {
    const code = raw.trim()
    if (!code) return
    const now = Date.now()
    if (lastAdd.current.code === code && now - lastAdd.current.t < 500) return
    const p = products.find(pr => pr.barcode === code)
    if (!p) { toast.error(`შტრიხკოდი ვერ მოიძებნა: ${code}`); return }
    lastAdd.current = { code, t: now }
    addLine(p)
    toast.success(`✓ ${p.name}`, { duration: 1200 })
  }

  // Hardware scanner — active only while this dialog is open.
  useBarcodeScanner({ onScan: addByBarcode, disabled: !open })

  const handleSearchEnter = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return
    e.preventDefault()
    const exact = products.find(pr => pr.barcode === search.trim())
    if (exact) addByBarcode(search)
    else if (results.length === 1) { addLine(results[0]); setSearch('') }
  }

  const total = lines.reduce((s, l) => s + l.quantity * l.unit_cost, 0)
  const itemsCount = lines.reduce((s, l) => s + l.quantity, 0)
  const paidValue = paid === '' ? total : Math.max(0, parseFloat(paid) || 0)
  const debt = Math.max(0, total - paidValue)

  const handleSave = async () => {
    if (lines.length === 0) { toast.error('დაამატეთ პროდუქცია'); return }
    setSaving(true)
    const supplier = suppliers.find(s => s.id === supplierId)
    const items: Omit<PurchaseItem, 'id' | 'purchase_id'>[] = lines.map(l => ({
      product_id: l.product_id, product_name: l.product_name, barcode: l.barcode,
      quantity: l.quantity, unit_cost: l.unit_cost, total_cost: l.quantity * l.unit_cost,
    }))
    const res = await createPurchase(
      {
        supplier_id: supplierId || null,
        supplier_name: supplier?.name ?? null,
        total, paid: paidValue, items_count: itemsCount, note: note.trim() || null,
      },
      items
    )
    setSaving(false)
    if (res) {
      toast.success(`შესყიდვა დასრულდა — ${itemsCount} ცალი, ₾${total.toFixed(2)}`)
      onClose()
    }
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-2xl rounded-[24px] p-6 max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-xl font-black flex items-center gap-2">
            <ShoppingBag className="size-5 text-primary" /> ახალი შესყიდვა
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2 overflow-y-auto flex-1">
          {/* Supplier */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide pl-1">მომწოდებელი</label>
            <Select value={supplierId} onValueChange={(v: string | null) => setSupplierId(v === 'none' || v === null ? '' : v)}>
              <SelectTrigger className="h-11 rounded-xl border-border/60 bg-white">
                <SelectValue placeholder="— აირჩიეთ მომწოდებელი —">
                  {(v: string | null) => !v ? '— ფასდაუდებლად —' : (suppliers.find(s => s.id === v)?.name ?? '—')}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="none" className="rounded-lg text-muted-foreground">— ფასდაუდებლად —</SelectItem>
                {suppliers.map(s => <SelectItem key={s.id} value={s.id} className="rounded-lg">{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Product search */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide pl-1 flex items-center gap-1.5">
              პროდუქციის დამატება
              <span className="inline-flex items-center gap-1 text-primary/70 normal-case font-medium"><ScanLine className="size-3" /> სკანერი მუშაობს</span>
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input className="h-11 pl-9 rounded-xl" placeholder="სახელი ან შტრიხკოდი (დაასკანერე ან აკრიფე)..." value={search} onChange={e => setSearch(e.target.value)} onKeyDown={handleSearchEnter} autoFocus />
              {results.length > 0 && (
                <div className="absolute z-20 top-12 left-0 right-0 bg-white rounded-xl border border-border shadow-xl overflow-hidden max-h-56 overflow-y-auto">
                  {results.map(p => (
                    <button key={p.id} onClick={() => addLine(p)} className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-muted/60 text-left transition-colors border-b border-border/40 last:border-0">
                      <div className="size-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                        <Package className="size-4 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{p.name}</p>
                        <p className="text-[11px] text-muted-foreground">მარაგი: {p.quantity} · ფასი: ₾{p.purchase_price.toFixed(2)}</p>
                      </div>
                      <Plus className="size-4 text-primary" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Lines */}
          {lines.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
              <Package className="size-8 opacity-30" />
              <p className="text-sm">მოძებნე და დაამატე პროდუქცია</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {/* header */}
              <div className="grid grid-cols-[1fr_70px_90px_80px_32px] gap-2 px-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wide">
                <span>პროდუქტი</span><span className="text-center">რაოდ.</span><span className="text-center">ფასი</span><span className="text-right">ჯამი</span><span></span>
              </div>
              {lines.map(l => (
                <div key={l.product_id} className="grid grid-cols-[1fr_70px_90px_80px_32px] gap-2 items-center bg-muted/30 rounded-xl p-2">
                  <span className="text-sm font-semibold text-foreground truncate pl-1">{l.product_name}</span>
                  <Input type="number" min="1" value={l.quantity}
                    onChange={e => updateLine(l.product_id, { quantity: Math.max(1, parseInt(e.target.value) || 1) })}
                    className="h-9 text-center rounded-lg px-1" />
                  <Input type="number" min="0" step="0.01" value={l.unit_cost}
                    onChange={e => updateLine(l.product_id, { unit_cost: Math.max(0, parseFloat(e.target.value) || 0) })}
                    className="h-9 text-center rounded-lg px-1" />
                  <span className="text-sm font-bold text-foreground text-right tabular-nums">₾{(l.quantity * l.unit_cost).toFixed(2)}</span>
                  <button onClick={() => removeLine(l.product_id)} className="size-8 rounded-lg hover:bg-red-50 hover:text-red-500 text-muted-foreground flex items-center justify-center transition-all">
                    <Trash2 className="size-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer: totals + paid + note + action */}
        <div className="border-t border-border pt-4 mt-2 flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide pl-1">გადახდილი ₾</label>
              <Input type="number" min="0" inputMode="decimal" className="h-11 rounded-xl" placeholder={total.toFixed(2)} value={paid} onChange={e => setPaid(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide pl-1">შენიშვნა</label>
              <Input className="h-11 rounded-xl" placeholder="არასავალდებულო" value={note} onChange={e => setNote(e.target.value)} />
            </div>
          </div>

          <div className="flex items-center justify-between bg-muted/40 rounded-2xl px-4 py-3">
            <div className="flex gap-5 text-sm">
              <span className="text-muted-foreground">სულ: <strong className="text-foreground">₾{total.toFixed(2)}</strong></span>
              {debt > 0 && <span className="text-red-600 font-semibold">ვალი: ₾{debt.toFixed(2)}</span>}
            </div>
            <Button onClick={handleSave} disabled={saving || lines.length === 0}
              className="rounded-xl h-11 px-6 bg-gradient-to-r from-primary to-indigo-600 border-0 font-black text-white">
              {saving ? <Loader2 className="size-4 animate-spin" /> : 'შესყიდვა'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
