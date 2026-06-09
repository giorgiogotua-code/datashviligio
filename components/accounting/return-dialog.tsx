"use client"

import { useState, useEffect } from 'react'
import { Undo2, Minus, Plus, Loader2 } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useStore } from '@/lib/store'
import { issueFiscalReversal, FiscalError } from '@/lib/fiscal'
import { toast } from 'sonner'
import type { Sale, SaleItem } from '@/lib/mock-data'

interface Props {
  open: boolean
  onClose: () => void
  sale: Sale | null
  items: SaleItem[]
}

export function ReturnDialog({ open, onClose, sale, items }: Props) {
  const { addReturn, updateSaleFiscal } = useStore()
  const [qty, setQty] = useState<Record<string, number>>({})
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    // default: full quantity of each line selected for return
    const init: Record<string, number> = {}
    for (const it of items) init[it.id] = it.quantity
    setQty(init)
  }, [items, open])

  const setItemQty = (it: SaleItem, v: number) =>
    setQty(prev => ({ ...prev, [it.id]: Math.max(0, Math.min(it.quantity, v)) }))

  const returnTotal = items.reduce((s, it) => s + it.unit_price * (qty[it.id] ?? 0), 0)
  const returnCount = items.reduce((s, it) => s + (qty[it.id] ?? 0), 0)

  const handleConfirm = async () => {
    if (!sale || busy) return
    const returnItems = items
      .filter(it => (qty[it.id] ?? 0) > 0)
      .map(it => ({
        product_id: it.product_id,
        product_name: it.product_name,
        barcode: it.barcode,
        quantity: qty[it.id],
        unit_price: it.unit_price,
        total_price: it.unit_price * qty[it.id],
      }))

    if (returnItems.length === 0) { toast.error('აირჩიეთ დასაბრუნებელი რაოდენობა'); return }

    setBusy(true)
    try {
      const ret = await addReturn(sale, returnItems)
      if (!ret) return
      toast.success('დაბრუნება დაფიქსირდა, მარაგი დაბრუნდა')
      onClose()

      // Fiscal reversal only if the original sale had a successful fiscal receipt.
      if (sale.is_fiscal && sale.fiscal_status === 'success' && sale.fiscal_id) {
        const ft = toast.loading('ფისკალური დაბრუნების ჩეკი იბეჭდება...')
        try {
          const result = await issueFiscalReversal({
            total: returnTotal,
            paymentMethod: sale.payment_method,
            originalFiscalId: sale.fiscal_id,
            originalDateTime: sale.created_at,
            reason: 'refund',
            items: returnItems.map(i => ({
              name: i.product_name, quantity: i.quantity, unitPrice: i.unit_price,
              total: i.total_price, barcode: i.barcode,
            })),
          })
          await updateSaleFiscal(ret.id, { fiscal_status: 'success', fiscal_id: result.fiscalId, fiscal_data: result.raw })
          toast.success(`დაბრუნების ჩეკი გაიცა #${result.fiscalId}`, { id: ft })
        } catch (e) {
          await updateSaleFiscal(ret.id, { fiscal_status: 'failed' })
          toast.error(e instanceof FiscalError ? e.message : 'დაბრუნების ჩეკი ვერ გაიცა', { id: ft, duration: 6000 })
        }
      }
    } finally {
      setBusy(false)
    }
  }

  if (!sale) return null

  return (
    <Dialog open={open} onOpenChange={v => !v && !busy && onClose()}>
      <DialogContent className="sm:max-w-md rounded-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-black">
            <Undo2 className="size-5 text-amber-600" /> საქონლის დაბრუნება
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-2 py-2 max-h-[50vh] overflow-y-auto">
          {items.map(it => (
            <div key={it.id} className="flex items-center gap-3 bg-muted/30 rounded-2xl p-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{it.product_name}</p>
                <p className="text-xs text-muted-foreground">ნაყიდი: {it.quantity} × ₾{it.unit_price.toFixed(2)}</p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => setItemQty(it, (qty[it.id] ?? 0) - 1)} className="size-7 rounded-lg bg-white border border-border flex items-center justify-center">
                  <Minus className="size-3.5" />
                </button>
                <span className="w-8 text-center text-sm font-bold">{qty[it.id] ?? 0}</span>
                <button onClick={() => setItemQty(it, (qty[it.id] ?? 0) + 1)} className="size-7 rounded-lg bg-white border border-border flex items-center justify-center">
                  <Plus className="size-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between px-1 py-2 border-t border-border">
          <span className="text-sm font-semibold text-muted-foreground">დასაბრუნებელი ({returnCount} ც.):</span>
          <span className="text-xl font-black text-amber-600">₾{returnTotal.toFixed(2)}</span>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="ghost" onClick={onClose} disabled={busy} className="rounded-xl h-11 font-bold">გაუქმება</Button>
          <Button
            onClick={handleConfirm}
            disabled={busy || returnCount === 0}
            className="rounded-xl h-11 px-6 font-black bg-gradient-to-r from-amber-500 to-orange-600 text-white border-0 shadow-lg disabled:opacity-60"
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : <><Undo2 className="size-4 mr-1.5" /> დაბრუნების დადასტურება</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
