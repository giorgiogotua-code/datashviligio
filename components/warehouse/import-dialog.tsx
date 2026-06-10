"use client"

import { useState, useRef, useCallback } from 'react'
import { FileSpreadsheet, ImageIcon, Loader2, CheckCircle2, X, UploadCloud } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useStore } from '@/lib/store'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import type { Product } from '@/lib/mock-data'
import * as XLSX from 'xlsx'
import JSZip from 'jszip'
import imageCompression from 'browser-image-compression'

interface Props {
  open: boolean
  onClose: () => void
}

type ParsedRow = Record<string, any>

const norm = (s: string) => s.trim().toLowerCase()
const stripExt = (s: string) => norm(s).replace(/\.[^.]+$/, '')

async function uploadToR2(file: File): Promise<string> {
  const compressed = await imageCompression(file, { maxSizeMB: 0.3, maxWidthOrHeight: 800, useWebWorker: true })
  const fd = new FormData()
  fd.append('file', compressed)
  const res = await fetch('/api/upload', { method: 'POST', body: fd })
  if (!res.ok) throw new Error('upload failed')
  const json = await res.json()
  if (!json.url) throw new Error('upload failed')
  return json.url as string
}

export function ImportDialog({ open, onClose }: Props) {
  const { categories, importProducts } = useStore()

  const [rows, setRows] = useState<ParsedRow[]>([])
  const [excelName, setExcelName] = useState('')
  // image map: filename (and name-without-ext), lowercased -> File
  const [images, setImages] = useState<Map<string, File>>(new Map())
  const [imageCount, setImageCount] = useState(0)
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)

  const excelRef = useRef<HTMLInputElement>(null)
  const imgRef = useRef<HTMLInputElement>(null)

  const reset = () => {
    setRows([]); setExcelName(''); setImages(new Map()); setImageCount(0)
    setBusy(false); setProgress(null)
    if (excelRef.current) excelRef.current.value = ''
    if (imgRef.current) imgRef.current.value = ''
  }

  const handleClose = () => { if (!busy) { reset(); onClose() } }

  const handleExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (evt) => {
      try {
        const wb = XLSX.read(evt.target?.result, { type: 'binary' })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const data = XLSX.utils.sheet_to_json<ParsedRow>(ws)
        setRows(data)
        setExcelName(file.name)
        toast.success(`${data.length} მწკრივი წაიკითხა`)
      } catch (err) {
        console.error(err)
        toast.error('Excel ფაილის წაკითხვა ვერ მოხერხდა')
      }
    }
    reader.readAsBinaryString(file)
  }

  const addImagesToMap = useCallback((map: Map<string, File>, name: string, file: File) => {
    map.set(norm(name), file)
    map.set(stripExt(name), file)
  }, [])

  const handleImages = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    if (files.length === 0) return
    const map = new Map(images)
    let count = imageCount

    for (const f of files) {
      if (f.name.toLowerCase().endsWith('.zip')) {
        // Extract images from ZIP
        try {
          const zip = await JSZip.loadAsync(f)
          const entries = Object.values(zip.files).filter(z => !z.dir && /\.(jpe?g|png|webp|gif|bmp)$/i.test(z.name))
          for (const entry of entries) {
            const blob = await entry.async('blob')
            const base = entry.name.split('/').pop() || entry.name
            const imgFile = new File([blob], base, { type: blob.type || 'image/jpeg' })
            addImagesToMap(map, base, imgFile)
            count++
          }
        } catch (err) {
          console.error(err)
          toast.error(`ZIP-ის წაკითხვა ვერ მოხერხდა: ${f.name}`)
        }
      } else if (f.type.startsWith('image/')) {
        addImagesToMap(map, f.name, f)
        count++
      }
    }

    setImages(map)
    setImageCount(count)
    toast.success(`${count} ფოტო არჩეულია`)
  }

  // How many rows can be matched to a photo (filename column → barcode fallback)
  const matchKey = (row: ParsedRow): string => {
    const explicit = String(row['ფოტოს ფაილი'] ?? '').trim()
    if (explicit) return explicit
    return String(row['შტრიხკოდი'] ?? '').trim()
  }
  const findImage = (key: string): File | undefined => {
    if (!key) return undefined
    return images.get(norm(key)) || images.get(stripExt(key))
  }
  const matchedCount = rows.filter(r => {
    if (String(r['ფოტოს ბმული (URL)'] ?? '').trim()) return true // already has URL
    return !!findImage(matchKey(r))
  }).length

  const handleImport = async () => {
    if (rows.length === 0) { toast.error('ჯერ აირჩიეთ Excel ფაილი'); return }
    setBusy(true)

    // Build the upload queue: rows that need a photo uploaded
    const toUpload = rows.filter(r => !String(r['ფოტოს ბმული (URL)'] ?? '').trim() && findImage(matchKey(r)))
    setProgress({ done: 0, total: toUpload.length })

    // Upload photos sequentially, cache url by match key
    const urlByKey = new Map<string, string>()
    let done = 0
    for (const r of toUpload) {
      const key = matchKey(r)
      if (urlByKey.has(norm(key))) { done++; setProgress({ done, total: toUpload.length }); continue }
      const file = findImage(key)
      if (!file) { done++; setProgress({ done, total: toUpload.length }); continue }
      try {
        const url = await uploadToR2(file)
        urlByKey.set(norm(key), url)
      } catch {
        toast.error(`ფოტო ვერ აიტვირთა: ${key}`)
      }
      done++
      setProgress({ done, total: toUpload.length })
    }

    // Build product records
    const newProducts: Omit<Product, 'id' | 'created_at'>[] = []
    let failCount = 0
    for (const row of rows) {
      const name = row['სახელი']
      if (!name) { failCount++; continue }

      const catName = row['კატეგორია']
      let catId = categories[0]?.id || ''
      if (catName) {
        const found = categories.find(c => c.name.toLowerCase() === String(catName).toLowerCase())
        if (found) catId = found.id
      }

      // photo: explicit URL wins, else uploaded url by match key
      const directUrl = String(row['ფოტოს ბმული (URL)'] ?? '').trim()
      const key = matchKey(row)
      const photo_url = directUrl || urlByKey.get(norm(key)) || null

      newProducts.push({
        name,
        barcode: row['შტრიხკოდი'] ? String(row['შტრიხკოდი']) : null,
        category_id: catId,
        purchase_price: parseFloat(row['შესყიდვის ფასი']) || 0,
        sale_price: parseFloat(row['გაყიდვის ფასი']) || 0,
        quantity: parseInt(row['რაოდენობა']) || 0,
        photo_url,
      })
    }

    if (newProducts.length > 0) {
      await importProducts(newProducts)
      const withPhotos = newProducts.filter(p => p.photo_url).length
      toast.success(`${newProducts.length} პროდუქტი დაიმპორტდა (${withPhotos} ფოტოთი)`)
    }
    if (failCount > 0) toast.warning(`${failCount} მწკრივი გამოტოვდა (სახელის გარეშე)`)

    setBusy(false)
    reset()
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && handleClose()}>
      <DialogContent className="max-w-lg rounded-[28px] p-6 border-white/50 shadow-2xl bg-white/95 backdrop-blur-3xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-black text-foreground">პროდუქციის იმპორტი</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            ატვირთე Excel და (სურვილისამებრ) ფოტოები — ფოტოები ავტომატურად დაემთხვევა და აიტვირთება R2-ზე.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          {/* Step 1: Excel */}
          <div className={cn(
            "rounded-2xl border-2 border-dashed p-4 transition-colors",
            rows.length > 0 ? "border-emerald-300 bg-emerald-50/40" : "border-border bg-muted/30"
          )}>
            <div className="flex items-center gap-3">
              <div className={cn("size-10 rounded-xl flex items-center justify-center shrink-0",
                rows.length > 0 ? "bg-emerald-500 text-white" : "bg-primary/10 text-primary")}>
                {rows.length > 0 ? <CheckCircle2 className="size-5" /> : <FileSpreadsheet className="size-5" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-foreground">1. Excel ფაილი <span className="text-red-500">*</span></p>
                <p className="text-[11px] text-muted-foreground truncate">
                  {rows.length > 0 ? `${excelName} — ${rows.length} მწკრივი` : 'აირჩიეთ .xlsx ფაილი'}
                </p>
              </div>
              <Button variant="outline" size="sm" className="rounded-xl shrink-0" disabled={busy} onClick={() => excelRef.current?.click()}>
                არჩევა
              </Button>
              <input ref={excelRef} type="file" accept=".xlsx,.xls" hidden onChange={handleExcel} />
            </div>
          </div>

          {/* Step 2: Images */}
          <div className={cn(
            "rounded-2xl border-2 border-dashed p-4 transition-colors",
            imageCount > 0 ? "border-emerald-300 bg-emerald-50/40" : "border-border bg-muted/30"
          )}>
            <div className="flex items-center gap-3">
              <div className={cn("size-10 rounded-xl flex items-center justify-center shrink-0",
                imageCount > 0 ? "bg-emerald-500 text-white" : "bg-primary/10 text-primary")}>
                {imageCount > 0 ? <CheckCircle2 className="size-5" /> : <ImageIcon className="size-5" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-foreground">2. ფოტოები <span className="text-muted-foreground font-normal">(არასავალდებულო)</span></p>
                <p className="text-[11px] text-muted-foreground truncate">
                  {imageCount > 0 ? `${imageCount} ფოტო — ${matchedCount} დაემთხვა` : 'ფოტოები ან ZIP — დაერქმევა "ფოტოს ფაილი" სვეტით ან barcode-ით'}
                </p>
              </div>
              <Button variant="outline" size="sm" className="rounded-xl shrink-0" disabled={busy || rows.length === 0} onClick={() => imgRef.current?.click()}>
                არჩევა
              </Button>
              <input ref={imgRef} type="file" accept="image/*,.zip" multiple hidden onChange={handleImages} />
            </div>
          </div>

          {/* Match summary */}
          {rows.length > 0 && (
            <div className="flex items-center justify-center gap-6 text-center py-1">
              <div>
                <p className="text-lg font-black text-foreground">{rows.length}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">პროდუქტი</p>
              </div>
              <div className="w-px h-8 bg-border" />
              <div>
                <p className="text-lg font-black text-primary">{matchedCount}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">ფოტოთი</p>
              </div>
              <div className="w-px h-8 bg-border" />
              <div>
                <p className="text-lg font-black text-muted-foreground">{rows.length - matchedCount}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">ფოტოს გარეშე</p>
              </div>
            </div>
          )}

          {/* Progress */}
          {busy && progress && progress.total > 0 && (
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
                <span className="flex items-center gap-1.5"><UploadCloud className="size-3.5" /> ფოტოები იტვირთება...</span>
                <span>{progress.done}/{progress.total}</span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div className="h-full bg-gradient-to-r from-primary to-indigo-600 transition-all duration-300"
                  style={{ width: `${Math.round((progress.done / progress.total) * 100)}%` }} />
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 mt-2">
          <Button variant="ghost" className="rounded-xl h-11 px-5 font-bold text-muted-foreground" disabled={busy} onClick={handleClose}>
            გაუქმება
          </Button>
          <Button
            onClick={handleImport}
            disabled={busy || rows.length === 0}
            className="rounded-xl h-11 px-7 bg-gradient-to-r from-primary to-indigo-600 border-0 shadow-lg shadow-primary/30 font-black text-white"
          >
            {busy ? <><Loader2 className="size-4 animate-spin" /> იმპორტი...</> : <>იმპორტი ({rows.length})</>}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
