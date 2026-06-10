"use client"

import { useState, useCallback, useRef, useEffect } from 'react'
import { ProductGrid } from '@/components/pos/product-grid'
import { CartPanel, type CartItem } from '@/components/pos/cart-panel'
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet'
import { ShoppingCart } from 'lucide-react'
import { useBarcodeScanner } from '@/hooks/use-barcode-scanner'
import { useStore } from '@/lib/store'
import { toast } from 'sonner'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'

export default function POSPage() {
  const { products } = useStore()
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const cartItemsRef = useRef(cartItems)
  const productsRef = useRef(products)
  const [qtyConfirmObj, setQtyConfirmObj] = useState<{ productId: string, newQty: number } | null>(null)

  useEffect(() => {
    cartItemsRef.current = cartItems
  }, [cartItems])

  useEffect(() => {
    productsRef.current = products
  }, [products])

  // Available stock for a product (always read fresh, not from a stale closure).
  const stockOf = (id: string) => productsRef.current.find(p => p.id === id)?.quantity ?? 0

  const addToCart = useCallback((item: CartItem) => {
    const stock = stockOf(item.product_id)
    const existing = cartItemsRef.current.find(i => i.product_id === item.product_id)
    if (existing) {
      const newQty = existing.quantity + 1
      if (newQty > stock) { toast.warning(`მხოლოდ ${stock} ცალია მარაგში`); return }
      setQtyConfirmObj({ productId: item.product_id, newQty })
    } else {
      if (stock < 1) { toast.warning('მარაგი ამოიწურა'); return }
      setCartItems(prev => [...prev, item])
    }
  }, [])

  // Global barcode scanner — auto-adds scanned product to cart
  useBarcodeScanner({
    onScan: (code: string) => {
      const product = products.find(p => p.barcode === code)
      if (!product) {
        toast.error(`შტრიხკოდი ვერ მოიძებნა: ${code}`)
        return
      }
      if (product.quantity <= 0) {
        toast.warning(`${product.name} — მარაგი ამოიწურა!`)
        return
      }
      
      const existing = cartItemsRef.current.find(i => i.product_id === product.id)
      if (existing) {
        const newQty = existing.quantity + 1
        if (newQty > stockOf(product.id)) {
          toast.warning(`${product.name} — მხოლოდ ${stockOf(product.id)} ცალია მარაგში`)
          return
        }
        setQtyConfirmObj({ productId: product.id, newQty })
      } else {
        addToCart({
          product_id: product.id,
          product_name: product.name,
          barcode: product.barcode ?? null,
          unit_price: product.sale_price,
          quantity: 1,
          photo_url: product.photo_url ?? null,
        })
        toast.success(`✓ ${product.name}`, { duration: 1500 })
      }
    },
  })

  // updateCart handles + - buttons and manual qty input
  const updateCart = useCallback((productId: string, qty: number) => {
    if (qty <= 0) {
      // Removing item
      setCartItems(prev => prev.filter(i => i.product_id !== productId))
      return
    }
    const stock = stockOf(productId)
    if (qty > stock) {
      // Never let cart quantity exceed available stock — clamp and warn.
      toast.warning(`მხოლოდ ${stock} ცალია მარაგში`)
      setCartItems(prev => prev.map(i => i.product_id === productId ? { ...i, quantity: stock } : i))
      return
    }
    const existing = cartItemsRef.current.find(i => i.product_id === productId)
    if (existing && qty > existing.quantity) {
      // Trying to increase quantity — confirm
      setQtyConfirmObj({ productId, newQty: qty })
    } else {
      // Decreasing quantity or typing the exact same
      setCartItems(prev => prev.map(i => i.product_id === productId ? { ...i, quantity: qty } : i))
    }
  }, [])

  const removeFromCart = useCallback((productId: string) => {
    setCartItems(prev => prev.filter(i => i.product_id !== productId))
  }, [])

  const clearCart = useCallback(() => setCartItems([]), [])

  // Resume a held cart: replace the current cart with the saved items.
  const resumeCart = useCallback((heldItems: CartItem[]) => setCartItems(heldItems), [])

  const handleConfirmIncrement = () => {
    if (qtyConfirmObj) {
      const { productId, newQty } = qtyConfirmObj
      const capped = Math.min(newQty, stockOf(productId)) // never exceed stock
      setCartItems(prev => prev.map(i => i.product_id === productId ? { ...i, quantity: capped } : i))
      setQtyConfirmObj(null)
    }
  }

  const cartTotal = cartItems.reduce((acc, item) => acc + item.unit_price * item.quantity, 0)
  const cartCount = cartItems.reduce((acc, item) => acc + item.quantity, 0)

  // Find confirmed product name if available for a better dialog
  const confirmingProduct = qtyConfirmObj 
    ? cartItems.find(i => i.product_id === qtyConfirmObj.productId)?.product_name 
    : ''

  return (
    <div className="flex gap-5 h-full min-h-0 relative pb-24 lg:pb-0 animate-fade-up">
      <ProductGrid onAddToCart={addToCart} />
      
      {/* Desktop side panel */}
      <div className="hidden lg:block h-full">
        <CartPanel
          items={cartItems}
          onUpdate={updateCart}
          onRemove={removeFromCart}
          onClear={clearCart}
          onResume={resumeCart}
          className="h-full"
        />
      </div>

      {/* Mobile sticky bottom button & Sheet */}
      <div className="fixed bottom-4 left-4 right-4 z-50 lg:hidden">
        <Sheet>
          <SheetTrigger className="w-full bg-gradient-to-r from-primary to-indigo-600 hover:from-primary/90 hover:to-indigo-500 text-primary-foreground shadow-[0_16px_32px_-12px_var(--color-primary)] rounded-2xl p-4 flex items-center justify-between transition-transform active:scale-95 border-none outline-none">
            <div className="flex items-center gap-3">
              <div className="size-10 bg-white/20 rounded-xl flex items-center justify-center">
                <ShoppingCart className="size-5" />
              </div>
              <div className="flex flex-col items-start px-1">
                 <span className="font-bold text-[10px] tracking-wider uppercase opacity-80 leading-none">კალათა</span>
                 <span className="font-black text-[15px] leading-tight mt-0.5">{cartCount} პოზიცია</span>
              </div>
            </div>
            <div className="bg-white/20 px-3 py-1.5 rounded-xl shadow-inner">
               <span className="font-black text-xl">₾{cartTotal.toFixed(2)}</span>
            </div>
          </SheetTrigger>
          <SheetContent side="bottom" className="p-0 border-none h-[88vh] bg-transparent shadow-none flex flex-col focus-visible:outline-none px-2 pb-2">
            <SheetTitle className="sr-only">კალათა</SheetTitle>
            <div className="flex-1 overflow-hidden">
               <CartPanel
                 items={cartItems}
                 onUpdate={updateCart}
                 onRemove={removeFromCart}
                 onClear={clearCart}
                 onResume={resumeCart}
                 className="h-full w-full border border-border/50 rounded-3xl shadow-[0_-8px_30px_-10px_rgba(0,0,0,0.1)]"
               />
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Confirmation Dialog for Quantity Increment */}
      <AlertDialog open={!!qtyConfirmObj} onOpenChange={v => !v && setQtyConfirmObj(null)}>
        <AlertDialogContent className="rounded-3xl border-border/50 bg-background/95 backdrop-blur-3xl shadow-2xl sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-black text-foreground">გაფრთხილება</AlertDialogTitle>
            <AlertDialogDescription className="text-base font-medium text-muted-foreground mt-2 leading-relaxed">
              პროდუქცია <strong className="text-foreground">"{confirmingProduct}"</strong> უკვე არსებობს კალათაში. <br/><br/>
              ნამდვილად გსურთ რაოდენობის გაზრდა <strong className="text-primary">{qtyConfirmObj?.newQty}</strong> ცალამდე?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6 gap-2 sm:gap-0">
            <AlertDialogCancel className="h-12 rounded-xl px-6 font-bold hover:bg-muted text-[15px] border-border/50">არა, გაუქმება</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmIncrement}
              className="h-12 rounded-xl px-8 font-black bg-gradient-to-r from-primary to-indigo-600 text-white hover:scale-[1.02] transition-transform text-[15px] border-0 shadow-lg shadow-primary/25"
            >
              კი, დამატება
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
