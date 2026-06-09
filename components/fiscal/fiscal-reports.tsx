"use client"

import { useState } from 'react'
import { FileText, Loader2, Moon, Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { printFiscalReport, FiscalError, type FiscalReportType } from '@/lib/fiscal'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

const supabase = createClient()

export function FiscalReports() {
  const [busy, setBusy] = useState<FiscalReportType | null>(null)
  const [confirmZ, setConfirmZ] = useState(false)

  async function run(type: FiscalReportType) {
    setBusy(type)
    const t = toast.loading(type === 'Z' ? 'დღის დახურვა (Z-ანგარიში)...' : 'X-ანგარიში იბეჭდება...')
    try {
      const result = await printFiscalReport(type)
      // Log to our audit trail (best-effort).
      const { error } = await supabase.from('fiscal_reports').insert({
        type, report_id: result.reportId ?? null, data: result.raw,
      })
      if (error) console.error('fiscal_reports insert failed', error)
      toast.success(type === 'Z' ? 'დღე დაიხურა — Z-ანგარიში ამობეჭდილია' : 'X-ანგარიში ამობეჭდილია', { id: t })
    } catch (e) {
      toast.error(e instanceof FiscalError ? e.message : 'ანგარიში ვერ ამოიბეჭდა', { id: t })
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="card-3d flex flex-col sm:flex-row sm:items-center gap-4 px-5 py-4 rounded-2xl border border-border bg-white shadow-sm">
      <div className="flex items-center gap-3 flex-1">
        <div className="size-11 rounded-2xl bg-gradient-to-br from-slate-600 to-slate-800 flex items-center justify-center shadow-md shrink-0">
          <FileText className="size-5 text-white" />
        </div>
        <div>
          <p className="text-sm font-black text-foreground">ფისკალური ანგარიშები</p>
          <p className="text-xs text-muted-foreground">დღის დახურვა (Z) აუცილებელია სამუშაო დღის ბოლოს</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          disabled={busy !== null}
          onClick={() => run('X')}
          className="h-11 rounded-xl gap-1.5 font-bold"
        >
          {busy === 'X' ? <Loader2 className="size-4 animate-spin" /> : <Eye className="size-4" />}
          X-ანგარიში
        </Button>
        <Button
          disabled={busy !== null}
          onClick={() => setConfirmZ(true)}
          className="h-11 rounded-xl gap-1.5 font-black bg-gradient-to-r from-slate-700 to-slate-900 text-white border-0 shadow-lg"
        >
          {busy === 'Z' ? <Loader2 className="size-4 animate-spin" /> : <Moon className="size-4" />}
          დღის დახურვა (Z)
        </Button>
      </div>

      <AlertDialog open={confirmZ} onOpenChange={setConfirmZ}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>დღის დახურვა — Z-ანგარიში</AlertDialogTitle>
            <AlertDialogDescription>
              ეს დახურავს მიმდინარე ფისკალურ დღეს და განაახლებს დღიურ მთვლელებს აპარატზე. ეს ქმედება შეუქცევადია. გავაგრძელოთ?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl" disabled={busy !== null}>გაუქმება</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { setConfirmZ(false); run('Z') }}
              disabled={busy !== null}
              className="rounded-xl bg-gradient-to-r from-slate-700 to-slate-900 text-white border-0"
            >
              <Moon className="size-4 mr-1.5" /> დღის დახურვა
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
