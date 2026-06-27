"use client"

import { useState } from 'react'
import { Clock, AlertTriangle, Sparkles, Loader2, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useStore } from '@/lib/store'

const DAY = 86_400_000

export function TrialBanner() {
  const currentOrg = useStore((s) => s.currentOrg)
  const requestUpgrade = useStore((s) => s.requestUpgrade)
  const [sending, setSending] = useState(false)

  if (!currentOrg || currentOrg.plan !== 'trial' || !currentOrg.trial_ends_at) return null

  const ends = new Date(currentOrg.trial_ends_at).getTime()
  const daysLeft = Math.ceil((ends - Date.now()) / DAY)        // > 0 while trial active
  const lockInDays = Math.ceil((ends + 3 * DAY - Date.now()) / DAY) // days until writes lock
  if (lockInDays <= 0) return null                              // past grace → suspended screen handles it

  const expired = daysLeft <= 0
  const onUpgrade = async () => {
    setSending(true)
    await requestUpgrade()
    setSending(false)
  }

  return (
    <div
      className={cn(
        'shrink-0 rounded-2xl px-4 py-2.5 flex items-center gap-3 border',
        expired
          ? 'bg-gradient-to-r from-red-500/10 to-orange-500/10 border-red-300/50'
          : 'bg-gradient-to-r from-indigo-500/10 to-violet-500/10 border-indigo-300/40',
      )}
    >
      <div
        className={cn(
          'size-8 rounded-xl flex items-center justify-center shrink-0 text-white shadow-sm',
          expired ? 'bg-gradient-to-br from-red-500 to-orange-600' : 'bg-gradient-to-br from-indigo-500 to-violet-600',
        )}
      >
        {expired ? <AlertTriangle className="size-4" /> : <Clock className="size-4" />}
      </div>

      <div className="flex-1 min-w-0">
        <p className={cn('text-sm font-bold leading-tight', expired ? 'text-red-700' : 'text-indigo-700')}>
          {expired
            ? `საცდელი პერიოდი დასრულდა — ${lockInDays} დღეში დაიბლოკება`
            : `საცდელი პერიოდი — დარჩა ${daysLeft} დღე`}
        </p>
        <p className="text-[11px] text-muted-foreground leading-none mt-0.5">
          {expired ? 'განაახლე Pro-ზე წვდომის შესანარჩუნებლად' : 'Pro — ულიმიტო პროდუქცია და სრული წვდომა'}
        </p>
      </div>

      {currentOrg.upgrade_requested ? (
        <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 shrink-0">
          <CheckCircle2 className="size-4" /> მოთხოვნა გაგზავნილია
        </span>
      ) : (
        <button
          onClick={onUpgrade}
          disabled={sending}
          className={cn(
            'shrink-0 h-9 px-4 rounded-xl text-sm font-bold text-white flex items-center gap-1.5 transition-transform hover:scale-[1.02] disabled:opacity-60 shadow-md',
            expired ? 'bg-gradient-to-r from-red-500 to-orange-600' : 'bg-gradient-to-r from-indigo-500 to-violet-600',
          )}
        >
          {sending ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
          განახლება
        </button>
      )}
    </div>
  )
}
