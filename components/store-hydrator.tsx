"use client"

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, ShieldAlert } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useStore } from '@/lib/store'

export function StoreHydrator({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const isHydrated = useStore((s) => s.isHydrated)
  const currentOrg = useStore((s) => s.currentOrg)
  const isPlatformAdmin = useStore((s) => s.isPlatformAdmin)

  useEffect(() => {
    if (!useStore.getState().isHydrated) {
      useStore.getState().hydrate()
    }
  }, [])

  // A platform admin with no shop of their own belongs in the god console,
  // not on an empty POS. Send them straight there.
  useEffect(() => {
    if (isHydrated && !currentOrg && isPlatformAdmin) {
      router.replace('/platform')
    }
  }, [isHydrated, currentOrg, isPlatformAdmin, router])

  if (!isHydrated) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center gap-4 bg-background">
        <div className="size-12 rounded-2xl bg-gradient-to-br from-primary to-indigo-600 flex items-center justify-center shadow-lg shadow-primary/25">
          <Loader2 className="size-6 text-white animate-spin" />
        </div>
        <p className="text-sm font-semibold text-muted-foreground">მონაცემები იტვირთება...</p>
      </div>
    )
  }

  // A tenant is frozen (read-only, RLS blocks writes) when manually
  // suspended OR when a trial has been expired past its 3-day grace.
  // Platform admins are exempt so they can still operate.
  const DAY = 86_400_000
  const trialLocked =
    currentOrg?.plan === 'trial' && currentOrg.trial_ends_at
      ? Date.now() > new Date(currentOrg.trial_ends_at).getTime() + 3 * DAY
      : false
  const locked = currentOrg?.status === 'suspended' || trialLocked

  if (locked && !isPlatformAdmin) {
    const signOut = async () => {
      await createClient().auth.signOut()
      window.location.href = '/login'
    }
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center gap-5 bg-background p-6 text-center">
        <div className="size-16 rounded-3xl bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center shadow-xl shadow-red-500/25">
          <ShieldAlert className="size-8 text-white" />
        </div>
        <div className="max-w-md flex flex-col gap-2">
          <h1 className="text-xl font-black text-foreground">
            {trialLocked ? 'საცდელი პერიოდი დასრულდა' : 'ანგარიში შეჩერებულია'}
          </h1>
          <p className="text-sm text-muted-foreground">
            {trialLocked
              ? 'საცდელი პერიოდი ამოიწურა. წვდომის გასაგრძელებლად განაახლეთ Pro-ზე — დაუკავშირდით ადმინისტრაციას.'
              : 'თქვენი მაღაზიის წვდომა დროებით შეჩერებულია. დეტალებისთვის დაუკავშირდით ადმინისტრაციას.'}
          </p>
        </div>
        <button
          onClick={signOut}
          className="h-11 px-6 rounded-2xl border border-border bg-white hover:bg-accent text-sm font-bold text-foreground transition-colors"
        >
          გასვლა
        </button>
      </div>
    )
  }

  // No organization on the account.
  if (!currentOrg) {
    // Platform admin → redirecting to /platform (handled by the effect above).
    if (isPlatformAdmin) {
      return (
        <div className="flex h-screen w-full flex-col items-center justify-center gap-4 bg-background">
          <div className="size-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/25">
            <Loader2 className="size-6 text-white animate-spin" />
          </div>
          <p className="text-sm font-semibold text-muted-foreground">პლატფორმის კონსოლზე გადასვლა...</p>
        </div>
      )
    }
    // Orphan user (no org, not an admin) — shouldn't normally happen.
    const signOut = async () => {
      await createClient().auth.signOut()
      window.location.href = '/login'
    }
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center gap-5 bg-background p-6 text-center">
        <div className="size-16 rounded-3xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-xl shadow-amber-500/25">
          <ShieldAlert className="size-8 text-white" />
        </div>
        <div className="max-w-md flex flex-col gap-2">
          <h1 className="text-xl font-black text-foreground">მაღაზია ვერ მოიძებნა</h1>
          <p className="text-sm text-muted-foreground">
            ამ ანგარიშს მაღაზია არ აქვს მიბმული. დაუკავშირდით ადმინისტრაციას ან შექმენით ახალი მაღაზია.
          </p>
        </div>
        <button
          onClick={signOut}
          className="h-11 px-6 rounded-2xl border border-border bg-white hover:bg-accent text-sm font-bold text-foreground transition-colors"
        >
          გასვლა
        </button>
      </div>
    )
  }

  return <>{children}</>
}
