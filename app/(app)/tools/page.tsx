"use client"

import { useState, useRef } from 'react'
import { UploadCloud, Image as ImageIcon, Trash2, DownloadCloud, FileArchive, Loader2, CheckCircle2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import imageCompression from 'browser-image-compression'
import JSZip from 'jszip'
import { saveAs } from 'file-saver'

type PhotoItem = {
  id: string
  file: File
  originalUrl: string
  compressedFile?: File
  compressedUrl?: string
  status: 'pending' | 'compressing' | 'done' | 'error'
}

export default function OptimizerPage() {
  const [items, setItems] = useState<PhotoItem[]>([])
  const [isCompressingAll, setIsCompressingAll] = useState(false)
  const [isZipping, setIsZipping] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFiles = (files: FileList | File[]) => {
    const newItems: PhotoItem[] = Array.from(files)
      .filter(f => f.type.startsWith('image/'))
      .map(f => ({
        id: Math.random().toString(36).substring(7),
        file: f,
        originalUrl: URL.createObjectURL(f),
        status: 'pending'
      }))

    if (newItems.length === 0) {
      toast.error('მხოლოდ ფოტოების ატვირთვაა შესაძლებელი')
      return
    }

    setItems(prev => [...prev, ...newItems])
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    handleFiles(e.dataTransfer.files)
  }

  const removeFile = (id: string) => {
    setItems(prev => prev.filter(i => i.id !== id))
  }

  const compressSingle = async (item: PhotoItem): Promise<PhotoItem> => {
    if (item.status === 'done') return item

    try {
      const options = {
        maxSizeMB: 0.3,
        maxWidthOrHeight: 1200,
        useWebWorker: true,
      }
      
      const compressedFile = await imageCompression(item.file, options)
      
      // Preserve original file extension or fallback to webp/jpg depending on lib behavior
      // Note: browser-image-compression usually keeps original name but might change type.
      return {
        ...item,
        compressedFile,
        compressedUrl: URL.createObjectURL(compressedFile),
        status: 'done'
      }
    } catch (error) {
      console.error(error)
      return { ...item, status: 'error' }
    }
  }

  const handleCompressAll = async () => {
    const pendingItems = items.filter(i => i.status === 'pending' || i.status === 'error')
    if (pendingItems.length === 0) return

    setIsCompressingAll(true)
    const toastId = toast.loading('ფოტოების ოპტიმიზაცია მიმდინარეობს...')

    const updatedItems = [...items]

    for (let i = 0; i < updatedItems.length; i++) {
       if (updatedItems[i].status !== 'done') {
         updatedItems[i] = { ...updatedItems[i], status: 'compressing' }
         setItems([...updatedItems]) // trigger re-render

         const result = await compressSingle(updatedItems[i])
         updatedItems[i] = result
         setItems([...updatedItems])
       }
    }

    setIsCompressingAll(false)
    toast.success('ოპტიმიზაცია დასრულდა!', { id: toastId })
  }

  const handleDownloadZip = async () => {
    const doneItems = items.filter(i => i.status === 'done' && i.compressedFile)
    if (doneItems.length === 0) {
      toast.error('ჯერ უნდა დააოპტიმიზო ფოტოები')
      return
    }

    setIsZipping(true)
    const toastId = toast.loading('მზადდება ZIP ფაილი...')

    try {
      const zip = new JSZip()
      const folder = zip.folder("optimized_photos")
      
      doneItems.forEach((item, index) => {
        // Fallback to generating a name if original doesn't have it
        const originalName = item.file.name || `photo_${index + 1}.jpg`
        folder?.file(originalName, item.compressedFile!)
      })

      const content = await zip.generateAsync({ type: 'blob' })
      saveAs(content, 'optimized_photos.zip')
      
      toast.success('ZIP ფაილი ჩამოიტვირთა!', { id: toastId })
    } catch (error) {
       console.error(error)
       toast.error('შეცდომა ZIP გენერაციის დროს', { id: toastId })
    } finally {
      setIsZipping(false)
    }
  }

  const formatSize = (bytes: number) => (bytes / 1024).toFixed(0) + ' KB'

  const totalSaved = items.reduce((acc, item) => {
    if (item.status === 'done' && item.compressedFile) {
      return acc + (item.file.size - item.compressedFile.size)
    }
    return acc
  }, 0)

  return (
    <div className="flex flex-col h-[100vh] bg-background/50 overflow-hidden">
      {/* Header */}
      <header className="h-[73px] bg-white/70 backdrop-blur-2xl border-b border-white/50 flex items-center justify-between px-6 shrink-0 shadow-sm z-10 relative">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-[14px] bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center shadow-lg shadow-orange-500/30">
            <FileArchive className="size-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black text-foreground tracking-tight leading-none bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
              ფოტოების ოპტიმიზატორი
            </h1>
            <p className="text-xs text-muted-foreground mt-1 font-medium">დააპატარავე ფოტოები ატვირთვამდე სივრცის დასაზოგად</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {items.length > 0 && (
            <Button
              variant="outline"
              className="rounded-2xl h-11 border-border/60 bg-white hover:bg-muted font-bold text-[13px] px-5 text-red-500 hover:text-red-600 border border-white/80 transition-all shadow-sm"
              onClick={() => setItems([])}
              disabled={isCompressingAll || isZipping}
            >
              <Trash2 className="size-4 mr-1.5" />
              გასუფთავება
            </Button>
          )}

          {items.some(i => i.status === 'pending') && (
            <Button
              onClick={handleCompressAll}
              disabled={isCompressingAll}
              className="rounded-2xl h-11 bg-primary text-white font-bold text-[13px] px-6 shadow-lg shadow-primary/30 transition-all active:scale-95"
            >
              {isCompressingAll ? (
                <><Loader2 className="size-4 mr-2 animate-spin" /> ოპტიმიზაცია...</>
              ) : (
                'მთლიანი ოპტიმიზაცია'
              )}
            </Button>
          )}

          {items.filter(i => i.status === 'done').length > 0 && (
            <Button
              onClick={handleDownloadZip}
              disabled={isZipping || isCompressingAll}
              className="rounded-2xl h-11 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold text-[13px] px-6 shadow-lg shadow-green-500/30 transition-all hover:scale-105 active:scale-95 border-0"
            >
              {isZipping ? (
                <><Loader2 className="size-4 mr-2 animate-spin" /> იქმნება ZIP...</>
              ) : (
                <><DownloadCloud className="size-4 mr-2" /> ჩამოტვირთე ZIP</>
              )}
            </Button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-6 flex flex-col items-center">
        <div className="w-full max-w-5xl space-y-6">

          {/* Stats Bar */}
          {totalSaved > 0 && (
             <div className="w-full bg-green-500/10 border border-green-500/20 rounded-[24px] p-4 flex items-center justify-center gap-3 animate-fade-in">
                <CheckCircle2 className="size-5 text-green-600" />
                <span className="text-sm font-bold text-green-700">გილოცავთ! თქვენ დაზოგეთ <span className="text-lg">{(totalSaved / 1024 / 1024).toFixed(2)} MB</span> სივრცე.</span>
             </div>
          )}

          {/* Dropzone */}
          <div
             onDragOver={e => e.preventDefault()}
             onDrop={handleDrop}
             onClick={() => fileInputRef.current?.click()}
             className={cn(
               "w-full h-48 rounded-[32px] border-2 border-dashed border-primary/30 bg-primary/5 flex flex-col items-center justify-center cursor-pointer transition-all duration-300 hover:bg-primary/10 hover:border-primary/50 group relative overflow-hidden",
               items.length > 0 && "h-32 rounded-[24px]"
             )}
          >
             <input
                type="file"
                multiple
                accept="image/*"
                className="hidden"
                ref={fileInputRef}
                onChange={e => handleFiles(e.target.files || [])}
             />
             <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent pointer-events-none" />
             
             <div className="size-14 rounded-2xl bg-white shadow-sm flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
               <UploadCloud className="size-6 text-primary" />
             </div>
             <p className="font-bold text-[15px] text-foreground">ჩააგდე ფოტოები აქ ან აირჩიე</p>
             <p className="text-[12px] text-muted-foreground mt-1 tracking-wide">დიდი რაოდენობით ატვირთვა დაშვებულია</p>
          </div>

          {/* Image Grid */}
          {items.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {items.map(item => {
                const ratio = item.status === 'done' && item.compressedFile
                  ? Math.round(100 - (item.compressedFile.size / item.file.size) * 100)
                  : 0

                return (
                  <div key={item.id} className="bg-white rounded-[24px] overflow-hidden border border-border/50 shadow-sm relative group animate-fade-up">
                      <div className="aspect-square bg-muted relative">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={item.compressedUrl || item.originalUrl}
                          alt="preview"
                          className="w-full h-full object-cover"
                        />
                        {item.status === 'compressing' && (
                          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex flex-col items-center justify-center">
                             <Loader2 className="size-8 text-white animate-spin mb-2" />
                             <span className="text-white text-xs font-bold">მუშავდება...</span>
                          </div>
                        )}
                        {item.status === 'done' && (
                          <div className="absolute top-2 left-2 bg-green-500 text-white text-[10px] font-black px-2 py-1 rounded-lg shadow-sm">
                            -{ratio}%
                          </div>
                        )}
                        
                        <button
                          onClick={(e) => { e.stopPropagation(); removeFile(item.id) }}
                          className="absolute top-2 right-2 size-7 rounded-xl bg-black/50 hover:bg-red-500 backdrop-blur-md flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-all scale-90 group-hover:scale-100"
                        >
                          <X className="size-3.5" />
                        </button>
                      </div>

                      <div className="p-3">
                         <div className="flex items-center gap-2 mb-2">
                           <ImageIcon className="size-3.5 text-muted-foreground" />
                           <span className="text-[11px] font-bold text-foreground truncate flex-1" title={item.file.name}>{item.file.name}</span>
                         </div>
                         
                         <div className="flex items-center justify-between">
                            <span className={cn("text-[11px] font-medium", item.status === 'done' ? 'text-muted-foreground line-through opacity-70' : 'text-foreground')}>
                              {formatSize(item.file.size)}
                            </span>
                            {item.status === 'done' && item.compressedFile && (
                              <span className="text-[12px] font-black text-green-600 bg-green-50 px-1.5 py-0.5 rounded-md">
                                {formatSize(item.compressedFile.size)}
                              </span>
                            )}
                            {item.status === 'error' && (
                              <span className="text-[11px] font-bold text-red-500">Error</span>
                            )}
                         </div>

                         {item.status === 'done' && (
                             <Button
                               variant="outline"
                               size="sm"
                               onClick={() => saveAs(item.compressedFile!, item.file.name)}
                               className="w-full mt-3 h-8 text-[11px] rounded-xl border-border bg-white shadow-sm hover:text-primary transition-colors"
                             >
                                <DownloadCloud className="size-3 mr-1.5" />
                                ჩამოტვირთვა
                             </Button>
                         )}
                      </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
