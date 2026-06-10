"use client"

import { useState, useMemo } from 'react'
import {
  Plus, ShoppingBag, Search, Building2, Phone, User, Wallet,
  Edit2, Trash2, Package, TrendingUp, Clock, ChevronRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { useStore } from '@/lib/store'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { SupplierDialog } from '@/components/suppliers/supplier-dialog'
import { PurchaseDialog } from '@/components/suppliers/purchase-dialog'
import { PaymentDialog } from '@/components/suppliers/payment-dialog'
import type { Supplier } from '@/lib/mock-data'

function timeAgo(iso: string) {
  const d = new Date(iso)
  return `${d.getDate().toString().padStart(2, '0')}.${(d.getMonth() + 1).toString().padStart(2, '0')}.${d.getFullYear()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
}

export default function SuppliersPage() {
  const { suppliers, purchases, supplierPayments, deleteSupplier } = useStore()
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [supplierDialog, setSupplierDialog] = useState<{ open: boolean; supplier: Supplier | null }>({ open: false, supplier: null })
  const [purchaseOpen, setPurchaseOpen] = useState(false)
  const [payOpen, setPayOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    return suppliers.filter(s => !q || s.name.toLowerCase().includes(q) || (s.phone ?? '').includes(q))
  }, [suppliers, search])

  const selected = suppliers.find(s => s.id === selectedId) ?? null
  const totalDebt = suppliers.reduce((s, x) => s + Math.max(0, x.balance), 0)

  const supplierPurchases = useMemo(
    () => purchases.filter(p => p.supplier_id === selectedId).slice(0, 30),
    [purchases, selectedId]
  )
  const supplierPays = useMemo(
    () => supplierPayments.filter(p => p.supplier_id === selectedId).slice(0, 30),
    [supplierPayments, selectedId]
  )

  const handleDelete = () => {
    if (!deleteId) return
    deleteSupplier(deleteId)
    toast.success('მომწოდებელი წაიშალა')
    if (selectedId === deleteId) setSelectedId(null)
    setDeleteId(null)
  }

  return (
    <div className="flex flex-col gap-4 h-full min-h-0 animate-fade-up">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2.5">
          <h1 className="text-base font-bold text-foreground">მომწოდებლები</h1>
          <span className="px-2 py-0.5 rounded-lg bg-primary/10 text-primary text-xs font-bold">{suppliers.length}</span>
          {totalDebt > 0 && (
            <span className="px-2.5 py-0.5 rounded-lg bg-red-50 text-red-600 text-xs font-bold border border-red-100">
              ჯამური ვალი: ₾{totalDebt.toFixed(2)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => setPurchaseOpen(true)} size="sm" variant="outline" className="h-9 rounded-xl border-primary/30 text-primary hover:bg-primary/5 font-bold">
            <ShoppingBag className="size-4" data-icon="inline-start" /> ახალი შესყიდვა
          </Button>
          <Button onClick={() => setSupplierDialog({ open: true, supplier: null })} size="sm" className="h-9 rounded-xl bg-gradient-to-r from-primary to-indigo-600 border-0 text-white font-bold shadow-md shadow-primary/25">
            <Plus className="size-4" data-icon="inline-start" /> მომწოდებელი
          </Button>
        </div>
      </div>

      <div className="flex gap-4 flex-1 min-h-0">
        {/* Supplier list */}
        <div className={cn("flex flex-col gap-3 w-full lg:w-80 shrink-0", selected && "hidden lg:flex")}>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input className="pl-9 h-10 rounded-xl" placeholder="მომწოდებლის ძებნა..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="flex-1 overflow-y-auto flex flex-col gap-2 -mr-1 pr-1">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
                <Building2 className="size-10 opacity-20" />
                <p className="text-sm">მომწოდებელი არ არის</p>
              </div>
            ) : filtered.map(s => (
              <button
                key={s.id}
                onClick={() => setSelectedId(s.id)}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-2xl border text-left transition-all",
                  selectedId === s.id ? "border-primary bg-primary/5 shadow-sm" : "border-border bg-white hover:border-primary/30 hover:bg-muted/30"
                )}
              >
                <div className="size-10 rounded-xl bg-gradient-to-br from-primary/15 to-indigo-500/15 flex items-center justify-center shrink-0">
                  <Building2 className="size-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-foreground truncate">{s.name}</p>
                  {s.phone && <p className="text-[11px] text-muted-foreground truncate">{s.phone}</p>}
                </div>
                <div className="text-right shrink-0">
                  {s.balance > 0 ? (
                    <span className="text-xs font-bold text-red-600">₾{s.balance.toFixed(2)}</span>
                  ) : s.balance < 0 ? (
                    <span className="text-xs font-bold text-emerald-600">+₾{Math.abs(s.balance).toFixed(2)}</span>
                  ) : (
                    <span className="text-[11px] text-muted-foreground">გასწორებული</span>
                  )}
                </div>
                <ChevronRight className="size-4 text-muted-foreground/40 lg:hidden" />
              </button>
            ))}
          </div>
        </div>

        {/* Detail */}
        <div className={cn("flex-1 min-w-0", !selected && "hidden lg:block")}>
          {!selected ? (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-4 bg-muted/20 rounded-3xl border border-dashed border-border">
              <Building2 className="size-14 opacity-20" />
              <p className="text-sm font-medium">აირჩიეთ მომწოდებელი დეტალების სანახავად</p>
            </div>
          ) : (
            <div className="h-full overflow-y-auto flex flex-col gap-4 -mr-1 pr-1">
              {/* Back (mobile) */}
              <button onClick={() => setSelectedId(null)} className="lg:hidden text-sm text-primary font-semibold flex items-center gap-1 w-fit">
                ← სია
              </button>

              {/* Header card */}
              <div className="bg-white rounded-3xl border border-border p-5 shadow-sm">
                <div className="flex items-start gap-4">
                  <div className="size-14 rounded-2xl bg-gradient-to-br from-primary to-indigo-600 flex items-center justify-center shadow-lg shadow-primary/25 shrink-0">
                    <Building2 className="size-7 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-lg font-black text-foreground">{selected.name}</h2>
                    <div className="flex flex-col gap-0.5 mt-1">
                      {selected.contact && <p className="text-xs text-muted-foreground flex items-center gap-1.5"><User className="size-3.5" /> {selected.contact}</p>}
                      {selected.phone && <p className="text-xs text-muted-foreground flex items-center gap-1.5"><Phone className="size-3.5" /> {selected.phone}</p>}
                    </div>
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    <button onClick={() => setSupplierDialog({ open: true, supplier: selected })} className="size-9 rounded-xl border border-border hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-primary transition-all" title="რედაქტირება">
                      <Edit2 className="size-4" />
                    </button>
                    <button onClick={() => setDeleteId(selected.id)} className="size-9 rounded-xl border border-border hover:bg-red-50 hover:border-red-200 flex items-center justify-center text-muted-foreground hover:text-red-500 transition-all" title="წაშლა">
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </div>
                {selected.note && <p className="text-xs text-muted-foreground mt-3 bg-muted/40 rounded-xl px-3 py-2">{selected.note}</p>}

                {/* Balance + pay */}
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
                  <div>
                    <p className="text-[11px] text-muted-foreground uppercase tracking-wide font-semibold">ჩვენი ვალი</p>
                    <p className={cn("text-2xl font-black tabular-nums", selected.balance > 0 ? "text-red-600" : selected.balance < 0 ? "text-emerald-600" : "text-foreground")}>
                      ₾{Math.abs(selected.balance).toFixed(2)}
                      {selected.balance < 0 && <span className="text-xs font-bold ml-1">(წინასწარ)</span>}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={() => setPurchaseOpen(true)} variant="outline" size="sm" className="h-10 rounded-xl border-primary/30 text-primary hover:bg-primary/5 font-bold">
                      <ShoppingBag className="size-4" data-icon="inline-start" /> შესყიდვა
                    </Button>
                    <Button onClick={() => setPayOpen(true)} size="sm" className="h-10 rounded-xl bg-gradient-to-r from-emerald-500 to-green-500 border-0 text-white font-bold shadow-md shadow-emerald-500/25">
                      <Wallet className="size-4" data-icon="inline-start" /> გადახდა
                    </Button>
                  </div>
                </div>
              </div>

              {/* History grid */}
              <div className="grid md:grid-cols-2 gap-4">
                {/* Purchases */}
                <div className="bg-white rounded-3xl border border-border p-4 shadow-sm">
                  <div className="flex items-center gap-2 mb-3">
                    <ShoppingBag className="size-4 text-primary" />
                    <h3 className="text-sm font-bold text-foreground">შესყიდვები</h3>
                    <span className="text-[11px] text-muted-foreground ml-auto">{supplierPurchases.length}</span>
                  </div>
                  <div className="flex flex-col gap-2 max-h-72 overflow-y-auto">
                    {supplierPurchases.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-6">შესყიდვა არ არის</p>
                    ) : supplierPurchases.map(p => (
                      <div key={p.id} className="flex items-center gap-2.5 bg-muted/30 rounded-xl p-2.5">
                        <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <Package className="size-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-foreground">₾{p.total.toFixed(2)} <span className="text-[11px] font-normal text-muted-foreground">· {p.items_count} ც.</span></p>
                          <p className="text-[10px] text-muted-foreground flex items-center gap-1"><Clock className="size-2.5" /> {timeAgo(p.created_at)}</p>
                        </div>
                        {p.total - p.paid > 0 && <span className="text-[10px] font-bold text-red-600 shrink-0">ვალი ₾{(p.total - p.paid).toFixed(2)}</span>}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Payments */}
                <div className="bg-white rounded-3xl border border-border p-4 shadow-sm">
                  <div className="flex items-center gap-2 mb-3">
                    <TrendingUp className="size-4 text-emerald-500" />
                    <h3 className="text-sm font-bold text-foreground">გადახდები</h3>
                    <span className="text-[11px] text-muted-foreground ml-auto">{supplierPays.length}</span>
                  </div>
                  <div className="flex flex-col gap-2 max-h-72 overflow-y-auto">
                    {supplierPays.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-6">გადახდა არ არის</p>
                    ) : supplierPays.map(p => (
                      <div key={p.id} className="flex items-center gap-2.5 bg-emerald-50/50 rounded-xl p-2.5">
                        <div className="size-8 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
                          <Wallet className="size-4 text-emerald-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-emerald-700">₾{p.amount.toFixed(2)}</p>
                          <p className="text-[10px] text-muted-foreground flex items-center gap-1"><Clock className="size-2.5" /> {timeAgo(p.created_at)}{p.note ? ` · ${p.note}` : ''}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Dialogs */}
      <SupplierDialog open={supplierDialog.open} onClose={() => setSupplierDialog({ open: false, supplier: null })} supplier={supplierDialog.supplier} />
      <PurchaseDialog open={purchaseOpen} onClose={() => setPurchaseOpen(false)} presetSupplierId={selectedId} />
      <PaymentDialog open={payOpen} onClose={() => setPayOpen(false)} supplier={selected} />

      <AlertDialog open={!!deleteId} onOpenChange={v => !v && setDeleteId(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>მომწოდებლის წაშლა</AlertDialogTitle>
            <AlertDialogDescription>ნამდვილად გსურთ წაშლა? შესყიდვების ისტორია შენარჩუნდება, მაგრამ მომწოდებელთან კავშირი მოიხსნება.</AlertDialogDescription>
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
