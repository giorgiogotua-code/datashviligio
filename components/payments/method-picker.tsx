"use client"

import { Banknote, CreditCard, ArrowLeftRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { PayMethod } from '@/lib/mock-data'

const PAY_METHODS: { key: PayMethod; label: string; icon: React.ElementType }[] = [
  { key: 'cash',     label: 'ნაღდი',      icon: Banknote },
  { key: 'card',     label: 'ბარათი',     icon: CreditCard },
  { key: 'transfer', label: 'გადარიცხვა', icon: ArrowLeftRight },
]

/** Cash / card / transfer selector for a payment. Only "cash" affects the shift's drawer. */
export function MethodPicker({ value, onChange }: { value: PayMethod; onChange: (m: PayMethod) => void }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide pl-1">გადახდის ფორმა</label>
      <div className="grid grid-cols-3 gap-1.5">
        {PAY_METHODS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => onChange(key)}
            className={cn('flex items-center justify-center gap-1.5 h-10 rounded-xl border-2 text-xs font-bold transition-all',
              value === key ? 'border-emerald-400 bg-emerald-50 text-emerald-700' : 'border-border text-muted-foreground hover:bg-muted/40')}
          >
            <Icon className="size-3.5" /> {label}
          </button>
        ))}
      </div>
    </div>
  )
}
