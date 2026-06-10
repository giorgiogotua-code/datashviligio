"use client"

import { useState, useEffect } from 'react'
import { KeyRound, Banknote, Play, CheckCircle2 } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useStore } from '@/lib/store'
import { toast } from 'sonner'

interface Props {
  open: boolean
  onClose: () => void
}

export function OpenShiftDialog({ open, onClose }: Props) {
  const { cashiers, openShift } = useStore()
  const [pin, setPin] = useState('')
  const [openingCash, setOpeningCash] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => { if (open) { setPin(''); setOpeningCash('') } }, [open])

  // PIN identifies the cashier (PINs are unique among active cashiers).
  const matched = pin.length === 4 ? cashiers.find(c => c.pin === pin && c.active) : null

  const handleOpen = async () => {
    if (!matched) { toast.error('PIN არასწორია ან კასირი გათიშულია'); return }
    setSaving(true)
    const shift = await openShift(matched.id, matched.name, Math.max(0, parseFloat(openingCash) || 0))
    setSaving(false)
    if (shift) { toast.success(`ცვლა გახსნილია — ${matched.name}`); onClose() }
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-sm rounded-[24px] p-6">
        <DialogHeader>
          <DialogTitle className="text-xl font-black flex items-center gap-2">
            <Play className="size-5 text-emerald-500" /> ცვლის გახსნა
          </DialogTitle>
          <DialogDescription>კასირმა შეიყვანოს PIN და საწყისი თანხა კასაში</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3.5 py-2">
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide pl-1">კასირის PIN <span className="text-red-500">*</span></label>
            <div className="relative">
              <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                inputMode="numeric" maxLength={4} autoFocus
                className="h-12 pl-9 rounded-xl font-mono tracking-[0.5em] text-xl text-center"
                placeholder="••••"
                value={pin}
                onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
              />
            </div>
            {matched && (
              <p className="text-xs text-emerald-600 font-semibold flex items-center gap-1 pl-1">
                <CheckCircle2 className="size-3.5" /> {matched.name}
              </p>
            )}
            {pin.length === 4 && !matched && (
              <p className="text-xs text-red-500 font-medium pl-1">PIN ვერ მოიძებნა</p>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide pl-1">საწყისი თანხა კასაში ₾</label>
            <div className="relative">
              <Banknote className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input type="number" min="0" inputMode="decimal" className="h-11 pl-9 rounded-xl" placeholder="0.00" value={openingCash} onChange={e => setOpeningCash(e.target.value)} />
            </div>
            <p className="text-[11px] text-muted-foreground pl-1">საჭიროა Z-რეპორტისთვის (კასის შედარება)</p>
          </div>
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="ghost" className="rounded-xl h-11 px-5 font-bold text-muted-foreground" onClick={onClose} disabled={saving}>გაუქმება</Button>
          <Button onClick={handleOpen} disabled={saving || !matched} className="rounded-xl h-11 px-7 bg-gradient-to-r from-emerald-500 to-green-500 border-0 font-black text-white">
            <Play className="size-4 mr-1" /> ცვლის გახსნა
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
