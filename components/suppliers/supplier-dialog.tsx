"use client"

import { useState, useEffect } from 'react'
import { Building2, Phone, User, MapPin, FileText } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useStore } from '@/lib/store'
import { toast } from 'sonner'
import type { Supplier } from '@/lib/mock-data'

interface Props {
  open: boolean
  onClose: () => void
  supplier?: Supplier | null
}

export function SupplierDialog({ open, onClose, supplier }: Props) {
  const { addSupplier, updateSupplier } = useStore()
  const [form, setForm] = useState({ name: '', phone: '', contact: '', address: '', note: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (supplier) {
      setForm({
        name: supplier.name,
        phone: supplier.phone ?? '',
        contact: supplier.contact ?? '',
        address: supplier.address ?? '',
        note: supplier.note ?? '',
      })
    } else {
      setForm({ name: '', phone: '', contact: '', address: '', note: '' })
    }
  }, [supplier, open])

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('სახელი სავალდებულოა'); return }
    setSaving(true)
    const payload = {
      name: form.name.trim(),
      phone: form.phone.trim() || null,
      contact: form.contact.trim() || null,
      address: form.address.trim() || null,
      note: form.note.trim() || null,
    }
    if (supplier) {
      await updateSupplier(supplier.id, payload)
      toast.success('მომწოდებელი განახლდა')
    } else {
      const created = await addSupplier(payload)
      if (created) toast.success('მომწოდებელი დაემატა')
    }
    setSaving(false)
    onClose()
  }

  const field = (label: string, key: keyof typeof form, icon: React.ElementType, ph: string, required = false) => {
    const Icon = icon
    return (
      <div className="flex flex-col gap-1.5">
        <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide pl-1">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
        <div className="relative">
          <Icon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
          <Input
            className="h-11 pl-9 rounded-xl border-border/60 bg-white"
            placeholder={ph}
            value={form[key]}
            onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
          />
        </div>
      </div>
    )
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-md rounded-[24px] p-6">
        <DialogHeader>
          <DialogTitle className="text-xl font-black">{supplier ? 'მომწოდებლის რედაქტირება' : 'ახალი მომწოდებელი'}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3.5 py-2">
          {field('სახელი', 'name', Building2, 'მაგ. Тechno Import', true)}
          <div className="grid grid-cols-2 gap-3">
            {field('ტელეფონი', 'phone', Phone, '+995 5XX...')}
            {field('საკონტაქტო პირი', 'contact', User, 'სახელი')}
          </div>
          {field('მისამართი', 'address', MapPin, 'ქ. თბილისი...')}
          {field('შენიშვნა', 'note', FileText, 'დამატებითი ინფო')}
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="ghost" className="rounded-xl h-11 px-5 font-bold text-muted-foreground" onClick={onClose} disabled={saving}>გაუქმება</Button>
          <Button onClick={handleSave} disabled={saving} className="rounded-xl h-11 px-7 bg-gradient-to-r from-primary to-indigo-600 border-0 font-black text-white">
            {supplier ? 'შენახვა' : 'დამატება'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
