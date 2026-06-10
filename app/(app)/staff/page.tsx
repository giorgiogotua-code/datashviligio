"use client"

import { useState } from 'react'
import {
  Plus, User, KeyRound, Edit2, Trash2, Eye, EyeOff, Power, History, Clock, TrendingUp, CircleDot,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { useStore } from '@/lib/store'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { CashierDialog } from '@/components/staff/cashier-dialog'
import type { Cashier } from '@/lib/mock-data'

function dt(iso: string | null) {
  if (!iso) return '—'
  const d = new Date(iso)
  return `${d.getDate().toString().padStart(2, '0')}.${(d.getMonth() + 1).toString().padStart(2, '0')} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
}

export default function StaffPage() {
  const { cashiers, shifts, updateCashier, deleteCashier } = useStore()
  const [dialog, setDialog] = useState<{ open: boolean; cashier: Cashier | null }>({ open: false, cashier: null })
  const [reveal, setReveal] = useState<Set<string>>(new Set())
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const toggleReveal = (id: string) => setReveal(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n })

  const handleDelete = () => {
    if (!deleteId) return
    deleteCashier(deleteId)
    toast.success('კასირი წაიშალა')
    setDeleteId(null)
  }

  return (
    <div className="max-w-4xl mx-auto flex flex-col gap-5 animate-fade-up pb-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-foreground">თანამშრომლები</h1>
          <p className="text-sm text-muted-foreground mt-1">კასირები და მათი PIN კოდები · ცვლების ისტორია</p>
        </div>
        <Button onClick={() => setDialog({ open: true, cashier: null })} size="sm" className="h-10 rounded-xl bg-gradient-to-r from-primary to-indigo-600 border-0 text-white font-bold shadow-md shadow-primary/25">
          <Plus className="size-4" data-icon="inline-start" /> კასირი
        </Button>
      </div>

      {/* Cashiers */}
      <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-border bg-gradient-to-r from-primary/5 to-indigo-500/5 flex items-center gap-2">
          <User className="size-4 text-primary" />
          <h2 className="text-sm font-bold text-foreground">კასირები</h2>
          <span className="text-[11px] text-muted-foreground ml-auto">{cashiers.length}</span>
        </div>
        {cashiers.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-12 text-muted-foreground">
            <User className="size-10 opacity-20" />
            <p className="text-sm">კასირი არ არის — დაამატე პირველი</p>
          </div>
        ) : (
          <div className="divide-y divide-border/60">
            {cashiers.map(c => (
              <div key={c.id} className="flex items-center gap-3 px-5 py-3.5">
                <div className={cn("size-10 rounded-xl flex items-center justify-center shrink-0", c.active ? "bg-gradient-to-br from-primary/15 to-indigo-500/15 text-primary" : "bg-muted text-muted-foreground")}>
                  <User className="size-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-foreground">{c.name}{!c.active && <span className="text-[11px] font-normal text-muted-foreground ml-2">(გათიშული)</span>}</p>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <KeyRound className="size-3" />
                    <span className="font-mono tracking-widest">{reveal.has(c.id) ? c.pin : '••••'}</span>
                    <button onClick={() => toggleReveal(c.id)} className="hover:text-foreground transition-colors">
                      {reveal.has(c.id) ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                    </button>
                  </div>
                </div>
                <button
                  onClick={() => updateCashier(c.id, { active: !c.active })}
                  title={c.active ? 'გათიშვა' : 'ჩართვა'}
                  className={cn("size-9 rounded-xl border flex items-center justify-center transition-all shrink-0",
                    c.active ? "border-emerald-200 bg-emerald-50 text-emerald-600 hover:bg-emerald-100" : "border-border text-muted-foreground hover:bg-muted")}
                >
                  <Power className="size-4" />
                </button>
                <button onClick={() => setDialog({ open: true, cashier: c })} className="size-9 rounded-xl border border-border hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-primary transition-all shrink-0" title="რედაქტირება">
                  <Edit2 className="size-4" />
                </button>
                <button onClick={() => setDeleteId(c.id)} className="size-9 rounded-xl border border-border hover:bg-red-50 hover:border-red-200 flex items-center justify-center text-muted-foreground hover:text-red-500 transition-all shrink-0" title="წაშლა">
                  <Trash2 className="size-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Shift history */}
      <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-border bg-gradient-to-r from-emerald-500/5 to-teal-500/5 flex items-center gap-2">
          <History className="size-4 text-emerald-600" />
          <h2 className="text-sm font-bold text-foreground">ცვლების ისტორია</h2>
          <span className="text-[11px] text-muted-foreground ml-auto">{shifts.length}</span>
        </div>
        {shifts.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-12 text-muted-foreground">
            <History className="size-10 opacity-20" />
            <p className="text-sm">ცვლა ჯერ არ გახსნილა</p>
          </div>
        ) : (
          <div className="divide-y divide-border/60 max-h-[28rem] overflow-y-auto">
            {shifts.map(s => {
              const total = s.cash_sales + s.card_sales + s.credit_sales - s.returns_total
              return (
                <div key={s.id} className="flex items-center gap-3 px-5 py-3.5">
                  <div className={cn("size-10 rounded-xl flex items-center justify-center shrink-0", s.status === 'open' ? "bg-emerald-100 text-emerald-600" : "bg-muted text-muted-foreground")}>
                    {s.status === 'open' ? <CircleDot className="size-5" /> : <TrendingUp className="size-5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-foreground">
                      {s.cashier_name ?? '—'}
                      {s.status === 'open' && <span className="text-[11px] font-bold text-emerald-600 ml-2">● ღია</span>}
                    </p>
                    <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <Clock className="size-2.5" /> {dt(s.opened_at)}{s.closed_at ? ` → ${dt(s.closed_at)}` : ''}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    {s.status === 'closed' ? (
                      <>
                        <p className="text-sm font-black text-foreground tabular-nums">₾{total.toFixed(2)}</p>
                        <p className={cn("text-[11px] font-bold", s.difference === 0 ? "text-muted-foreground" : s.difference > 0 ? "text-emerald-600" : "text-red-600")}>
                          {s.difference === 0 ? 'ზუსტი' : `${s.difference > 0 ? '+' : ''}₾${s.difference.toFixed(2)}`}
                        </p>
                      </>
                    ) : (
                      <p className="text-[11px] text-emerald-600 font-semibold">მიმდინარე</p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <CashierDialog open={dialog.open} onClose={() => setDialog({ open: false, cashier: null })} cashier={dialog.cashier} />

      <AlertDialog open={!!deleteId} onOpenChange={v => !v && setDeleteId(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>კასირის წაშლა</AlertDialogTitle>
            <AlertDialogDescription>ნამდვილად გსურთ წაშლა? ცვლების ისტორია შენარჩუნდება.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">გაუქმება</AlertDialogCancel>
            <AlertDialogAction className="rounded-xl bg-red-500 hover:bg-red-600 text-white border-0" onClick={handleDelete}>წაშლა</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
