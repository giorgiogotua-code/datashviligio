"use client"

import { useEffect } from 'react'
import { Loader2 } from 'lucide-react'
import { useStore } from '@/lib/store'

export function StoreHydrator({ children }: { children: React.ReactNode }) {
  const isHydrated = useStore((s) => s.isHydrated)

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

  return <>{children}</>
}
