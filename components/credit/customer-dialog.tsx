"use client"

import { useState, useEffect } from 'react'
import { User, Phone, FileText } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useStore } from '@/lib/store'
import { toast } from 'sonner'
import type { Customer } from '@/lib/mock-data'

interface Props {
  open: boolean
  onClose: () => void
  customer?: Customer | null
  /** Called with the newly created customer (used by the POS to auto-select it). */
  onCreated?: (c: Customer) => void
}

export function CustomerDialog({ open, onClose, customer, onCreated }: Props) {
  const { addCustomer, updateCustomer } = useStore()
  const [form, setForm] = useState({ name: '', phone: '', note: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (customer) setForm({ name: customer.name, phone: customer.phone ?? '', note: customer.note ?? '' })
    else setForm({ name: '', phone: '', note: '' })
  }, [customer, open])

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('სახელი სავალდებულოა'); return }
    setSaving(true)
    const payload = { name: form.name.trim(), phone: form.phone.trim() || null, note: form.note.trim() || null }
    if (customer) {
      await updateCustomer(customer.id, payload)
      toast.success('კლიენტი განახლდა')
    } else {
      const created = await addCustomer(payload)
      if (created) { toast.success('კლიენტი დაემატა'); onCreated?.(created) }
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
          <Input className="h-11 pl-9 rounded-xl border-border/60 bg-white" placeholder={ph}
            value={form[key]} onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))} />
        </div>
      </div>
    )
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-md rounded-[24px] p-6">
        <DialogHeader>
          <DialogTitle className="text-xl font-black">{customer ? 'კლიენტის რედაქტირება' : 'ახალი კლიენტი'}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3.5 py-2">
          {field('სახელი', 'name', User, 'მაგ. გიორგი ბერიძე', true)}
          {field('ტელეფონი', 'phone', Phone, '+995 5XX...')}
          {field('შენიშვნა', 'note', FileText, 'არასავალდებულო')}
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="ghost" className="rounded-xl h-11 px-5 font-bold text-muted-foreground" onClick={onClose} disabled={saving}>გაუქმება</Button>
          <Button onClick={handleSave} disabled={saving} className="rounded-xl h-11 px-7 bg-gradient-to-r from-primary to-indigo-600 border-0 font-black text-white">
            {customer ? 'შენახვა' : 'დამატება'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
