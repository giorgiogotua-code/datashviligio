"use client"

import { useState, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Package, ShoppingCart, BarChart2, Bell, Search, Settings, Lock, Menu, LogOut } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useStore } from '@/lib/store'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

const MODULE_MAP: Record<string, { label: string; icon: React.ElementType; gradient: string; sub: string }> = {
  '/warehouse': { label: 'საწყობი',      icon: Package,      gradient: 'from-blue-500 to-indigo-600',   sub: 'პროდუქციის მართვა' },
  '/pos':       { label: 'POS სალარო',   icon: ShoppingCart, gradient: 'from-violet-500 to-purple-600', sub: 'სალაროს ოპერაციები' },
  '/accounting':{ label: 'ბუღალტერია',   icon: BarChart2,    gradient: 'from-emerald-500 to-teal-600',  sub: 'ანგარიშები & ანალიტიკა' },
  '/settings':  { label: 'პარამეტრები',  icon: Settings,     gradient: 'from-slate-500 to-slate-700',   sub: 'სისტემის კონფიგურაცია' },
}

const MONTHS = ['იანვარი','თებერვალი','მარტი','აპრილი','მაისი','ივნისი','ივლისი','აგვისტო','სექტემბერი','ოქტომბერი','ნოემბერი','დეკემბერი']
const DAYS   = ['კვირა','ორშაბათი','სამშაბათი','ოთხშაბათი','ხუთშაბათი','პარასკევი','შაბათი']

export function TopHeader() {
  const pathname = usePathname()
  const key = Object.keys(MODULE_MAP).find(k => pathname.startsWith(k)) ?? '/warehouse'
  const { label, icon: Icon, gradient, sub } = MODULE_MAP[key]
  const { lock, setMobileSidebarOpen } = useStore()
  const router = useRouter()

  const [dateLabel, setDateLabel] = useState<string | null>(null)
  const [notifCount] = useState(3)

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
    <header className="h-16 border-b border-border bg-white/90 backdrop-blur-md sticky top-0 z-20 flex items-center justify-between px-4 md:px-6 gap-3 md:gap-4">

      {/* Left: hamburger (mobile) + module title */}
      <div className="flex items-center gap-3">
        {/* Hamburger — mobile only */}
        <button
          onClick={() => setMobileSidebarOpen(true)}
          className="md:hidden size-9 rounded-xl border border-border bg-white hover:bg-accent transition-all duration-150 flex items-center justify-center shrink-0"
          aria-label="მენიუს გახსნა"
        >
          <Menu className="size-4 text-foreground" />
        </button>
        <div className={cn('size-9 rounded-xl bg-gradient-to-br flex items-center justify-center shadow-md', gradient)}>
          <Icon className="size-4.5 text-white" />
        </div>
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

      {/* Right: date + bell + avatar */}
      <div className="flex items-center gap-3">
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

        {/* Bell */}
        <button className="relative size-9 rounded-xl border border-border bg-white hover:bg-accent hover:border-accent transition-all duration-150 flex items-center justify-center group">
          <Bell className="size-4 text-muted-foreground group-hover:text-foreground transition-colors" />
          {notifCount > 0 && (
            <span className="absolute -top-1 -right-1 size-4 rounded-full bg-primary text-white text-[9px] font-bold flex items-center justify-center">
              {notifCount}
            </span>
          )}
        </button>

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
    </header>
  )
}
