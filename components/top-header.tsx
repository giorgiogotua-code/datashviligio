"use client"

import { useState, useEffect, useRef } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Package, ShoppingCart, BarChart2, Bell, Search, Settings, Lock, Menu, LogOut, AlertTriangle, PackageX, CheckCircle2, Truck, BookOpen, HandCoins, Users } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { useStore } from '@/lib/store'
import { createClient } from '@/lib/supabase/client'
import { ShiftControl } from '@/components/shifts/shift-control'
import { toast } from 'sonner'

const MODULE_MAP: Record<string, { label: string; icon: React.ElementType; gradient: string; sub: string }> = {
  '/warehouse': { label: 'საწყობი',      icon: Package,      gradient: 'from-blue-500 to-indigo-600',   sub: 'პროდუქციის მართვა' },
  '/pos':       { label: 'POS სალარო',   icon: ShoppingCart, gradient: 'from-violet-500 to-purple-600', sub: 'სალაროს ოპერაციები' },
  '/suppliers': { label: 'მომწოდებლები', icon: Truck,        gradient: 'from-cyan-500 to-blue-600',     sub: 'შესყიდვები და ვალები' },
  '/credit':    { label: 'ნისია',        icon: HandCoins,    gradient: 'from-amber-500 to-orange-600',   sub: 'კლიენტების ვალები' },
  '/accounting':{ label: 'ბუღალტერია',   icon: BarChart2,    gradient: 'from-emerald-500 to-teal-600',  sub: 'ანგარიშები & ანალიტიკა' },
  '/guide':     { label: 'სახელმძღვანელო', icon: BookOpen,   gradient: 'from-pink-500 to-rose-600',     sub: 'როგორ ვიმუშაო სისტემაში' },
  '/staff':     { label: 'თანამშრომლები', icon: Users,       gradient: 'from-fuchsia-500 to-pink-600',   sub: 'კასირები და ცვლები' },
  '/settings':  { label: 'პარამეტრები',  icon: Settings,     gradient: 'from-slate-500 to-slate-700',   sub: 'სისტემის კონფიგურაცია' },
}

const MONTHS = ['იანვარი','თებერვალი','მარტი','აპრილი','მაისი','ივნისი','ივლისი','აგვისტო','სექტემბერი','ოქტომბერი','ნოემბერი','დეკემბერი']
const DAYS   = ['კვირა','ორშაბათი','სამშაბათი','ოთხშაბათი','ხუთშაბათი','პარასკევი','შაბათი']

export function TopHeader() {
  const pathname = usePathname()
  const key = Object.keys(MODULE_MAP).find(k => pathname.startsWith(k)) ?? '/warehouse'
  const { label, icon: Icon, gradient, sub } = MODULE_MAP[key]
  const { lock, setMobileSidebarOpen, products } = useStore()
  const router = useRouter()

  const [dateLabel, setDateLabel] = useState<string | null>(null)
  const [notifOpen, setNotifOpen] = useState(false)
  const notifRef = useRef<HTMLDivElement>(null)

  // Real notifications: out-of-stock first, then low-stock (<= 5)
  const lowStock = products
    .filter(p => p.quantity <= 5)
    .sort((a, b) => a.quantity - b.quantity)
  const notifCount = lowStock.length

  // Close dropdown on outside click
  useEffect(() => {
    if (!notifOpen) return
    const onClick = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [notifOpen])

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    toast.success('სისტემიდან გამოხვედით')
    router.push('/login')
    router.refresh()
  }

  useEffect(() => {
    const now = new Date()
    setDateLabel(`${DAYS[now.getDay()]}, ${now.getDate()} ${MONTHS[now.getMonth()]} ${now.getFullYear()}`)
  }, [])

  return (
    <motion.header
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 28, delay: 0.05 }}
      className="h-16 floating-panel rounded-3xl shrink-0 z-20 flex items-center justify-between px-4 md:px-6 gap-3 md:gap-4"
    >

      {/* Left: hamburger (mobile) + module title */}
      <div className="flex items-center gap-3">
        {/* Hamburger — mobile only */}
        <motion.button
          whileTap={{ scale: 0.92 }}
          onClick={() => setMobileSidebarOpen(true)}
          className="md:hidden size-9 rounded-xl border border-border bg-white hover:bg-accent transition-all duration-150 flex items-center justify-center shrink-0"
          aria-label="მენიუს გახსნა"
        >
          <Menu className="size-4 text-foreground" />
        </motion.button>
        <motion.div
          key={key}
          layoutId="headerModuleIcon"
          className={cn('size-9 rounded-xl bg-gradient-to-br flex items-center justify-center shadow-md', gradient)}
        >
          <Icon className="size-4.5 text-white" />
        </motion.div>
        <div>
          <h1 className="text-sm font-bold text-foreground leading-tight">{label}</h1>
          <p className="text-[11px] text-muted-foreground leading-none mt-0.5">{sub}</p>
        </div>
      </div>

      {/* Center: search bar */}
      <div className="hidden md:flex flex-1 max-w-xs">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="სწრაფი ძებნა..."
            className="w-full h-9 pl-9 pr-4 text-sm bg-muted border border-transparent rounded-xl outline-none focus:border-primary/40 focus:bg-white focus:shadow-sm focus:shadow-primary/10 transition-all placeholder:text-muted-foreground/60"
          />
          <kbd className="absolute right-3 top-1/2 -translate-y-1/2 hidden lg:flex items-center gap-0.5 h-5 px-1.5 rounded-md bg-border text-[10px] text-muted-foreground font-mono">
            ⌘K
          </kbd>
        </div>
      </div>

      {/* Right: shift + date + bell + avatar */}
      <div className="flex items-center gap-3">
        <ShiftControl />

        {dateLabel && (
          <span className="hidden lg:block text-xs text-muted-foreground bg-muted px-3 py-1.5 rounded-lg border border-border">
            {dateLabel}
          </span>
        )}

        {/* Lock */}
        <button
          onClick={lock}
          title="სისტემის ჩაკეტვა"
          className="size-9 rounded-xl border border-border bg-white hover:bg-red-50 hover:border-red-200 transition-all duration-150 flex items-center justify-center group"
        >
          <Lock className="size-4 text-muted-foreground group-hover:text-red-500 transition-colors" />
        </button>

        {/* Bell + notifications dropdown */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setNotifOpen(o => !o)}
            title="შეტყობინებები"
            className={cn(
              "relative size-9 rounded-xl border transition-all duration-150 flex items-center justify-center group",
              notifOpen ? "bg-accent border-accent" : "border-border bg-white hover:bg-accent hover:border-accent"
            )}
          >
            <Bell className="size-4 text-muted-foreground group-hover:text-foreground transition-colors" />
            {notifCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
                {notifCount}
              </span>
            )}
          </button>

          <AnimatePresence>
          {notifOpen && (
            <motion.div
              key="notif-panel"
              initial={{ opacity: 0, y: -8, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 350, damping: 28 }}
              className="absolute right-0 top-12 z-50 w-80 max-h-[70vh] bg-white/90 backdrop-blur-xl rounded-2xl border border-border shadow-xl shadow-black/10 overflow-hidden flex flex-col"
            >
              {/* Header */}
              <div className="flex items-center gap-2.5 px-4 py-3.5 border-b border-border bg-gradient-to-r from-amber-500/5 to-orange-500/5">
                <div className="size-8 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-sm">
                  <AlertTriangle className="size-4 text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-foreground leading-tight">მარაგის შეტყობინებები</p>
                  <p className="text-[11px] text-muted-foreground leading-none mt-0.5">დაბალი მარაგის პროდუქცია</p>
                </div>
                {notifCount > 0 && (
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-lg bg-red-50 text-red-600 border border-red-100">{notifCount}</span>
                )}
              </div>

              {/* List */}
              <div className="overflow-y-auto flex-1">
                {lowStock.length === 0 ? (
                  <div className="flex flex-col items-center gap-2.5 py-10 text-muted-foreground">
                    <CheckCircle2 className="size-8 text-emerald-400" />
                    <p className="text-sm font-medium">ყველა მარაგი საკმარისია</p>
                  </div>
                ) : (
                  lowStock.map(p => {
                    const out = p.quantity === 0
                    return (
                      <button
                        key={p.id}
                        onClick={() => { setNotifOpen(false); router.push('/warehouse') }}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/60 transition-colors text-left border-b border-border/40 last:border-0"
                      >
                        <div className={cn(
                          "size-9 rounded-xl flex items-center justify-center shrink-0",
                          out ? "bg-red-50 text-red-500" : "bg-amber-50 text-amber-600"
                        )}>
                          {out ? <PackageX className="size-4" /> : <Package className="size-4" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-foreground truncate">{p.name}</p>
                          <p className={cn("text-[11px] font-medium", out ? "text-red-500" : "text-amber-600")}>
                            {out ? 'მარაგი ამოიწურა' : `დარჩა ${p.quantity} ცალი`}
                          </p>
                        </div>
                      </button>
                    )
                  })
                )}
              </div>

              {/* Footer */}
              {lowStock.length > 0 && (
                <button
                  onClick={() => { setNotifOpen(false); router.push('/warehouse') }}
                  className="px-4 py-3 border-t border-border text-center text-xs font-bold text-primary hover:bg-primary/5 transition-colors"
                >
                  საწყობში გადასვლა →
                </button>
              )}
            </motion.div>
          )}
          </AnimatePresence>
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          title="სისტემიდან გასვლა"
          className="size-9 rounded-xl border border-border bg-white hover:bg-red-50 hover:border-red-200 transition-all duration-150 flex items-center justify-center group"
        >
          <LogOut className="size-4 text-muted-foreground group-hover:text-red-500 transition-colors" />
        </button>

        {/* Avatar */}
        <div className="flex items-center gap-2.5 cursor-pointer group">
          <div className="size-9 rounded-xl bg-gradient-to-br from-primary to-indigo-700 flex items-center justify-center shadow-md shadow-primary/25 group-hover:shadow-primary/40 transition-shadow">
            <span className="text-[11px] font-black text-white">AD</span>
          </div>
        </div>
      </div>
    </motion.header>
  )
}
