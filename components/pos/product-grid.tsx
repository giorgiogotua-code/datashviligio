"use client"

import { useState, useCallback } from 'react'
import { Search, Package, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useStore } from '@/lib/store'
import type { CartItem } from './cart-panel'

const CAT_GRADIENTS = [
  'from-blue-500 to-indigo-600',
  'from-violet-500 to-purple-600',
  'from-emerald-500 to-teal-500',
  'from-amber-400 to-orange-500',
  'from-rose-500 to-pink-600',
  'from-cyan-500 to-sky-600',
]
const CAT_SOFT = [
  'bg-blue-50 text-blue-700 border-blue-200',
  'bg-violet-50 text-violet-700 border-violet-200',
  'bg-emerald-50 text-emerald-700 border-emerald-200',
  'bg-amber-50 text-amber-700 border-amber-200',
  'bg-rose-50 text-rose-700 border-rose-200',
  'bg-cyan-50 text-cyan-700 border-cyan-200',
]

interface Props { onAddToCart: (item: CartItem) => void }

export function ProductGrid({ onAddToCart }: Props) {
  const { products, categories } = useStore()
  const [search, setSearch] = useState('')
  const [activeCat, setActiveCat] = useState<string | null>(null)
  const [flashId, setFlashId] = useState<string | null>(null)

  const roots = categories.filter(c => !c.parent_id)

  const filtered = products.filter(p => {
    const q = search.toLowerCase()
    const matchSearch = !q || p.name.toLowerCase().includes(q) || (p.barcode ?? '').includes(q)
    const matchCat = !activeCat
      ? true
      : p.category_id === activeCat || categories.find(c => c.id === p.category_id)?.parent_id === activeCat
    return matchSearch && matchCat
  })

  const handleAdd = useCallback((product: typeof products[number]) => {
    if (product.quantity === 0) return
    onAddToCart({
      product_id: product.id,
      product_name: product.name,
      barcode: product.barcode,
      unit_price: product.sale_price,
      quantity: 1,
      photo_url: product.photo_url,
    })
    setFlashId(product.id)
    setTimeout(() => setFlashId(null), 400)
  }, [products, onAddToCart])

  const handleSearchKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return
    const found = products.find(p => p.barcode === search.trim())
    if (found) { handleAdd(found); setSearch('') }
  }, [products, search, handleAdd])

  return (
    <div className="flex-1 flex flex-col gap-4 min-w-0 animate-fade-up">

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4.5 text-muted-foreground" />
        <input
          type="text"
          className="w-full h-12 pl-12 pr-4 text-sm bg-white border border-border rounded-2xl outline-none focus:border-primary/50 focus:shadow-md focus:shadow-primary/10 transition-all placeholder:text-muted-foreground/60 font-sans"
          placeholder="სახელი ან შტრიხკოდი... (Enter = სწრაფი დამატება)"
          value={search}
          onChange={e => setSearch(e.target.value)}
          onKeyDown={handleSearchKeyDown}
        />
      </div>

      {/* Category pills */}
      <div className="flex gap-2 overflow-x-auto pb-1 flex-nowrap scrollbar-none">
        <button
          onClick={() => setActiveCat(null)}
          className={cn(
            'shrink-0 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 border',
            !activeCat
              ? 'bg-gradient-to-r from-primary to-indigo-600 text-white border-transparent shadow-md shadow-primary/25'
              : 'border-border text-muted-foreground hover:bg-accent hover:text-foreground'
          )}
        >
          ყველა
        </button>
        {roots.map((cat, i) => (
          <button
            key={cat.id}
            onClick={() => setActiveCat(cat.id === activeCat ? null : cat.id)}
            className={cn(
              'shrink-0 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 border',
              activeCat === cat.id
                ? 'bg-gradient-to-r text-white border-transparent shadow-md ' + CAT_GRADIENTS[i % CAT_GRADIENTS.length]
                : 'border-border ' + CAT_SOFT[i % CAT_SOFT.length]
            )}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Count + label */}
      <div className="flex items-center gap-2">
        <p className="text-xs text-muted-foreground font-medium">{filtered.length} პროდუქტი</p>
        {search && <span className="text-[11px] bg-primary/10 text-primary px-2 py-0.5 rounded-lg font-semibold">ფილტრი: {search}</span>}
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto -mr-1 pr-1">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-muted-foreground gap-4">
            <div className="size-20 rounded-3xl bg-muted flex items-center justify-center">
              <Package className="size-9 opacity-20" />
            </div>
            <p className="text-sm font-medium">პროდუქტები ვერ მოიძებნა</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {filtered.map(product => {
              const outOfStock = product.quantity === 0
              const isFlash = flashId === product.id
              return (
                <button
                  key={product.id}
                  disabled={outOfStock}
                  onClick={() => handleAdd(product)}
                  className={cn(
                    'product-card group relative flex flex-col bg-white rounded-2xl border border-border overflow-hidden text-left',
                    outOfStock ? 'opacity-45 cursor-not-allowed' : 'cursor-pointer',
                    isFlash && 'ring-2 ring-primary/50 ring-offset-1'
                  )}
                >
                  {/* Photo area */}
                  <div className="relative w-full aspect-square overflow-hidden bg-muted">
                    {product.photo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={product.photo_url}
                        alt={product.name}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-accent to-blue-50">
                        <span className="text-4xl font-black text-primary/20">{product.name.charAt(0)}</span>
                      </div>
                    )}

                    {/* Stock badge */}
                    {!outOfStock && product.quantity <= 5 && (
                      <div className="absolute top-2 left-2">
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-lg bg-amber-500 text-white shadow-sm">
                          {product.quantity} დარჩა
                        </span>
                      </div>
                    )}
                    {outOfStock && (
                      <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] flex items-center justify-center">
                        <span className="text-[11px] font-bold px-2.5 py-1 rounded-xl bg-red-500 text-white">ამოიწურა</span>
                      </div>
                    )}

                    {/* Add overlay on hover */}
                    {!outOfStock && (
                      <div className="absolute inset-0 bg-gradient-to-t from-primary/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-end justify-center pb-3">
                        <div className="flex items-center gap-1.5 bg-white/20 backdrop-blur-sm text-white text-xs font-bold px-3 py-1.5 rounded-xl border border-white/30">
                          <Sparkles className="size-3" />
                          დამატება
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="p-2.5 flex flex-col gap-1">
                    <p className="text-xs font-semibold text-foreground line-clamp-2 leading-relaxed">
                      {product.name}
                    </p>
                    <p className="text-sm font-black text-primary">₾{product.sale_price.toFixed(2)}</p>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
