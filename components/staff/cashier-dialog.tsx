"use client"

import { useState, useEffect } from 'react'
import { User, KeyRound } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useStore } from '@/lib/store'
import { toast } from 'sonner'
import type { Cashier } from '@/lib/mock-data'

interface Props {
  open: boolean
  onClose: () => void
  cashier?: Cashier | null
}

export function CashierDialog({ open, onClose, cashier }: Props) {
  const { addCashier, updateCashier, cashiers } = useStore()
  const [name, setName] = useState('')
  const [pin, setPin] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (cashier) { setName(cashier.name); setPin(cashier.pin) }
    else { setName(''); setPin('') }
  }, [cashier, open])

  const handleSave = async () => {
    if (!name.trim()) { toast.error('სახელი სავალდებულოა'); return }
    if (!/^\d{4}$/.test(pin)) { toast.error('PIN უნდა იყოს 4 ციფრი'); return }
    // PIN must be unique among other cashiers
    const clash = cashiers.find(c => c.pin === pin && c.id !== cashier?.id)
    if (clash) { toast.error(`ეს PIN უკვე იყენებს — ${clash.name}`); return }

    setSaving(true)
    if (cashier) {
      await updateCashier(cashier.id, { name: name.trim(), pin })
      toast.success('კასირი განახლდა')
    } else {
      const created = await addCashier({ name: name.trim(), pin })
      if (created) toast.success('კასირი დაემატა')
    }
    setSaving(false)
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-sm rounded-[24px] p-6">
        <DialogHeader>
          <DialogTitle className="text-xl font-black">{cashier ? 'კასირის რედაქტირება' : 'ახალი კასირი'}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3.5 py-2">
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide pl-1">სახელი <span className="text-red-500">*</span></label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input className="h-11 pl-9 rounded-xl" placeholder="მაგ. ნინო" value={name} onChange={e => setName(e.target.value)} />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide pl-1">PIN (4 ციფრი) <span className="text-red-500">*</span></label>
            <div className="relative">
              <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                inputMode="numeric" maxLength={4}
                className="h-11 pl-9 rounded-xl font-mono tracking-[0.4em] text-lg"
                placeholder="••••"
                value={pin}
                onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
              />
            </div>
            <p className="text-[11px] text-muted-foreground pl-1">კასირი ამ PIN-ით ხსნის ცვლას</p>
          </div>
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="ghost" className="rounded-xl h-11 px-5 font-bold text-muted-foreground" onClick={onClose} disabled={saving}>გაუქმება</Button>
          <Button onClick={handleSave} disabled={saving} className="rounded-xl h-11 px-7 bg-gradient-to-r from-primary to-indigo-600 border-0 font-black text-white">
            {cashier ? 'შენახვა' : 'დამატება'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
