"use client"

import { useState, useEffect, useMemo } from 'react'
import { Banknote, Square, Printer, CheckCircle2, ArrowRight } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { useStore } from '@/lib/store'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import type { Shift } from '@/lib/mock-data'

interface Props {
  open: boolean
  onClose: () => void
  shift: Shift | null
}

function Row({ label, value, strong, color }: { label: string; value: string; strong?: boolean; color?: string }) {
  return (
    <div className="flex justify-between items-center text-sm">
      <span className={cn('text-muted-foreground', strong && 'font-semibold text-foreground')}>{label}</span>
      <span className={cn('tabular-nums', strong ? 'font-black' : 'font-semibold', color ?? 'text-foreground')}>{value}</span>
    </div>
  )
}

export function CloseShiftDialog({ open, onClose, shift }: Props) {
  const { sales, closeShift } = useStore()
  const [countedCash, setCountedCash] = useState('')
  const [saving, setSaving] = useState(false)
  const [report, setReport] = useState<Shift | null>(null)

  useEffect(() => { if (open) { setCountedCash(''); setReport(null) } }, [open])

  // Live preview from this shift's sales.
  const preview = useMemo(() => {
    if (!shift) return null
    const ss = sales.filter(s => s.shift_id === shift.id)
    const sum = (pred: (s: typeof ss[number]) => boolean, field: 'total' | 'paid' = 'total') =>
      ss.filter(pred).reduce((a, s) => a + (field === 'paid' ? (s.paid ?? 0) : s.total), 0)
    const cash = sum(s => s.payment_method === 'cash' && s.type === 'sale')
    const card = sum(s => s.payment_method === 'card' && s.type === 'sale')
    const credit = sum(s => s.payment_method === 'credit' && s.type === 'sale')
    const creditPaid = sum(s => s.payment_method === 'credit' && s.type === 'sale', 'paid')
    const returns = sum(s => s.type === 'return')
    const cashReturns = sum(s => s.type === 'return' && s.payment_method === 'cash')
    const count = ss.filter(s => s.type === 'sale').length
    const expected = shift.opening_cash + cash + creditPaid - cashReturns
    return { cash, card, credit, creditPaid, returns, count, expected }
  }, [sales, shift])

  if (!shift) return null

  const counted = Math.max(0, parseFloat(countedCash) || 0)
  const diff = report ? report.difference : counted - (preview?.expected ?? 0)

  const handleClose = async () => {
    setSaving(true)
    const closed = await closeShift(shift.id, counted)
    setSaving(false)
    if (closed) { setReport(closed); toast.success('ცვლა დაიხურა — Z-რეპორტი მზადაა') }
  }

  const r = report // authoritative when present, else preview
  const total = (r ? r.cash_sales + r.card_sales + r.credit_sales - r.returns_total
                   : (preview ? preview.cash + preview.card + preview.credit - preview.returns : 0))

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-md rounded-[24px] p-6">
        <DialogHeader>
          <DialogTitle className="text-xl font-black flex items-center gap-2">
            {report ? <><CheckCircle2 className="size-5 text-emerald-500" /> Z-რეპორტი</> : <><Square className="size-5 text-amber-500" /> ცვლის დახურვა</>}
          </DialogTitle>
          <DialogDescription>
            {shift.cashier_name} · გახსნა {new Date(shift.opened_at).toLocaleString('ka-GE', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}
          </DialogDescription>
        </DialogHeader>

        <div id="receipt-print" className="flex flex-col gap-2.5 py-2">
          <div className="bg-muted/40 rounded-2xl p-4 flex flex-col gap-1.5">
            <Row label="საწყისი კასა" value={`₾${shift.opening_cash.toFixed(2)}`} />
            <Row label="ნაღდი გაყიდვები" value={`₾${(r ? r.cash_sales : preview!.cash).toFixed(2)}`} />
            <Row label="ბარათით" value={`₾${(r ? r.card_sales : preview!.card).toFixed(2)}`} />
            <Row label="ნისიით (სულ)" value={`₾${(r ? r.credit_sales : preview!.credit).toFixed(2)}`} />
            <Row label="ნისიის გადახდილი (ნაღდი)" value={`₾${(r ? r.credit_paid : preview!.creditPaid).toFixed(2)}`} />
            {(r ? r.returns_total : preview!.returns) > 0 && (
              <Row label="დაბრუნებები" value={`−₾${(r ? r.returns_total : preview!.returns).toFixed(2)}`} color="text-red-600" />
            )}
            <Separator className="my-1 opacity-50" />
            <Row label="გაყიდვების ჯამი" value={`₾${total.toFixed(2)}`} strong />
            <Row label="გაყიდვების რაოდენობა" value={String(r ? r.sales_count : preview!.count)} />
          </div>

          {/* Cash reconciliation */}
          <div className="bg-gradient-to-br from-primary/5 to-indigo-50/50 rounded-2xl p-4 flex flex-col gap-2 border border-primary/10">
            <Row label="მოსალოდნელი კასა" value={`₾${(r ? r.expected_cash : preview!.expected).toFixed(2)}`} strong color="text-primary" />
            {!report ? (
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">დათვლილი კასა ₾ <span className="text-red-500">*</span></label>
                <div className="relative">
                  <Banknote className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input type="number" min="0" inputMode="decimal" autoFocus className="h-11 pl-9 rounded-xl bg-white" placeholder="0.00" value={countedCash} onChange={e => setCountedCash(e.target.value)} />
                </div>
              </div>
            ) : (
              <Row label="დათვლილი კასა" value={`₾${(report.closing_cash ?? 0).toFixed(2)}`} strong />
            )}
            <Separator className="my-0.5 opacity-50" />
            <Row
              label="სხვაობა"
              value={`${diff > 0 ? '+' : ''}₾${diff.toFixed(2)}`}
              strong
              color={Math.abs(diff) < 0.005 ? 'text-emerald-600' : diff > 0 ? 'text-emerald-600' : 'text-red-600'}
            />
            {report && Math.abs(diff) >= 0.005 && (
              <p className="text-[11px] text-amber-700 bg-amber-50 rounded-lg px-2.5 py-1.5">
                {diff > 0 ? 'კასაში მეტი ფულია ვიდრე მოსალოდნელი (ზედმეტობა).' : 'კასაში ნაკლები ფულია (დანაკლისი).'}
              </p>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          {!report ? (
            <>
              <Button variant="ghost" className="rounded-xl h-11 px-5 font-bold text-muted-foreground" onClick={onClose} disabled={saving}>გაუქმება</Button>
              <Button onClick={handleClose} disabled={saving || countedCash === ''} className="rounded-xl h-11 px-6 bg-gradient-to-r from-amber-500 to-orange-600 border-0 font-black text-white">
                დახურვა <ArrowRight className="size-4 ml-1" />
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" className="rounded-xl h-11 px-5" onClick={() => window.print()}>
                <Printer className="size-4 mr-1.5" /> ბეჭდვა
              </Button>
              <Button onClick={onClose} className="rounded-xl h-11 px-7 bg-gradient-to-r from-emerald-500 to-green-500 border-0 font-black text-white">
                დასრულება
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
