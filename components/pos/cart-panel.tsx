"use client"

import { useState, useRef, useEffect } from 'react'
import { ShoppingCart, Trash2, Plus, Minus, X, CreditCard, Banknote, CheckCircle, Printer, Sparkles, ReceiptText, Percent, Pause, RotateCcw, Clock, Tag } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import { useStore } from '@/lib/store'
import { issueFiscalReceipt, FiscalError } from '@/lib/fiscal'
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
  onResume?: (items: CartItem[]) => void
  className?: string
}

function formatDate(d: Date) {
  return `${d.getDate().toString().padStart(2, '0')}.${(d.getMonth() + 1).toString().padStart(2, '0')}.${d.getFullYear()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
}

export function CartPanel({ items, onUpdate, onRemove, onClear, onResume, className }: Props) {
  const { addSale, updateSaleFiscal, heldCarts, holdCart, deleteHeldCart } = useStore()
  const [method, setMethod] = useState<'cash' | 'card'>('cash')
  const [fiscalEnabled, setFiscalEnabled] = useState(true)
  const [isSelling, setIsSelling] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [clearOpen, setClearOpen]     = useState(false)
  const [receiptOpen, setReceiptOpen] = useState(false)
  const [heldOpen, setHeldOpen]       = useState(false)
  const [discountType, setDiscountType] = useState<'amount' | 'percent'>('amount')
  const [discountValue, setDiscountValue] = useState('')
  const [lastSale, setLastSale]       = useState<{ items: CartItem[]; subtotal: number; discount: number; total: number; method: string; date: Date; fiscalId?: string | null; fiscalFailed?: boolean } | null>(null)
  const [cartBounce, setCartBounce]   = useState(false)
  const prevCount = useRef(items.length)

  const subtotal = items.reduce((s, i) => s + i.unit_price * i.quantity, 0)
  const count = items.reduce((s, i) => s + i.quantity, 0)
  const rawDiscount = Math.max(0, parseFloat(discountValue) || 0)
  const discountAmount = discountType === 'percent'
    ? Math.min(subtotal, subtotal * rawDiscount / 100)
    : Math.min(subtotal, rawDiscount)
  const total = Math.max(0, subtotal - discountAmount)

  // Bounce icon when item added
  useEffect(() => {
    if (items.length > prevCount.current) {
      setCartBounce(true)
      setTimeout(() => setCartBounce(false), 400)
    }
    prevCount.current = items.length
  }, [items.length])

  const handleSell = async () => {
    if (isSelling) return
    setIsSelling(true)
    const now = new Date()
    const soldItems = [...items]
    try {
      const sale = await addSale(
        { total, discount: discountAmount, payment_method: method, items_count: count, is_fiscal: fiscalEnabled },
        soldItems.map(i => ({
          product_id: i.product_id, product_name: i.product_name, barcode: i.barcode,
          quantity: i.quantity, unit_price: i.unit_price, total_price: i.unit_price * i.quantity,
        }))
      )
      if (!sale) return // store already surfaced the error

      setLastSale({ items: soldItems, subtotal, discount: discountAmount, total, method: method === 'cash' ? 'ნაღდი' : 'ბარათი', date: now })
      setConfirmOpen(false); onClear(); setDiscountValue('')
      toast.success('გაყიდვა წარმატებით დასრულდა!')
      setReceiptOpen(true)

      // Fiscal receipt — only when the cashier asked for one.
      if (fiscalEnabled) {
        const fiscalToast = toast.loading('ფისკალური ჩეკი იბეჭდება...')
        try {
          const result = await issueFiscalReceipt({
            saleId: sale.id,
            total,
            paymentMethod: method,
            items: soldItems.map(i => ({
              name: i.product_name, quantity: i.quantity, unitPrice: i.unit_price,
              total: i.unit_price * i.quantity, barcode: i.barcode,
            })),
          })
          await updateSaleFiscal(sale.id, { fiscal_status: 'success', fiscal_id: result.fiscalId, fiscal_data: result.raw })
          setLastSale(prev => prev ? { ...prev, fiscalId: result.fiscalId } : prev)
          toast.success(`ფისკალური ჩეკი გაიცა #${result.fiscalId}`, { id: fiscalToast })
        } catch (err) {
          await updateSaleFiscal(sale.id, { fiscal_status: 'failed' })
          setLastSale(prev => prev ? { ...prev, fiscalFailed: true } : prev)
          const msg = err instanceof FiscalError ? err.message : 'ფისკალური ჩეკი ვერ გაიცა'
          toast.error(`${msg} — გაყიდვა შენახულია, ჩეკის გამეორება ისტორიიდან შეიძლება`, { id: fiscalToast, duration: 6000 })
        }
      }
    } finally {
      setIsSelling(false)
    }
  }

  const handleHold = async () => {
    if (items.length === 0) return
    await holdCart({
      label: null,
      items: items.map(i => ({
        product_id: i.product_id, product_name: i.product_name, barcode: i.barcode,
        unit_price: i.unit_price, quantity: i.quantity, photo_url: i.photo_url,
      })),
      discount: discountAmount,
      discount_type: rawDiscount > 0 ? discountType : null,
      discount_value: rawDiscount,
      total,
      items_count: count,
    })
    toast.success('კალათა გადადებულია')
    onClear(); setDiscountValue('')
  }

  const handleResume = (cart: typeof heldCarts[number]) => {
    onResume?.(cart.items as CartItem[])
    setDiscountType(cart.discount_type ?? 'amount')
    setDiscountValue(cart.discount_value ? String(cart.discount_value) : '')
    deleteHeldCart(cart.id)
    setHeldOpen(false)
    toast.success('კალათა დაბრუნდა')
  }

  return (
    <aside className={cn("w-full lg:w-96 shrink-0 bg-card/95 backdrop-blur-3xl border border-primary/10 shadow-2xl shadow-primary/5 rounded-[24px] flex flex-col overflow-hidden animate-slide-right", className)}>

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-primary/10 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent">
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
            className="animate-fade-up flex items-center gap-2.5 bg-primary/5 hover:bg-primary/10 rounded-2xl p-2.5 transition-colors group"
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

        {/* Discount control */}
        <div className="flex items-center gap-2">
          <div className="flex bg-muted/50 p-0.5 rounded-xl border border-border shrink-0">
            <button
              onClick={() => setDiscountType('amount')}
              className={cn('size-8 rounded-lg flex items-center justify-center text-sm font-bold transition-all',
                discountType === 'amount' ? 'bg-white text-primary shadow-sm' : 'text-muted-foreground')}
              title="ფიქსირებული თანხა"
            >₾</button>
            <button
              onClick={() => setDiscountType('percent')}
              className={cn('size-8 rounded-lg flex items-center justify-center transition-all',
                discountType === 'percent' ? 'bg-white text-primary shadow-sm' : 'text-muted-foreground')}
              title="პროცენტი"
            ><Percent className="size-3.5" /></button>
          </div>
          <div className="relative flex-1">
            <Tag className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <input
              type="number" min="0" inputMode="decimal"
              value={discountValue}
              onChange={e => setDiscountValue(e.target.value)}
              placeholder={discountType === 'percent' ? 'ფასდაკლება %' : 'ფასდაკლება ₾'}
              className="w-full h-9 pl-9 pr-3 text-sm bg-white border border-border rounded-xl outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition-all"
            />
          </div>
          {discountAmount > 0 && (
            <button onClick={() => setDiscountValue('')} className="size-8 rounded-lg hover:bg-red-50 hover:text-red-500 text-muted-foreground flex items-center justify-center transition-all shrink-0" title="ფასდაკლების მოხსნა">
              <X className="size-4" />
            </button>
          )}
        </div>

        {/* Totals */}
        <div className="flex flex-col gap-1.5 bg-primary/5 rounded-2xl px-4 py-3 border border-primary/5">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">პოზიციები:</span>
            <span className="font-semibold text-foreground">{count}</span>
          </div>
          {discountAmount > 0 && (
            <>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">ქვეჯამი:</span>
                <span className="font-semibold text-foreground tabular-nums">₾{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-emerald-600 font-medium flex items-center gap-1">
                  <Tag className="size-3" /> ფასდაკლება{discountType === 'percent' ? ` (${rawDiscount}%)` : ''}:
                </span>
                <span className="font-bold text-emerald-600 tabular-nums">−₾{discountAmount.toFixed(2)}</span>
              </div>
            </>
          )}
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

        {/* Fiscal receipt toggle */}
        <button
          type="button"
          onClick={() => setFiscalEnabled(v => !v)}
          className={cn(
            'flex items-center gap-3 w-full px-4 py-2.5 rounded-2xl border-2 transition-all duration-200',
            fiscalEnabled
              ? 'border-primary/30 bg-primary/5'
              : 'border-border bg-muted/30'
          )}
        >
          <ReceiptText className={cn('size-4 shrink-0', fiscalEnabled ? 'text-primary' : 'text-muted-foreground')} />
          <div className="flex-1 text-left">
            <p className={cn('text-sm font-bold leading-tight', fiscalEnabled ? 'text-foreground' : 'text-muted-foreground')}>ფისკალური ჩეკი</p>
            <p className="text-[11px] text-muted-foreground leading-tight">{fiscalEnabled ? 'ჩეკი ამოიბეჭდება' : 'ჩეკის გარეშე'}</p>
          </div>
          {/* switch */}
          <span className={cn('relative w-11 h-6 rounded-full transition-colors duration-200 shrink-0', fiscalEnabled ? 'bg-primary' : 'bg-muted-foreground/30')}>
            <span className={cn('absolute top-0.5 size-5 rounded-full bg-white shadow transition-transform duration-200', fiscalEnabled ? 'translate-x-[22px]' : 'translate-x-0.5')} />
          </span>
        </button>

        {/* Held carts access */}
        {heldCarts.length > 0 && (
          <button
            onClick={() => setHeldOpen(true)}
            className="flex items-center gap-2.5 w-full px-4 py-2.5 rounded-2xl border border-amber-200 bg-amber-50/60 hover:bg-amber-50 transition-colors"
          >
            <Clock className="size-4 text-amber-600 shrink-0" />
            <span className="text-sm font-bold text-amber-700 flex-1 text-left">გადადებული კალათები</span>
            <span className="text-[11px] font-black px-2 py-0.5 rounded-lg bg-amber-500 text-white">{heldCarts.length}</span>
          </button>
        )}

        {/* Hold + Sell */}
        <div className="flex gap-2">
          <button
            disabled={items.length === 0 || isSelling}
            onClick={handleHold}
            title="კალათის გადადება"
            className={cn(
              'shrink-0 px-4 py-4 rounded-2xl text-sm font-black flex items-center justify-center gap-2 transition-all duration-200 border-2',
              items.length === 0 || isSelling
                ? 'border-border bg-muted text-muted-foreground cursor-not-allowed'
                : 'border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100 active:scale-95'
            )}
          >
            <Pause className="size-4" />
            <span className="hidden sm:inline">გადადება</span>
          </button>
          <button
            disabled={items.length === 0 || isSelling}
            onClick={() => setConfirmOpen(true)}
            className={cn(
              'flex-1 py-4 rounded-2xl text-sm font-black flex items-center justify-center gap-2.5 transition-all duration-200',
              items.length === 0 || isSelling
                ? 'bg-muted text-muted-foreground cursor-not-allowed'
                : 'bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 text-white shadow-xl shadow-emerald-500/30 hover:shadow-emerald-500/50 hover:-translate-y-0.5 active:translate-y-0'
            )}
          >
            <Sparkles className="size-4" />
            გაყიდვა — ₾{total.toFixed(2)}
          </button>
        </div>
      </div>

      {/* Confirm sale dialog */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>გაყიდვის დადასტურება</AlertDialogTitle>
            <AlertDialogDescription>
              სულ: <strong className="text-foreground">₾{total.toFixed(2)}</strong> &bull; გადახდა: <strong className="text-foreground">{method === 'cash' ? 'ნაღდი' : 'ბარათი'}</strong>
              <span className={cn('mt-2 flex items-center gap-1.5 text-xs font-semibold', fiscalEnabled ? 'text-primary' : 'text-muted-foreground')}>
                <ReceiptText className="size-3.5" />
                {fiscalEnabled ? 'ფისკალური ჩეკი ამოიბეჭდება' : 'ფისკალური ჩეკის გარეშე'}
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl" disabled={isSelling}>გაუქმება</AlertDialogCancel>
            <AlertDialogAction onClick={handleSell} disabled={isSelling} className="rounded-xl bg-gradient-to-r from-emerald-500 to-green-500 border-0 hover:from-emerald-600 hover:to-green-600 text-white">
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

      {/* Held carts dialog */}
      <Dialog open={heldOpen} onOpenChange={setHeldOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock className="size-5 text-amber-500" /> გადადებული კალათები
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-2 max-h-[60vh] overflow-y-auto py-1">
            {heldCarts.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">გადადებული კალათა არ არის</p>
            ) : heldCarts.map(cart => (
              <div key={cart.id} className="flex items-center gap-3 bg-muted/40 rounded-2xl p-3">
                <div className="size-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                  <ShoppingCart className="size-4 text-amber-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-foreground">₾{cart.total.toFixed(2)} <span className="text-xs font-normal text-muted-foreground">· {cart.items_count} პოზიცია</span></p>
                  <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                    <Clock className="size-3" /> {formatDate(new Date(cart.created_at))}
                    {cart.discount > 0 && <span className="text-emerald-600 font-semibold ml-1">−₾{cart.discount.toFixed(2)}</span>}
                  </p>
                </div>
                <button
                  onClick={() => handleResume(cart)}
                  className="flex items-center gap-1.5 px-3 h-9 rounded-xl bg-gradient-to-r from-primary to-indigo-600 text-white text-xs font-bold shadow-md shadow-primary/25 hover:scale-105 transition-transform shrink-0"
                >
                  <RotateCcw className="size-3.5" /> დაბრუნება
                </button>
                <button
                  onClick={() => deleteHeldCart(cart.id)}
                  className="size-9 rounded-xl hover:bg-red-50 hover:text-red-500 text-muted-foreground flex items-center justify-center transition-all shrink-0"
                  title="წაშლა"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

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
              {lastSale.discount > 0 && (
                <>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>ქვეჯამი:</span><span className="tabular-nums">₾{lastSale.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-emerald-600 font-semibold">
                    <span>ფასდაკლება:</span><span className="tabular-nums">−₾{lastSale.discount.toFixed(2)}</span>
                  </div>
                </>
              )}
              <div className="flex justify-between font-black text-base">
                <span>სულ:</span>
                <span className="text-primary">₾{lastSale.total.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>გადახდა:</span><span className="font-semibold">{lastSale.method}</span>
              </div>
              {lastSale.fiscalId && (
                <div className="flex justify-between text-xs text-emerald-700 bg-emerald-50 rounded-lg px-2 py-1.5">
                  <span className="flex items-center gap-1"><ReceiptText className="size-3.5" /> ფისკალური ჩეკი:</span>
                  <span className="font-mono font-bold">#{lastSale.fiscalId}</span>
                </div>
              )}
              {lastSale.fiscalFailed && (
                <div className="text-xs text-amber-700 bg-amber-50 rounded-lg px-2 py-1.5">
                  ⚠ ფისკალური ჩეკი ვერ გაიცა — გაყიდვა შენახულია, ჩეკი მოგვიანებით განმეორდება
                </div>
              )}
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
