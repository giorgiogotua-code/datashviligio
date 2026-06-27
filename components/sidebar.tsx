"use client"

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Package, ShoppingCart, BarChart2, Smartphone, Zap, Settings, Lock, X, Wrench, Menu, Truck, BookOpen, HandCoins, Users } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { useStore } from '@/lib/store'
import { useEffect } from 'react'

const NAV_ITEMS = [
  { href: '/warehouse', icon: Package,      label: 'საწყობი',      color: 'from-blue-500 to-indigo-600' },
  { href: '/pos',       icon: ShoppingCart, label: 'POS სალარო',   color: 'from-violet-500 to-purple-600' },
  { href: '/suppliers', icon: Truck,        label: 'მომწოდებლები', color: 'from-cyan-500 to-blue-600' },
  { href: '/credit',    icon: HandCoins,    label: 'ნისია',        color: 'from-amber-500 to-orange-600' },
  { href: '/accounting',icon: BarChart2,    label: 'ბუღალტერია',   color: 'from-emerald-500 to-teal-600' },
  { href: '/staff',     icon: Users,        label: 'თანამშრომლები', color: 'from-fuchsia-500 to-pink-600' },
  { href: '/tools',     icon: Wrench,       label: 'ხელსაწყოები',  color: 'from-orange-500 to-amber-600' },
  { href: '/guide',     icon: BookOpen,     label: 'სახელმძღვანელო', color: 'from-pink-500 to-rose-600' },
  { href: '/settings',  icon: Settings,     label: 'პარამეტრები',  color: 'from-slate-500 to-slate-700' },
]

function SidebarContent({ onClose, collapsed = false }: { onClose?: () => void, collapsed?: boolean }) {
  const pathname = usePathname()
  const { lock, settings, setDesktopSidebarCollapsed } = useStore()

  return (
    <aside className={cn(
      "h-full flex flex-col bg-transparent overflow-hidden transition-all duration-300",
      collapsed ? "w-20" : "w-64"
    )}>

      {/* Logo area */}
      <div className={cn("pt-6 pb-5 flex items-center", collapsed ? "px-5 justify-center flex-col gap-4 h-auto" : "px-5 h-20")}>
        <div className={cn("flex items-center w-full", collapsed ? "justify-center" : "gap-3")}>
          <div className="size-10 rounded-2xl bg-gradient-to-br from-primary to-indigo-700 flex items-center justify-center shadow-lg shadow-primary/30 shrink-0">
            <Smartphone className="size-5 text-white" />
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-bold text-foreground tracking-tight leading-none truncate">
                {settings.companyName || 'AccessoryShop'}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">სამართავი პანელი</p>
            </div>
          )}
          
          {/* Close button — mobile only */}
          {onClose && !collapsed && (
            <button
              onClick={onClose}
              className="md:hidden size-8 rounded-xl border border-border flex items-center justify-center text-muted-foreground hover:bg-accent transition-colors shrink-0 ml-auto"
              aria-label="მენიუს დახურვა"
            >
              <X className="size-4" />
            </button>
          )}

          {/* Desktop collapse toggle */}
          {!onClose && !collapsed && (
             <button
                onClick={() => setDesktopSidebarCollapsed(true)}
                className="hidden md:flex size-8 rounded-xl bg-muted/50 hover:bg-muted text-muted-foreground items-center justify-center transition-colors ml-auto shrink-0"
                aria-label="მენიუს შეკვეცა"
             >
                <Menu className="size-4" />
             </button>
          )}
        </div>

        {/* Desktop collapse toggle (Collapsed Mode) */}
        {!onClose && collapsed && (
           <button
              onClick={() => setDesktopSidebarCollapsed(false)}
              className="hidden md:flex size-8 rounded-xl bg-muted/50 hover:bg-muted text-muted-foreground items-center justify-center transition-colors shrink-0"
              aria-label="მენიუს გაშლა"
           >
              <Menu className="size-4" />
           </button>
        )}
      </div>

      {/* Live badge */}
      {!collapsed && (
        <div className="px-5 mt-2">
          <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2">
            <span className="size-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            <span className="text-[11px] font-semibold text-emerald-700">სისტემა აქტიურია</span>
            <Zap className="size-3 text-emerald-500 ml-auto" />
          </div>
        </div>
      )}

      {/* Divider */}
      <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent mx-5 my-3" />

      {/* Nav */}
      <nav className={cn("flex-1 px-3 py-2 flex flex-col gap-1", collapsed && "items-center overflow-hidden")}>
        {!collapsed && <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.12em] px-3 mb-2">მოდულები</p>}

        {NAV_ITEMS.map(({ href, icon: Icon, label, color }) => {
          const active = pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              onClick={onClose}
              title={collapsed ? label : undefined}
              className={cn(
                'group relative flex items-center gap-3 py-3 rounded-2xl font-semibold transition-all duration-200',
                collapsed ? 'px-0 justify-center w-12 h-12' : 'px-3 text-sm',
                active
                  ? 'text-white shadow-lg'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent'
              )}
            >
              {active && (
                <motion.span
                  layoutId="sidebarActive"
                  className={cn('absolute inset-0 rounded-2xl bg-gradient-to-r opacity-100 -z-10', color)}
                  transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                />
              )}
              <span className={cn(
                'relative z-10 size-8 rounded-xl flex items-center justify-center shrink-0 transition-all duration-200',
                active ? 'bg-white/20' : 'bg-muted group-hover:bg-white group-hover:shadow-sm'
              )}>
                <Icon className={cn('relative z-10 size-4', active ? 'text-white' : 'text-muted-foreground group-hover:text-primary')} />
              </span>
              {!collapsed && <span className="relative z-10">{label}</span>}
              {active && !collapsed && (
                <motion.span 
                  initial={{ scale: 0 }} 
                  animate={{ scale: 1 }} 
                  className="relative z-10 ml-auto size-1.5 rounded-full bg-white/90 shadow-[0_0_8px_rgba(255,255,255,0.8)]" 
                />
              )}
            </Link>
          )
        })}
      </nav>

      {/* Divider */}
      <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent mx-5" />

      {/* Footer */}
      <div className={cn("py-4 flex items-center gap-3", collapsed ? "px-2 justify-center flex-col" : "px-5")}>
        <div className="size-8 rounded-xl bg-gradient-to-br from-primary to-indigo-700 flex items-center justify-center shadow-md shadow-primary/25 shrink-0">
          <span className="text-[10px] font-black text-white">AD</span>
        </div>
        {!collapsed && (
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-semibold text-foreground">ადმინი</p>
            <p className="text-[10px] text-muted-foreground truncate">v1.0 · 2026</p>
          </div>
        )}
        <button
          onClick={lock}
          title="სისტემის ჩაკეტვა"
          className={cn("size-8 rounded-xl border border-border hover:bg-red-50 hover:border-red-200 hover:text-red-500 text-muted-foreground flex items-center justify-center transition-all duration-150 shrink-0", collapsed && "w-10 h-10 size-10 mt-1")}
        >
          <Lock className="size-3.5" />
        </button>
      </div>
    </aside>
  )
}

export function Sidebar() {
  const { isMobileSidebarOpen, setMobileSidebarOpen, isDesktopSidebarCollapsed } = useStore()
  const pathname = usePathname()

  // Close on route change
  useEffect(() => {
    setMobileSidebarOpen(false)
  }, [pathname, setMobileSidebarOpen])

  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (isMobileSidebarOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [isMobileSidebarOpen])

  return (
    <>
      {/* Desktop — always visible, fluid width via motion */}
      <motion.div
        animate={{ width: isDesktopSidebarCollapsed ? 80 : 256 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="hidden md:flex shrink-0 floating-panel rounded-3xl h-full overflow-hidden"
      >
        <SidebarContent collapsed={isDesktopSidebarCollapsed} />
      </motion.div>

      {/* Mobile backdrop */}
      <AnimatePresence>
        {isMobileSidebarOpen && (
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm md:hidden"
            onClick={() => setMobileSidebarOpen(false)}
            aria-hidden="true"
          />
        )}
      </AnimatePresence>

      {/* Mobile drawer */}
      <AnimatePresence>
        {isMobileSidebarOpen && (
          <motion.div
            key="drawer"
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', stiffness: 350, damping: 35 }}
            className="fixed inset-y-0 left-0 z-50 w-72 floating-panel border-r border-border/50 shadow-2xl md:hidden"
            role="dialog"
            aria-modal="true"
            aria-label="ნავიგაციის მენიუ"
          >
            <SidebarContent onClose={() => setMobileSidebarOpen(false)} />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
