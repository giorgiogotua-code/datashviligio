"use client"

import { useState } from 'react'
import { Plus, ChevronRight, Hash, Layers, Sparkles, Edit2, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { useStore } from '@/lib/store'
import { toast } from 'sonner'

interface Props {
  selectedId: string | null
  onSelect: (id: string | null) => void
}

export function CategoryTree({ selectedId, onSelect }: Props) {
  const { categories, products, addCategory, updateCategory, deleteCategory } = useStore()
  const [open, setOpen]       = useState(false)
  const [expanded, setExpanded] = useState<Set<string>>(new Set(['c1', 'c2']))
  const [form, setForm]       = useState<{ id?: string, name: string; parent_id: string }>({ name: '', parent_id: '' })
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const roots    = categories.filter(c => !c.parent_id)
  const children = (parentId: string) => categories.filter(c => c.parent_id === parentId)
  const countProducts = (catId: string): number => {
    const direct = products.filter(p => p.category_id === catId).length
    const sub    = children(catId).reduce((s, c) => s + countProducts(c.id), 0)
    return direct + sub
  }

  const toggleExpand = (id: string) =>
    setExpanded(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })

  const handleSave = () => {
    if (!form.name.trim()) { toast.error('სახელი სავალდებულოა'); return }
    if (form.id) {
      updateCategory(form.id, { name: form.name.trim(), parent_id: form.parent_id || null })
      toast.success('კატეგორია განახლდა')
    } else {
      addCategory({ name: form.name.trim(), parent_id: form.parent_id || null, icon: null })
      toast.success('კატეგორია დაემატა')
      // If we added a child, make sure parent is expanded
      if (form.parent_id) {
        setExpanded(prev => { const n = new Set(prev); n.add(form.parent_id); return n })
      }
    }
    setForm({ name: '', parent_id: '' }); setOpen(false)
  }

  const handleDelete = () => {
    if (!deleteId) return
    const kids = children(deleteId).length
    const prods = countProducts(deleteId)
    if (kids > 0 || prods > 0) {
      toast.error('კატეგორიის წაშლა შეუძლებელია, რადგან ის შეიცავს პროდუქტებს ან ქვეკატეგორიებს.')
      setDeleteId(null)
      return
    }
    deleteCategory(deleteId)
    toast.success('კატეგორია წაიშალა')
    if (selectedId === deleteId) onSelect(null)
    setDeleteId(null)
  }

  const openAddChild = (parentId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setForm({ name: '', parent_id: parentId })
    setOpen(true)
  }

  const openEdit = (cat: {id: string, name: string, parent_id: string | null}, e: React.MouseEvent) => {
    e.stopPropagation()
    setForm({ id: cat.id, name: cat.name, parent_id: cat.parent_id || '' })
    setOpen(true)
  }

  const reqDelete = (catId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setDeleteId(catId)
  }

  const totalProducts = products.length

  return (
    <aside className="w-[310px] shrink-0 bg-white/60 backdrop-blur-2xl rounded-[32px] border border-white/60 shadow-[0_8px_40px_-12px_rgba(0,0,0,0.06)] flex flex-col overflow-hidden animate-fade-up ring-1 ring-black/5 relative">
      {/* Decorative Blobs for glassmorphism */}
      <div className="absolute top-0 right-0 w-48 h-48 bg-primary/10 rounded-full blur-[40px] -z-10 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-[30px] -z-10 pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between px-6 py-6 border-b border-border/40 relative z-10">
        <div className="flex items-center gap-3.5">
          <div className="size-10 rounded-[14px] bg-gradient-to-br from-primary to-indigo-600 flex items-center justify-center shadow-lg shadow-primary/30 ring-2 ring-white/50 relative overflow-hidden">
             <div className="absolute inset-0 bg-white/20 w-1/2 h-full skew-x-12 translate-x-10 animate-shimmer" />
             <Layers className="size-4.5 text-white drop-shadow-sm relative z-10" />
          </div>
          <span className="text-[17px] font-black tracking-tight text-foreground bg-gradient-to-br from-foreground to-foreground/60 bg-clip-text text-transparent">კატეგორიები</span>
        </div>
        <button
          onClick={() => { setForm({ name: '', parent_id: '' }); setOpen(true); }}
          title="მთავარი კატეგორიის დამატება"
          className="size-9 rounded-2xl bg-white/80 hover:bg-primary text-primary hover:text-white flex items-center justify-center transition-all duration-300 active:scale-90 hover:shadow-xl hover:shadow-primary/25 border border-white/80 shadow-sm"
        >
          <Plus className="size-4" />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto p-4 flex flex-col gap-1.5 relative z-10 scrollbar-none">
        
        {/* All products */}
        <button
          onClick={() => onSelect(null)}
          className={cn(
            'flex items-center gap-3 w-full px-4 py-3.5 rounded-[20px] text-[14px] transition-all duration-300 text-left group relative outline-none mb-3 border',
            selectedId === null
              ? 'bg-gradient-to-r from-primary to-indigo-600 text-white font-black shadow-[0_8px_20px_-6px_var(--color-primary)] translate-x-1 border-transparent'
              : 'border-transparent text-muted-foreground hover:bg-white/90 hover:border-white hover:text-foreground hover:translate-x-1 hover:shadow-sm'
          )}
        >
          {selectedId === null && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-1/2 bg-white rounded-r-full shadow-[0_0_10px_rgba(255,255,255,0.8)]" />}
          
          <div className={cn("size-8 rounded-[12px] flex items-center justify-center transition-all duration-300 shadow-sm", selectedId === null ? "bg-white/20 shadow-none scale-110" : "bg-white border border-border/50 group-hover:border-primary/30 group-hover:text-primary group-hover:scale-110")}>
            <Sparkles className={cn("size-3.5", selectedId === null ? "text-white" : "text-muted-foreground group-hover:text-primary")} />
          </div>
          
          <span className="flex-1 tracking-wide">ყველა პოზიცია</span>
          
          <span className={cn('text-[11px] font-black px-2.5 py-1 rounded-xl transition-colors', selectedId === null ? 'bg-white/20 text-white shadow-inner' : 'bg-white border border-border/60 text-muted-foreground group-hover:border-primary/20 group-hover:text-primary')}>
            {totalProducts}
          </span>
        </button>

        {roots.map(root => {
          const kids       = children(root.id)
          const isExpanded = expanded.has(root.id)
          const isActive   = selectedId === root.id
          const cnt        = countProducts(root.id)
          const hasKids    = kids.length > 0

          return (
             <div key={root.id} className="flex flex-col relative">
                <div className="flex items-center w-full group/row relative">
                   {hasKids && (
                     <button
                       onClick={() => toggleExpand(root.id)}
                       className="size-8 flex items-center justify-center text-muted-foreground/60 hover:text-primary shrink-0 ml-0.5 rounded-xl hover:bg-primary/10 transition-colors z-10"
                     >
                        <ChevronRight className={cn("size-4 transition-transform duration-300", isExpanded && "rotate-90 text-primary")} />
                     </button>
                   )}
                   
                   <button
                     onClick={() => onSelect(root.id)}
                     className={cn(
                       'flex-1 flex items-center gap-3 px-3 py-3 rounded-[20px] text-[13.5px] transition-all duration-300 text-left group overflow-hidden relative border',
                       !hasKids && 'ml-9',
                       isActive
                         ? 'bg-gradient-to-r from-primary to-indigo-600 text-white font-bold shadow-md shadow-primary/20 translate-x-1 border-transparent'
                         : 'border-transparent text-foreground/80 hover:bg-white hover:border-white hover:shadow-sm hover:translate-x-1'
                     )}
                   >
                     {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-1/2 bg-white rounded-r-full" />}
                     
                     <div className={cn("size-7 rounded-[10px] flex items-center justify-center transition-all duration-300 shadow-sm", isActive ? "bg-white/20 shadow-none scale-110" : "bg-muted border border-border/50 group-hover:border-primary/30 group-hover:bg-primary/5 group-hover:scale-110")}>
                        <Layers className={cn("size-3.5", isActive ? "text-white" : "text-muted-foreground group-hover:text-primary")} />
                     </div>
                     
                     <span className="flex-1 truncate tracking-wide">{root.name}</span>
                     
                     <span className={cn('text-[10px] font-black px-2 py-1 rounded-xl transition-colors shrink-0', isActive ? 'bg-white/20 text-white' : 'bg-white border border-border/60 text-muted-foreground group-hover:border-primary/20 group-hover:text-primary shadow-sm', 'group-hover/row:opacity-0')}>
                       {cnt}
                     </span>
                   </button>

                   {/* Action buttons (appear on row hover) */}
                   <div className="absolute right-2 opacity-0 group-hover/row:opacity-100 transition-opacity flex items-center gap-1 z-20">
                      <button onClick={(e) => openAddChild(root.id, e)} className="size-7 rounded-lg bg-white shadow-sm border border-border text-muted-foreground hover:text-primary flex items-center justify-center transition-colors" title="ქვეკატეგორიის დამატება">
                        <Plus className="size-3.5" />
                      </button>
                      <button onClick={(e) => openEdit(root, e)} className="size-7 rounded-lg bg-white shadow-sm border border-border text-muted-foreground hover:text-primary flex items-center justify-center transition-colors" title="რედაქტირება">
                        <Edit2 className="size-3.5" />
                      </button>
                      <button onClick={(e) => reqDelete(root.id, e)} className="size-7 rounded-lg bg-white shadow-sm border border-border text-muted-foreground hover:text-red-500 flex items-center justify-center transition-colors" title="წაშლა">
                        <Trash2 className="size-3.5" />
                      </button>
                   </div>
                </div>

                {isExpanded && hasKids && (
                  <div className="ml-11 flex flex-col gap-1 mt-1 pl-4 border-l-2 border-border/60 pb-3 relative">
                    <div className="absolute left-[-2px] bottom-0 w-0.5 h-8 bg-gradient-to-b from-transparent to-white" />
                    {kids.map((child, idx) => {
                      const childActive = selectedId === child.id
                      return (
                        <div key={child.id} className="relative flex items-center group/subrow">
                           <div className="absolute -left-[18px] top-1/2 -translate-y-1/2 w-3.5 h-[2px] bg-border/60 rounded-r-full" />
                           <div className="flex-1 relative flex items-center">
                             <button
                               onClick={() => onSelect(child.id)}
                               className={cn(
                                 'flex items-center gap-2.5 w-full px-3 py-2.5 rounded-[16px] text-[12.5px] transition-all duration-300 text-left group border relative',
                                 childActive
                                   ? 'bg-primary border-primary text-white font-bold shadow-md shadow-primary/20 translate-x-1'
                                   : 'border-transparent text-muted-foreground hover:bg-white/80 hover:border-white hover:text-foreground hover:shadow-sm hover:translate-x-1'
                               )}
                             >
                               <div className={cn("size-5 rounded-md flex items-center justify-center transition-colors", childActive ? "bg-white/20" : "bg-muted group-hover:bg-primary/10")}>
                                  <Hash className={cn("size-3", childActive ? "text-white" : "text-muted-foreground/60 group-hover:text-primary")} />
                               </div>
                               <span className="flex-1 truncate tracking-wide">{child.name}</span>
                             </button>

                             {/* Action buttons (appear on row hover) */}
                             <div className="absolute right-2 opacity-0 group-hover/subrow:opacity-100 transition-opacity flex items-center gap-1 z-20">
                                <button onClick={(e) => openEdit(child, e)} className="size-6 rounded-md bg-white shadow-sm border border-border text-muted-foreground hover:text-primary flex items-center justify-center transition-colors" title="რედაქტირება">
                                  <Edit2 className="size-3" />
                                </button>
                                <button onClick={(e) => reqDelete(child.id, e)} className="size-6 rounded-md bg-white shadow-sm border border-border text-muted-foreground hover:text-red-500 flex items-center justify-center transition-colors" title="წაშლა">
                                  <Trash2 className="size-3" />
                                </button>
                             </div>
                           </div>
                        </div>
                      )
                    })}
                  </div>
                )}
             </div>
          )
        })}
      </nav>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm rounded-[28px] p-6 border-white/50 shadow-2xl bg-white/90 backdrop-blur-3xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-foreground">{form.id ? 'კატეგორიის რედაქტირება' : 'ახალი კატეგორია'}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-5 py-4">
            <div className="flex flex-col gap-2">
              <label className="text-[11px] font-black text-muted-foreground uppercase tracking-wider pl-1">სახელი <span className="text-red-500">*</span></label>
              <Input className="h-12 rounded-2xl border-border/50 focus-visible:ring-primary/20 bg-white" placeholder="მაგ: სმარტ საათები..." value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-[11px] font-black text-muted-foreground uppercase tracking-wider pl-1">მშობელი კატეგორია</label>
              <Select value={form.parent_id} onValueChange={(v: string | null) => setForm(p => ({ ...p, parent_id: v === 'none' || v === null ? '' : v }))}>
                <SelectTrigger className="h-12 rounded-2xl border-border/50 bg-white focus:ring-primary/20">
                  <SelectValue placeholder="★ მთავარი კატეგორია">
                    {(value: string | null) =>
                      !value || value === 'none'
                        ? '★ მთავარი კატეგორია'
                        : categories.find(c => c.id === value)?.name ?? '★ მთავარი კატეგორია'
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="rounded-2xl border-border/50">
                  <SelectItem value="none" className="rounded-xl mt-1 text-primary font-bold">★ მთავარი კატეგორია</SelectItem>
                  {roots.filter(r => r.id !== form.id).map(r => <SelectItem key={r.id} value={r.id} className="rounded-xl">{r.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0 mt-2">
            <Button variant="ghost" onClick={() => setOpen(false)} className="rounded-xl h-11 px-6 font-bold hover:bg-muted text-muted-foreground">გაუქმება</Button>
            <Button onClick={handleSave} className="rounded-xl h-11 px-8 bg-gradient-to-r from-primary to-indigo-600 border-0 shadow-lg shadow-primary/30 font-black text-white hover:scale-105 transition-transform">{form.id ? 'შენახვა' : 'დამატება'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={!!deleteId} onOpenChange={v => !v && setDeleteId(null)}>
        <AlertDialogContent className="rounded-[28px] p-6 border-white/50 shadow-2xl bg-white/90 backdrop-blur-3xl">
          <AlertDialogHeader>
             <AlertDialogTitle>კატეგორიის წაშლა</AlertDialogTitle>
             <AlertDialogDescription>ნამდვილად გსურთ ამ კატეგორიის წაშლა? წაშლა შესაძლებელია მხოლოდ მაშინ თუ ის ცარიელია პროდუქტებისგან.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
             <AlertDialogCancel className="rounded-xl">გაუქმება</AlertDialogCancel>
             <AlertDialogAction className="rounded-xl bg-red-500 text-white hover:bg-red-600 border-none shadow-md shadow-red-500/20" onClick={handleDelete}>წაშლა</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </aside>
  )
}
