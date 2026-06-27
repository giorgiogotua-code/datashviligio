"use client"

import { useEffect } from 'react'
import { Loader2, ShieldAlert } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useStore } from '@/lib/store'

export function StoreHydrator({ children }: { children: React.ReactNode }) {
  const isHydrated = useStore((s) => s.isHydrated)
  const currentOrg = useStore((s) => s.currentOrg)
  const isPlatformAdmin = useStore((s) => s.isPlatformAdmin)

  useEffect(() => {
    if (!useStore.getState().isHydrated) {
      useStore.getState().hydrate()
    }
  }, [])

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

  // A suspended tenant is frozen out of the app (RLS also blocks all writes).
  // Platform admins are exempt so they can still operate.
  if (currentOrg?.status === 'suspended' && !isPlatformAdmin) {
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
          <h1 className="text-xl font-black text-foreground">ანგარიში შეჩერებულია</h1>
          <p className="text-sm text-muted-foreground">
            თქვენი მაღაზიის წვდომა დროებით შეჩერებულია. დეტალებისთვის დაუკავშირდით ადმინისტრაციას.
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
