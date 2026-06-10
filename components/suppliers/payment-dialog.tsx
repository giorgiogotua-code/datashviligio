"use client"

import { useState, useEffect } from 'react'
import { Wallet, FileText } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useStore } from '@/lib/store'
import { toast } from 'sonner'
import type { Supplier } from '@/lib/mock-data'

interface Props {
  open: boolean
  onClose: () => void
  supplier: Supplier | null
}

export function PaymentDialog({ open, onClose, supplier }: Props) {
  const { paySupplier } = useStore()
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open && supplier) setAmount(supplier.balance > 0 ? String(supplier.balance.toFixed(2)) : '')
    setNote('')
  }, [open, supplier])

  if (!supplier) return null

  const value = Math.max(0, parseFloat(amount) || 0)

  const handlePay = async () => {
    if (value <= 0) { toast.error('შეიყვანეთ თანხა'); return }
    setSaving(true)
    await paySupplier(supplier.id, value, note.trim() || null)
    toast.success(`გადახდა შენახულია: ₾${value.toFixed(2)}`)
    setSaving(false)
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-sm rounded-[24px] p-6">
        <DialogHeader>
          <DialogTitle className="text-xl font-black flex items-center gap-2">
            <Wallet className="size-5 text-emerald-500" /> გადახდა
          </DialogTitle>
          <DialogDescription>
            <span className="font-semibold text-foreground">{supplier.name}</span> — მიმდინარე ვალი:{' '}
            <span className="font-bold text-red-600">₾{supplier.balance.toFixed(2)}</span>
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3.5 py-2">
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide pl-1">თანხა ₾ <span className="text-red-500">*</span></label>
            <div className="relative">
              <Wallet className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input type="number" min="0" inputMode="decimal" className="h-12 pl-9 rounded-xl text-lg font-bold" placeholder="0.00" value={amount} onChange={e => setAmount(e.target.value)} />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide pl-1">შენიშვნა</label>
            <div className="relative">
              <FileText className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input className="h-11 pl-9 rounded-xl" placeholder="არასავალდებულო" value={note} onChange={e => setNote(e.target.value)} />
            </div>
          </div>
          {value > supplier.balance && supplier.balance >= 0 && (
            <p className="text-[11px] text-amber-600 bg-amber-50 rounded-lg px-3 py-2">
              თანხა ვალზე მეტია — სხვაობა ({(value - supplier.balance).toFixed(2)}₾) წინასწარ გადახდად ჩაიწერება.
            </p>
          )}
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="ghost" className="rounded-xl h-11 px-5 font-bold text-muted-foreground" onClick={onClose} disabled={saving}>გაუქმება</Button>
          <Button onClick={handlePay} disabled={saving || value <= 0} className="rounded-xl h-11 px-7 bg-gradient-to-r from-emerald-500 to-green-500 border-0 font-black text-white">
            გადახდა — ₾{value.toFixed(2)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
