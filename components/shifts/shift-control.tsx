"use client"

import { useState } from 'react'
import { CircleDot, Play } from 'lucide-react'
import { useStore } from '@/lib/store'
import { OpenShiftDialog } from './open-shift-dialog'
import { CloseShiftDialog } from './close-shift-dialog'

export function ShiftControl() {
  const currentShift = useStore(s => s.shifts.find(x => x.status === 'open'))
  const [openDialog, setOpenDialog] = useState(false)
  const [closeDialog, setCloseDialog] = useState(false)

  return (
    <>
      {currentShift ? (
        <button
          onClick={() => setCloseDialog(true)}
          title="ცვლის დახურვა (Z-რეპორტი)"
          className="flex items-center gap-2 h-9 px-3 rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 transition-colors"
        >
          <CircleDot className="size-3.5 text-emerald-600 animate-pulse" />
          <span className="text-xs font-bold text-emerald-700 max-w-24 truncate hidden sm:inline">{currentShift.cashier_name}</span>
          <span className="text-[10px] font-semibold text-emerald-600 uppercase tracking-wide">ღია</span>
        </button>
      ) : (
        <button
          onClick={() => setOpenDialog(true)}
          title="ცვლის გახსნა"
          className="flex items-center gap-1.5 h-9 px-3 rounded-xl border border-amber-200 bg-amber-50 hover:bg-amber-100 transition-colors"
        >
          <Play className="size-3.5 text-amber-600" />
          <span className="text-xs font-bold text-amber-700 hidden sm:inline">ცვლა დახურულია</span>
        </button>
      )}

      <OpenShiftDialog open={openDialog} onClose={() => setOpenDialog(false)} />
      <CloseShiftDialog open={closeDialog} onClose={() => setCloseDialog(false)} shift={currentShift ?? null} />
    </>
  )
}
