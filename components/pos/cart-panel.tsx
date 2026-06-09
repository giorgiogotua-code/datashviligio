"use client"

import { useState, useRef, useEffect } from 'react'
import { ShoppingCart, Trash2, Plus, Minus, X, CreditCard, Banknote, CheckCircle, Printer, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import { useStore } from '@/lib/store'
import { toast } from 'sonner'

export interface CartItem {
  product_id: string
  product_name: string
  barcode: string | null
  unit_price: number
  quantity: number
  photo_url: string | null
}

interface Props {
  items: CartItem[]
  onUpdate: (id: string, qty: number) => void
  onRemove: (id: string) => void
  onClear: () => void
  className?: string
}

function formatDate(d: Date) {
  return `${d.getDate().toString().padStart(2, '0')}.${(d.getMonth() + 1).toString().padStart(2, '0')}.${d.getFullYear()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
}

export function CartPanel({ items, onUpdate, onRemove, onClear, className }: Props) {
  const { addSale } = useStore()
  const [method, setMethod] = useState<'cash' | 'card'>('cash')
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [clearOpen, setClearOpen]     = useState(false)
  const [receiptOpen, setReceiptOpen] = useState(false)
  const [lastSale, setLastSale]       = useState<{ items: CartItem[]; total: number; method: string; date: Date } | null>(null)
  const [cartBounce, setCartBounce]   = useState(false)
  const prevCount = useRef(items.length)

  const total = items.reduce((s, i) => s + i.unit_price * i.quantity, 0)
  const count = items.reduce((s, i) => s + i.quantity, 0)

  // Bounce icon when item added
  useEffect(() => {
    if (items.length > prevCount.current) {
      setCartBounce(true)
      setTimeout(() => setCartBounce(false), 400)
    }
    prevCount.current = items.length
  }, [items.length])

  const handleSell = () => {
    const now = new Date()
    addSale(
      { total, payment_method: method, items_count: count },
      items.map(i => ({
        product_id: i.product_id, product_name: i.product_name, barcode: i.barcode,
        quantity: i.quantity, unit_price: i.unit_price, total_price: i.unit_price * i.quantity,
      }))
    )
    setLastSale({ items: [...items], total, method: method === 'cash' ? 'ნაღდი' : 'ბარათი', date: now })
    setConfirmOpen(false); onClear()
    toast.success('გაყიდვა წარმატებით დასრულდა!')
    setReceiptOpen(true)
  }

  return (
    <aside className={cn("w-full lg:w-96 shrink-0 bg-white rounded-2xl flex flex-col overflow-hidden animate-fade-up border border-border shadow-sm", className)}>

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-border bg-gradient-to-r from-muted/40 to-transparent">
        <div className="flex items-center gap-2.5">
          <div className={cn('size-8 rounded-xl bg-gradient-to-br from-primary to-indigo-600 flex items-center justify-center shadow-md shadow-primary/25', cartBounce && 'animate-cart-bounce')}>
            <ShoppingCart className="size-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-foreground leading-tight">კალათა</p>
            {count > 0 && <p className="text-[11px] text-muted-foreground">{count} პოზიცია</p>}
          </div>
        </div>
        {items.length > 0 && (
          <button onClick={() => setClearOpen(true)} className="size-7 rounded-lg hover:bg-red-50 hover:text-red-500 flex items-center justify-center text-muted-foreground transition-all">
            <Trash2 className="size-3.5" />
          </button>
        )}
      </div>

      {/* Items list */}
      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
        {items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground py-16 gap-4">
            <div className="size-16 rounded-2xl bg-muted flex items-center justify-center">
              <ShoppingCart className="size-7 opacity-20" />
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold">კალათა ცარიელია</p>
              <p className="text-xs mt-1 text-muted-foreground/70">პროდუქტზე დაჭერით დაამატეთ</p>
            </div>
          </div>
        ) : items.map((item, idx) => (
          <div
            key={item.product_id}
            className="animate-fade-up flex items-center gap-2.5 bg-muted/30 hover:bg-muted/50 rounded-2xl p-2.5 transition-colors group"
            style={{ animationDelay: `${idx * 40}ms` }}
          >
            {item.photo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={item.photo_url} alt={item.product_name} className="size-10 rounded-xl object-cover shrink-0 border border-border shadow-sm" />
            ) : (
              <div className="size-10 rounded-xl bg-gradient-to-br from-accent to-blue-50 shrink-0 flex items-center justify-center">
                <span className="text-base font-black text-primary/30">{item.product_name.charAt(0)}</span>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-foreground truncate">{item.product_name}</p>
              <p className="text-xs font-bold text-primary">₾{item.unit_price.toFixed(2)}</p>
            </div>
            <div className="flex items-center gap-0.5 shrink-0">
              <button onClick={() => onUpdate(item.product_id, item.quantity - 1)} className="size-6 rounded-lg bg-white border border-border hover:border-primary/40 hover:bg-primary/5 flex items-center justify-center transition-all">
                <Minus className="size-3 text-muted-foreground" />
              </button>
              <span className="w-7 text-center text-sm font-bold text-foreground">{item.quantity}</span>
              <button onClick={() => onUpdate(item.product_id, item.quantity + 1)} className="size-6 rounded-lg bg-white border border-border hover:border-primary/40 hover:bg-primary/5 flex items-center justify-center transition-all">
                <Plus className="size-3 text-muted-foreground" />
              </button>
            </div>
            <div className="shrink-0 text-right min-w-14">
              <p className="text-xs font-bold text-foreground">₾{(item.unit_price * item.quantity).toFixed(2)}</p>
            </div>
            <button onClick={() => onRemove(item.product_id)} className="size-5 rounded opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-500 transition-all shrink-0">
              <X className="size-3.5" />
            </button>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="border-t border-border p-4 flex flex-col gap-3">

        {/* Totals */}
        <div className="flex flex-col gap-1.5 bg-muted/30 rounded-2xl px-4 py-3">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">პოზიციები:</span>
            <span className="font-semibold text-foreground">{count}</span>
          </div>
          <Separator className="opacity-50" />
          <div className="flex justify-between items-center">
            <span className="text-sm font-semibold text-foreground">სულ:</span>
            <span className="text-2xl font-black text-primary tabular-nums">₾{total.toFixed(2)}</span>
          </div>
        </div>

        {/* Payment method */}
        <div className="grid grid-cols-2 gap-2">
          {[
            { key: 'cash' as const, label: 'ნაღდი',  icon: Banknote,    gradient: 'from-emerald-500 to-teal-500' },
            { key: 'card' as const, label: 'ბარათი', icon: CreditCard, gradient: 'from-blue-500 to-indigo-600' },
          ].map(({ key, label, icon: Icon, gradient }) => (
            <button
              key={key}
              onClick={() => setMethod(key)}
              className={cn(
                'flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-bold border-2 transition-all duration-200',
                method === key
                  ? `bg-gradient-to-r ${gradient} text-white border-transparent shadow-md`
                  : 'border-border text-muted-foreground hover:border-border/80 hover:bg-muted/40'
              )}
            >
              <Icon className="size-4" /> {label}
            </button>
          ))}
        </div>

        {/* Sell button */}
        <button
          disabled={items.length === 0}
          onClick={() => setConfirmOpen(true)}
          className={cn(
            'w-full py-4 rounded-2xl text-sm font-black flex items-center justify-center gap-2.5 transition-all duration-200',
            items.length === 0
              ? 'bg-muted text-muted-foreground cursor-not-allowed'
              : 'bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 text-white shadow-xl shadow-emerald-500/30 hover:shadow-emerald-500/50 hover:-translate-y-0.5 active:translate-y-0'
          )}
        >
          <Sparkles className="size-4" />
          გაყიდვა — ₾{total.toFixed(2)}
        </button>
      </div>

      {/* Confirm sale dialog */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>გაყიდვის დადასტურება</AlertDialogTitle>
            <AlertDialogDescription>
              სულ: <strong className="text-foreground">₾{total.toFixed(2)}</strong> &bull; გადახდა: <strong className="text-foreground">{method === 'cash' ? 'ნაღდი' : 'ბარათი'}</strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">გაუქმება</AlertDialogCancel>
            <AlertDialogAction onClick={handleSell} className="rounded-xl bg-gradient-to-r from-emerald-500 to-green-500 border-0 hover:from-emerald-600 hover:to-green-600 text-white">
              <CheckCircle className="size-4 mr-1.5" /> დადასტურება
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Clear confirm */}
      <AlertDialog open={clearOpen} onOpenChange={setClearOpen}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>კალათის გასუფთავება</AlertDialogTitle>
            <AlertDialogDescription>ნამდვილად გსურთ კალათის გასუფთავება?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">გაუქმება</AlertDialogCancel>
            <AlertDialogAction onClick={() => { onClear(); setClearOpen(false) }} className="rounded-xl bg-red-500 hover:bg-red-600 text-white border-0">გასუფთავება</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Receipt */}
      {lastSale && (
        <Dialog open={receiptOpen} onOpenChange={setReceiptOpen}>
          <DialogContent className="max-w-sm rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-center flex items-center justify-center gap-2">
                <CheckCircle className="size-5 text-emerald-500" /> ქვითარი
              </DialogTitle>
            </DialogHeader>
            <div id="receipt-print" className="flex flex-col gap-3 text-sm">
              <div className="text-center py-3 bg-gradient-to-br from-primary/5 to-indigo-50 rounded-xl">
                <p className="font-black text-base text-foreground">AccessoryShop</p>
                <p className="text-xs text-muted-foreground mt-1">{formatDate(lastSale.date)}</p>
              </div>
              <Separator />
              <div className="flex flex-col gap-1.5">
                {lastSale.items.map(item => (
                  <div key={item.product_id} className="flex justify-between text-xs">
                    <span className="truncate flex-1 text-foreground">{item.product_name} <span className="text-muted-foreground">×{item.quantity}</span></span>
                    <span className="font-bold ml-2 text-primary">₾{(item.unit_price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>
              <Separator />
              <div className="flex justify-between font-black text-base">
                <span>სულ:</span>
                <span className="text-primary">₾{lastSale.total.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>გადახდა:</span><span className="font-semibold">{lastSale.method}</span>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setReceiptOpen(false)} className="rounded-xl">დახურვა</Button>
              <Button onClick={() => window.print()} className="rounded-xl bg-gradient-to-r from-primary to-indigo-600 border-0">
                <Printer data-icon="inline-start" /> ბეჭდვა
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </aside>
  )
}
