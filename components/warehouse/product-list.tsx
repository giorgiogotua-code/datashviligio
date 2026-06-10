"use client"

import { useState, useRef } from 'react'
import { Plus, Search, Edit2, Trash2, Package, ScanLine, ChevronLeft, ChevronRight, FileDown, FileUp, Download, Layers } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { useStore } from '@/lib/store'
import { ProductDialog } from './product-dialog'
import { ImportDialog } from './import-dialog'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import type { Product } from '@/lib/mock-data'
import { useBarcodeScanner } from '@/hooks/use-barcode-scanner'
import * as XLSX from 'xlsx'

const PAGE_SIZE = 15

function StockBadge({ qty }: { qty: number }) {
  if (qty === 0)  return <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[11px] font-semibold bg-red-100 text-red-600 border border-red-200">ამოიწურა</span>
  if (qty <= 3)   return <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[11px] font-semibold bg-red-50 text-red-500 border border-red-100">{qty} რჩება</span>
  if (qty <= 10)  return <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[11px] font-semibold bg-amber-50 text-amber-600 border border-amber-100">{qty}</span>
  return             <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[11px] font-semibold bg-emerald-50 text-emerald-600 border border-emerald-100">{qty}</span>
}

export function ProductList({ selectedCategoryId, onOpenMobileCategories }: { selectedCategoryId: string | null; onOpenMobileCategories?: () => void }) {
  const { products, categories, deleteProduct } = useStore()
  const [search, setSearch] = useState('')
  const [barcodeInput, setBarcodeInput] = useState('')
  const [page, setPage] = useState(1)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editProduct, setEditProduct] = useState<Product | null>(null)
  const [prefillBarcode, setPrefillBarcode] = useState('')
  const [focusQuantity, setFocusQuantity] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [highlightId, setHighlightId] = useState<string | null>(null)
  const [importOpen, setImportOpen] = useState(false)
  const barcodeRef = useRef<HTMLInputElement>(null)

  const getCatName = (id: string) => categories.find(c => c.id === id)?.name ?? '—'

  const filtered = products.filter(p => {
    const inCat = selectedCategoryId
      ? p.category_id === selectedCategoryId || categories.find(c => c.id === p.category_id)?.parent_id === selectedCategoryId
      : true
    const q = search.toLowerCase()
    return inCat && (!q || p.name.toLowerCase().includes(q) || (p.barcode ?? '').includes(q))
  })

  const totalPages  = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const pageProducts = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  // Manual barcode entry via input box
  const handleBarcodeEnter = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return
    const val = barcodeInput.trim(); if (!val) return
    processBarcode(val)
    setBarcodeInput('')
  }

  // Global barcode scanner entry
  useBarcodeScanner({
    onScan: (code) => processBarcode(code),
    disabled: dialogOpen // Don't intercept if dialog is already open
  })

  const processBarcode = (val: string) => {
    const found = products.find(p => p.barcode === val)
    if (found) {
      setEditProduct(found)
      setPrefillBarcode('')
      setFocusQuantity(true)
      setDialogOpen(true)
      toast.success(`პროდუქტი ნაპოვნია: ${found.name}`)
    } else {
      setPrefillBarcode(val)
      setEditProduct(null)
      setFocusQuantity(false)
      setDialogOpen(true)
      toast.info('შტრიხკოდი ვერ მოიძებნა — დაამატეთ ახალი პროდუქტი')
    }
  }

  const openAdd  = () => { setEditProduct(null); setPrefillBarcode(''); setFocusQuantity(false); setDialogOpen(true) }
  const openEdit = (p: Product) => { setEditProduct(p); setPrefillBarcode(''); setFocusQuantity(false); setDialogOpen(true) }

  const handleDownloadTemplate = () => {
    const ws = XLSX.utils.json_to_sheet([{
      'სახელი': '',
      'შტრიხკოდი': '',
      'კატეგორია': '',
      'შესყიდვის ფასი': 0,
      'გაყიდვის ფასი': 0,
      'რაოდენობა': 0,
      'ფოტოს ფაილი': '',
      'ფოტოს ბმული (URL)': ''
    }])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Products")
    XLSX.writeFile(wb, "products_template.xlsx")
  }

  const handleExport = () => {
    const data = filtered.map(p => ({
      'სახელი': p.name,
      'შტრიხკოდი': p.barcode || '',
      'კატეგორია': getCatName(p.category_id),
      'შესყიდვის ფასი': p.purchase_price,
      'გაყიდვის ფასი': p.sale_price,
      'რაოდენობა': p.quantity,
      'ფოტოს ფაილი': '',
      'ფოტოს ბმული (URL)': p.photo_url || ''
    }))
    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Products")
    XLSX.writeFile(wb, "products_export.xlsx")
  }

  return (
    <div className="flex-1 flex flex-col gap-4 min-w-0 animate-fade-up">

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2.5">
          {onOpenMobileCategories && (
            <button
              onClick={onOpenMobileCategories}
              className="md:hidden flex items-center gap-1.5 h-8 px-3 rounded-xl bg-primary/10 text-primary text-xs font-semibold hover:bg-primary/20 transition-colors"
            >
              <Layers className="size-3.5" />
              კატეგ.
            </button>
          )}
          <h2 className="text-base font-bold text-foreground">პროდუქცია</h2>
          <span className="px-2 py-0.5 rounded-lg bg-primary/10 text-primary text-xs font-bold">{filtered.length}</span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <ScanLine className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input ref={barcodeRef} className="pl-9 w-48 h-9 text-sm rounded-xl border-border focus-visible:ring-primary/30" placeholder="შტრიხკოდი..." value={barcodeInput} onChange={e => setBarcodeInput(e.target.value)} onKeyDown={handleBarcodeEnter} />
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input className="pl-9 w-48 h-9 text-sm rounded-xl border-border focus-visible:ring-primary/30" placeholder="ძებნა..." value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} />
          </div>

          <div className="flex bg-muted/40 p-0.5 rounded-xl border border-border mr-1">
             <Button variant="ghost" size="sm" onClick={handleDownloadTemplate} title="შაბლონის გადმოწერა" className="h-8 rounded-lg px-2 text-muted-foreground hover:text-foreground">
               <Download className="size-4" />
             </Button>
             <Button variant="ghost" size="sm" onClick={handleExport} title="ექსპორტი" className="h-8 rounded-lg px-2 text-muted-foreground hover:text-foreground">
               <FileDown className="size-4" />
             </Button>
             <Button variant="ghost" size="sm" onClick={() => setImportOpen(true)} title="იმპორტი (Excel + ფოტოები)" className="h-8 rounded-lg px-2 text-muted-foreground hover:text-foreground">
               <FileUp className="size-4" />
             </Button>
          </div>

          <Button onClick={openAdd} size="sm" className="h-9 rounded-xl bg-gradient-to-r from-primary to-indigo-600 hover:from-primary/90 hover:to-indigo-600/90 shadow-md shadow-primary/25 border-0 text-sm">
            <Plus data-icon="inline-start" />
            დამატება
          </Button>
        </div>
      </div>

      {/* Table card */}
      <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden flex flex-col">
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-gradient-to-r from-muted/60 to-muted/30">
                <th className="text-left px-4 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wide w-8">#</th>
                <th className="text-left px-4 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wide w-16">ფოტო</th>
                <th className="text-left px-4 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wide">სახელი</th>
                <th className="text-left px-4 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wide">კატეგ.</th>
                <th className="text-right px-4 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wide">შეს.</th>
                <th className="text-right px-4 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wide">გაყ.</th>
                <th className="text-center px-4 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wide">მარაგი</th>
                <th className="text-center px-4 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wide w-20"></th>
              </tr>
            </thead>
            <tbody>
              {pageProducts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-20 text-muted-foreground">
                    <div className="flex flex-col items-center gap-3">
                      <div className="size-16 rounded-2xl bg-muted flex items-center justify-center">
                        <Package className="size-7 opacity-30" />
                      </div>
                      <p className="text-sm font-medium">პროდუქტები ვერ მოიძებნა</p>
                    </div>
                  </td>
                </tr>
              ) : pageProducts.map((p, i) => (
                <tr
                  key={p.id}
                  className={cn(
                    'table-row-hover border-b border-border/40 last:border-0 group',
                    highlightId === p.id && 'bg-primary/5'
                  )}
                >
                  <td className="px-4 py-4 text-muted-foreground text-sm font-medium">{(page - 1) * PAGE_SIZE + i + 1}</td>
                  <td className="px-4 py-4">
                    {p.photo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.photo_url} alt={p.name} className="size-14 rounded-xl object-cover border border-border shadow-sm" />
                    ) : (
                      <div className="size-14 rounded-xl bg-gradient-to-br from-accent to-brand-soft flex items-center justify-center border border-border">
                        <span className="text-lg font-black text-primary/40">{p.name.charAt(0)}</span>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-4 max-w-52">
                    <p className="font-semibold text-foreground text-base line-clamp-1">{p.name}</p>
                    {p.barcode && <p className="text-xs text-muted-foreground font-mono mt-1">{p.barcode}</p>}
                  </td>
                  <td className="px-4 py-4">
                    <span className="text-xs text-muted-foreground bg-muted px-2.5 py-1.5 rounded-lg">{getCatName(p.category_id)}</span>
                  </td>
                  <td className="px-4 py-4 text-right text-muted-foreground text-sm">₾{p.purchase_price.toFixed(2)}</td>
                  <td className="px-4 py-4 text-right font-bold text-primary text-base">₾{p.sale_price.toFixed(2)}</td>
                  <td className="px-4 py-4 text-center"><StockBadge qty={p.quantity} /></td>
                  <td className="px-4 py-4">
                    <div className="flex items-center justify-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => openEdit(p)}
                        className="size-8 rounded-lg hover:bg-primary/10 hover:text-primary flex items-center justify-center transition-all text-muted-foreground"
                      >
                        <Edit2 className="size-4" />
                      </button>
                      <button
                        onClick={() => setDeleteId(p.id)}
                        className="size-8 rounded-lg hover:bg-red-50 hover:text-red-500 flex items-center justify-center transition-all text-muted-foreground"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-border bg-muted/20">
            <p className="text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">{filtered.length}</span> პროდუქტი &bull; გვ. {page}/{totalPages}
            </p>
            <div className="flex gap-1.5">
              <Button size="icon" variant="outline" className="size-8 rounded-xl" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
                <ChevronLeft className="size-4" />
              </Button>
              <Button size="icon" variant="outline" className="size-8 rounded-xl" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      <ProductDialog open={dialogOpen} onClose={() => { setDialogOpen(false); setFocusQuantity(false) }} product={editProduct} prefillBarcode={prefillBarcode} autoFocusQuantity={focusQuantity} />

      <ImportDialog open={importOpen} onClose={() => setImportOpen(false)} />

      <AlertDialog open={!!deleteId} onOpenChange={v => !v && setDeleteId(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>პროდუქტის წაშლა</AlertDialogTitle>
            <AlertDialogDescription>ნამდვილად გსურთ ამ პროდუქტის წაშლა? ეს ქმედება შეუქცევადია.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">გაუქმება</AlertDialogCancel>
            <AlertDialogAction className="rounded-xl bg-red-500 hover:bg-red-600 text-white border-0" onClick={() => { if (deleteId) { deleteProduct(deleteId); toast.success('პროდუქტი წაიშალა') }; setDeleteId(null) }}>
              წაშლა
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
