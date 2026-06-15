"use client"

import { useState, useEffect, useRef } from 'react'
import { Upload, Barcode, TrendingUp, Loader2, Plus, Equal, Package } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { useStore } from '@/lib/store'
import { toast } from 'sonner'
import type { Product, Category } from '@/lib/mock-data'
import { cn } from '@/lib/utils'
import imageCompression from 'browser-image-compression'

interface Props {
  open: boolean
  onClose: () => void
  product?: Product | null
  prefillBarcode?: string
  autoFocusQuantity?: boolean
}

type FormData = {
  name: string
  barcode: string
  purchase_price: string
  sale_price: string
  quantity: string
  major_category_id: string
  sub_category_id: string
  photo_url: string
}

const EMPTY: FormData = { name: '', barcode: '', purchase_price: '', sale_price: '', quantity: '1', major_category_id: '', sub_category_id: '', photo_url: '' }

export function ProductDialog({ open, onClose, product, prefillBarcode, autoFocusQuantity }: Props) {
  const { categories, addProduct, updateProduct } = useStore()
  const [form, setForm] = useState<FormData>(EMPTY)
  const [photoPreview, setPhotoPreview] = useState<string>('')
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [isCompressing, setIsCompressing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  // When editing: 'add' adds to current stock, 'set' replaces it.
  const [stockMode, setStockMode] = useState<'add' | 'set'>('add')
  const quantityInputRef = useRef<HTMLInputElement>(null)

  const allCats = categories
  const rootCats = categories.filter(c => !c.parent_id)
  const childCats = (parentId: string) => allCats.filter(c => c.parent_id === parentId)

  useEffect(() => {
    if (product) {
      const cat = allCats.find(c => c.id === product.category_id)
      const major = cat?.parent_id ? cat.parent_id : (cat?.id || '')
      const sub = cat?.parent_id ? cat.id : ''
      setForm({
        name: product.name,
        barcode: product.barcode ?? '',
        purchase_price: String(product.purchase_price),
        sale_price: String(product.sale_price),
        quantity: '', // in edit mode this is the amount to add (add mode) — start empty
        major_category_id: major,
        sub_category_id: sub,
        photo_url: product.photo_url ?? '',
      })
      setStockMode('add')
      setPhotoPreview(product.photo_url ?? '')
    } else {
      setForm({ ...EMPTY, barcode: prefillBarcode ?? '' })
      setPhotoPreview('')
    }
    setPhotoFile(null)
  }, [product, prefillBarcode, open, allCats])

  useEffect(() => {
    // Auto-focus quantity input if requested
    if (open && autoFocusQuantity && quantityInputRef.current) {
      setTimeout(() => {
        quantityInputRef.current?.focus()
        quantityInputRef.current?.select()
      }, 100) // Small delay to let dialog render and animate
    }
  }, [open, autoFocusQuantity])

  const purchase = parseFloat(form.purchase_price) || 0
  const sale = parseFloat(form.sale_price) || 0
  const profit = sale - purchase
  const profitPct = purchase > 0 ? Math.round((profit / purchase) * 100) : 0

  // Live preview of the resulting stock for the edit dialog.
  const enteredQty = parseInt(form.quantity) || 0
  const resultingStock = !product
    ? enteredQty
    : stockMode === 'add'
      ? Math.max(0, product.quantity + enteredQty)
      : enteredQty

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    setIsCompressing(true)
    const toastId = toast.loading('ფოტოს ოპტიმიზაცია მიმდინარეობს...')

    try {
      const options = {
        maxSizeMB: 0.3,
        maxWidthOrHeight: 800,
        useWebWorker: true,
      }
      
      const compressedFile = await imageCompression(file, options)

      // Keep the compressed file for upload on save; show a local preview meanwhile.
      setPhotoFile(compressedFile)
      const url = URL.createObjectURL(compressedFile)
      setPhotoPreview(url)

      const originalSize = (file.size / 1024).toFixed(0)
      const compressedSize = (compressedFile.size / 1024).toFixed(0)
      toast.success(`ფოტო შეიკუმშა: ${originalSize}KB → ${compressedSize}KB`, { id: toastId })
    } catch (error) {
      toast.error('ფოტოს ოპტიმიზაცია ვერ მოხერხდა', { id: toastId })
      console.error(error)
    } finally {
      setIsCompressing(false)
    }
  }

  const uploadPhoto = async (file: File): Promise<string> => {
    const fd = new FormData()
    fd.append('file', file)
    const res = await fetch('/api/upload', { method: 'POST', body: fd })
    if (!res.ok) throw new Error('upload failed')
    const json = await res.json()
    if (!json.url) throw new Error('upload failed')
    return json.url as string
  }

  const handleSave = async () => {
    if (isSaving) return
    if (!form.name.trim()) { toast.error('სახელი სავალდებულოა'); return }
    if (!form.major_category_id) { toast.error('მთავარი კატეგორია სავალდებულოა'); return }
    if (!form.purchase_price || !form.sale_price) { toast.error('ფასები სავალდებულოა'); return }

    const finalCategoryId = form.sub_category_id || form.major_category_id

    setIsSaving(true)
    try {
      // Upload a freshly selected photo to R2 first; otherwise keep the existing URL.
      let photoUrl: string | null = form.photo_url || null
      if (photoFile) {
        const toastId = toast.loading('ფოტო იტვირთება...')
        try {
          photoUrl = await uploadPhoto(photoFile)
          toast.success('ფოტო აიტვირთა', { id: toastId })
        } catch {
          toast.error('ფოტოს ატვირთვა ვერ მოხერხდა', { id: toastId })
          return
        }
      }

      // Quantity: new product = entered; edit + 'add' = current + entered; edit + 'set' = entered.
      const enteredQty = parseInt(form.quantity) || 0
      const finalQty = !product
        ? enteredQty
        : stockMode === 'add'
          ? Math.max(0, product.quantity + enteredQty)
          : enteredQty

      const data = {
        name: form.name.trim(),
        barcode: form.barcode || null,
        category_id: finalCategoryId,
        purchase_price: parseFloat(form.purchase_price),
        sale_price: parseFloat(form.sale_price),
        quantity: finalQty,
        photo_url: photoUrl,
      }

      if (product) {
        await updateProduct(product.id, data)
        toast.success('პროდუქტი განახლდა')
      } else {
        await addProduct(data)
        toast.success('პროდუქტი დაემატა')
      }
      onClose()
    } finally {
      setIsSaving(false)
    }
  }

  const f = (k: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }))

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-[760px] w-full rounded-[32px] p-7 md:p-9 border-white/50 shadow-2xl bg-slate-50/95 backdrop-blur-3xl">
        <DialogHeader className="mb-2">
          <DialogTitle className="text-2xl font-black text-foreground">{product ? 'პროდუქტის რედაქტირება' : 'ახალი პროდუქტის დამატება'}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-8 py-2">
          {/* Top part — fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="flex flex-col gap-2">
              <label className="text-[11px] font-black text-muted-foreground uppercase tracking-wider pl-1">სახელი <span className="text-red-500">*</span></label>
              <Input className="h-12 rounded-2xl bg-white border-border/50 focus-visible:ring-primary/20 shadow-sm" placeholder="მაგ: Samsung A54 ქეისი" value={form.name} onChange={f('name')} />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-[11px] font-black text-muted-foreground uppercase tracking-wider pl-1">შტრიხკოდი</label>
              <div className="relative">
                <Input className="h-12 rounded-2xl bg-white border-border/50 focus-visible:ring-primary/20 shadow-sm pr-10 font-mono text-sm" placeholder="სკანი ან ხელით" value={form.barcode} onChange={f('barcode')} />
                <Barcode className="absolute right-3 top-1/2 -translate-y-1/2 size-5 text-muted-foreground/60" />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-[11px] font-black text-muted-foreground uppercase tracking-wider pl-1">შესყიდვა (₾) <span className="text-red-500">*</span></label>
              <Input className="h-12 rounded-2xl bg-white border-border/50 focus-visible:ring-primary/20 shadow-sm font-medium" type="number" min="0" step="0.01" placeholder="0.00" value={form.purchase_price} onChange={f('purchase_price')} />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-[11px] font-black text-muted-foreground uppercase tracking-wider pl-1">გაყიდვა (₾) <span className="text-red-500">*</span></label>
              <Input className="h-12 rounded-2xl bg-white border-border/50 focus-visible:ring-primary/20 shadow-sm font-bold text-primary" type="number" min="0" step="0.01" placeholder="0.00" value={form.sale_price} onChange={f('sale_price')} />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-[11px] font-black text-muted-foreground uppercase tracking-wider pl-1">მთავარი კატ. <span className="text-red-500">*</span></label>
              <Select value={form.major_category_id} onValueChange={(v: string | null) => setForm(p => ({ ...p, major_category_id: v || '', sub_category_id: '' }))}>
                <SelectTrigger className="h-12 rounded-2xl bg-white border-border/50 focus:ring-primary/20 shadow-sm">
                  <span className="flex-1 truncate text-left">
                    {form.major_category_id 
                      ? rootCats.find(c => c.id === form.major_category_id)?.name || form.major_category_id
                      : <span className="text-muted-foreground/60">აირჩიეთ...</span>}
                  </span>
                </SelectTrigger>
                <SelectContent className="rounded-2xl border-border/50 shadow-xl">
                  {rootCats.map(root => (
                    <SelectItem className="rounded-xl" key={root.id} value={root.id}>{root.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-[11px] font-black text-muted-foreground uppercase tracking-wider pl-1">ქვეკატეგორია</label>
              <Select 
                value={form.sub_category_id} 
                onValueChange={(v: string | null) => setForm(p => ({ ...p, sub_category_id: v || '' }))}
                disabled={!form.major_category_id || childCats(form.major_category_id).length === 0}
              >
                <SelectTrigger className={cn("h-12 rounded-2xl bg-white border-border/50 focus:ring-primary/20 shadow-sm", !form.major_category_id && "opacity-50 blur-[0.5px]")}>
                  <span className="flex-1 truncate text-left">
                    {form.sub_category_id && form.major_category_id
                      ? childCats(form.major_category_id).find(c => c.id === form.sub_category_id)?.name || form.sub_category_id
                      : <span className="text-muted-foreground/60">აირჩიეთ...</span>}
                  </span>
                </SelectTrigger>
                <SelectContent className="rounded-2xl border-border/50 shadow-xl">
                  {form.major_category_id && childCats(form.major_category_id).map(child => (
                    <SelectItem className="rounded-xl" key={child.id} value={child.id}>{child.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-[11px] font-black text-muted-foreground uppercase tracking-wider pl-1 flex items-center gap-2">
                მარაგი <span className="text-red-500">*</span>
                {product && (
                  <span className="ml-auto inline-flex items-center gap-1 normal-case font-bold text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-md">
                    <Package className="size-3" /> ახლა: {product.quantity}
                  </span>
                )}
              </label>

              {product ? (
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-stretch gap-1.5">
                    {/* add / set toggle */}
                    <div className="flex bg-muted/60 p-0.5 rounded-xl border border-border/50 shrink-0">
                      <button
                        type="button"
                        onClick={() => { setStockMode('add'); setForm(p => ({ ...p, quantity: '' })) }}
                        title="ნაშთს დაამატე"
                        className={cn('flex items-center gap-1 px-2.5 rounded-lg text-xs font-bold transition-all',
                          stockMode === 'add' ? 'bg-white text-primary shadow-sm' : 'text-muted-foreground')}
                      >
                        <Plus className="size-3.5" /> დამატება
                      </button>
                      <button
                        type="button"
                        onClick={() => { setStockMode('set'); setForm(p => ({ ...p, quantity: String(product.quantity) })) }}
                        title="ახალი მთლიანი ნაშთი"
                        className={cn('flex items-center gap-1 px-2.5 rounded-lg text-xs font-bold transition-all',
                          stockMode === 'set' ? 'bg-white text-primary shadow-sm' : 'text-muted-foreground')}
                      >
                        <Equal className="size-3.5" /> ახალი
                      </button>
                    </div>
                    <Input
                      ref={quantityInputRef}
                      className="h-12 flex-1 rounded-2xl bg-white border-border/50 focus-visible:ring-primary/20 shadow-sm"
                      type="number" min="0"
                      placeholder={stockMode === 'add' ? 'დასამატებელი' : 'ახალი მთლიანი'}
                      value={form.quantity} onChange={f('quantity')}
                    />
                  </div>
                  <p className="text-[11px] text-muted-foreground pl-1">
                    ნაშთი გახდება: <span className="font-black text-primary">{resultingStock}</span>
                    {stockMode === 'add' && enteredQty > 0 && <span className="text-muted-foreground/70"> ({product.quantity} + {enteredQty})</span>}
                  </p>
                </div>
              ) : (
                <Input ref={quantityInputRef} className="h-12 rounded-2xl bg-white border-border/50 focus-visible:ring-primary/20 shadow-sm" type="number" min="0" value={form.quantity} onChange={f('quantity')} />
              )}
            </div>

            <div className="flex flex-col gap-2 justify-end pb-1">
              {purchase > 0 && sale > 0 && (
                <div className={cn(
                  'flex items-center gap-2 px-4 h-12 rounded-2xl text-[13px] font-bold shadow-sm w-full',
                  profit >= 0 ? 'bg-green-100/50 text-green-700 border border-green-200' : 'bg-red-100/50 text-red-700 border border-red-200'
                )}>
                  <TrendingUp className="size-4 shrink-0" />
                  მოსალოდნელი მოგება: ₾{profit.toFixed(2)} ({profitPct}%)
                </div>
              )}
            </div>
          </div>

          {/* Bottom part — photo */}
          <div className="flex flex-col gap-2 w-full">
            <label className="text-[11px] font-black text-muted-foreground uppercase tracking-wider pl-1">ფოტოს ატვირთვა</label>
            <label
              className={cn(
                'w-full h-[180px] flex flex-col items-center justify-center rounded-[24px] border-2 border-dashed cursor-pointer transition-all duration-300 overflow-hidden relative shadow-inner',
                photoPreview ? 'border-primary/50 shadow-lg shadow-primary/10' : 'border-border hover:border-primary/50 hover:bg-white/60 bg-white/30'
              )}
            >
              <input type="file" accept="image/*" className="sr-only" onChange={handlePhotoChange} disabled={isCompressing} />
              {isCompressing ? (
                 <div className="flex flex-col items-center gap-3 text-primary p-6 text-center z-10 relative bg-white/80 backdrop-blur m-4 rounded-2xl">
                   <Loader2 className="size-8 animate-spin" />
                   <p className="text-sm font-black">მიმდინარეობს ოპტიმიზაცია...</p>
                 </div>
              ) : photoPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photoPreview} alt="preview" className="w-full h-full object-contain bg-white/40 backdrop-blur-sm" />
              ) : (
                <div className="flex flex-col items-center gap-3 text-muted-foreground p-6 text-center">
                  <div className="size-16 rounded-[20px] bg-gradient-to-br from-white to-muted flex items-center justify-center shadow-md shadow-black/5 ring-1 ring-border/50 group-hover:scale-110 transition-transform">
                    <Upload className="size-6 text-primary/60" />
                  </div>
                  <div className="space-y-1 mt-2">
                    <p className="text-[15px] font-black tracking-tight text-foreground/80">დააწკაპუნეთ აქ ფოტოს ასატვირთად</p>
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-primary/60">ავტომატური ოპტიმიზაცია (მაქს. 800px)</p>
                  </div>
                </div>
              )}
            </label>
            {photoPreview && (
              <Button
                variant="outline"
                className="mt-1 h-11 rounded-xl font-bold bg-white/40 hover:bg-red-50 hover:text-red-600 hover:border-red-200"
                onClick={() => { setPhotoPreview(''); setPhotoFile(null); setForm(p => ({ ...p, photo_url: '' })) }}
              >
                ფოტოს წაშლა
              </Button>
            )}
          </div>
        </div>

        <DialogFooter className="mt-4 gap-2 sm:gap-0">
          <Button variant="ghost" onClick={onClose} disabled={isSaving} className="rounded-xl h-12 px-6 font-bold hover:bg-muted/60 text-muted-foreground text-[15px]">გაუქმება</Button>
          <Button onClick={handleSave} disabled={isSaving || isCompressing} className="rounded-xl h-12 px-8 bg-gradient-to-r from-primary to-indigo-600 border-0 shadow-lg shadow-primary/30 font-black text-white text-[15px] hover:scale-[1.02] transition-transform disabled:opacity-70 disabled:hover:scale-100">
            {isSaving ? <Loader2 className="size-5 animate-spin" /> : 'შენახვა'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
