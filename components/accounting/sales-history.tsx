"use client"

import { useState } from 'react'
import { ChevronDown, ChevronRight, Receipt, ReceiptText, RotateCw, Loader2, Undo2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useStore } from '@/lib/store'
import { issueFiscalReceipt, FiscalError } from '@/lib/fiscal'
import { ReturnDialog } from '@/components/accounting/return-dialog'
import { toast } from 'sonner'
import type { Sale, SaleItem } from '@/lib/mock-data'

const PAGE_SIZE = 25

interface Props {
  sales: Sale[]
  saleItems: SaleItem[]
}

function formatDt(iso: string) {
  const d = new Date(iso)
  const date = `${d.getDate().toString().padStart(2, '0')}.${(d.getMonth() + 1).toString().padStart(2, '0')}.${d.getFullYear()}`
  const time = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
  return { date, time }
}

export function SalesHistory({ sales, saleItems }: Props) {
  const { updateSaleFiscal } = useStore()
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [method, setMethod] = useState('all')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [retryingId, setRetryingId] = useState<string | null>(null)
  const [returnSale, setReturnSale] = useState<Sale | null>(null)

  async function retryFiscal(sale: Sale, items: SaleItem[]) {
    setRetryingId(sale.id)
    const t = toast.loading('ფისკალური ჩეკი იბეჭდება...')
    try {
      const result = await issueFiscalReceipt({
        saleId: sale.id,
        total: sale.total,
        paymentMethod: sale.payment_method,
        items: items.map(i => ({
          name: i.product_name, quantity: i.quantity, unitPrice: i.unit_price,
          total: i.total_price, barcode: i.barcode,
        })),
      })
      await updateSaleFiscal(sale.id, { fiscal_status: 'success', fiscal_id: result.fiscalId, fiscal_data: result.raw })
      toast.success(`ფისკალური ჩეკი გაიცა #${result.fiscalId}`, { id: t })
    } catch (e) {
      await updateSaleFiscal(sale.id, { fiscal_status: 'failed' })
      toast.error(e instanceof FiscalError ? e.message : 'ფისკალური ჩეკი ვერ გაიცა', { id: t })
    } finally {
      setRetryingId(null)
    }
  }

  const filtered = sales.filter(s => {
    const matchMethod = method === 'all' || s.payment_method === method
    return matchMethod
  })

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const pageSales = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <div className="flex flex-col gap-4">
      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <Select value={method} onValueChange={(v: string | null) => { setMethod(v ?? 'all'); setPage(1) }}>
          <SelectTrigger className="w-40">
            <SelectValue>
              {(value: string | null) =>
                ({ all: 'ყველა', cash: 'ნაღდი', card: 'ბარათი' }[value ?? 'all'] ?? 'ყველა')
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">ყველა</SelectItem>
            <SelectItem value="cash">ნაღდი</SelectItem>
            <SelectItem value="card">ბარათი</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground w-8"></th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">#</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">თარიღი</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">დრო</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground">პოზ.</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground">გადახდა</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground">სულ</th>
            </tr>
          </thead>
          <tbody>
            {pageSales.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-16 text-muted-foreground">
                  <Receipt className="size-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">გაყიდვები ვერ მოიძებნა</p>
                </td>
              </tr>
            ) : (
              pageSales.map((sale, i) => {
                const { date, time } = formatDt(sale.created_at)
                const isExpanded = expandedId === sale.id
                const items = saleItems.filter(si => si.sale_id === sale.id)
                return (
                  <>
                    <tr
                      key={sale.id}
                      className="border-b border-border/50 cursor-pointer hover:bg-muted/30 transition-colors"
                      onClick={() => setExpandedId(isExpanded ? null : sale.id)}
                    >
                      <td className="px-4 py-3 text-muted-foreground">
                        {isExpanded ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">{(page - 1) * PAGE_SIZE + i + 1}</td>
                      <td className="px-4 py-3 text-foreground">
                        <span className="flex items-center gap-1.5">
                          {date}
                          {sale.type === 'return' && (
                            <Badge className="bg-amber-100 text-amber-700 gap-1"><Undo2 className="size-3" />დაბრუნება</Badge>
                          )}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{time}</td>
                      <td className="px-4 py-3 text-center">
                        <Badge variant="secondary">{sale.items_count}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col items-center gap-1">
                          <Badge className={cn(
                            sale.payment_method === 'cash'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-blue-100 text-blue-700'
                          )}>
                            {sale.payment_method === 'cash' ? 'ნაღდი' : 'ბარათი'}
                          </Badge>
                          {sale.is_fiscal && sale.fiscal_status !== 'success' && (
                            <span className={cn(
                              'flex items-center gap-1 text-[10px] font-bold',
                              sale.fiscal_status === 'failed' ? 'text-red-600' : 'text-amber-600'
                            )}>
                              <ReceiptText className="size-3" />
                              {sale.fiscal_status === 'failed' ? 'ჩეკი ვერ გაიცა' : 'ჩეკი მუშავდება'}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className={cn('px-4 py-3 text-right font-bold', sale.type === 'return' ? 'text-amber-600' : 'text-primary')}>
                        {sale.type === 'return' ? '−' : ''}₾{sale.total.toFixed(2)}
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr key={`${sale.id}-expand`} className="border-b border-border/50 bg-muted/20">
                        <td colSpan={7} className="px-8 py-3">
                          <div className="flex flex-col gap-1.5">
                            {items.map(si => (
                              <div key={si.id} className="flex items-center justify-between text-xs">
                                <span className="text-foreground">{si.product_name}</span>
                                <span className="text-muted-foreground">{si.quantity} x ₾{si.unit_price.toFixed(2)}</span>
                                <span className="font-semibold text-foreground">₾{si.total_price.toFixed(2)}</span>
                              </div>
                            ))}
                          </div>
                          {sale.is_fiscal && (
                            <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/50">
                              <span className="flex items-center gap-1.5 text-xs">
                                <ReceiptText className="size-3.5 text-muted-foreground" />
                                {sale.fiscal_status === 'success'
                                  ? <span className="text-emerald-700 font-semibold">ფისკალური ჩეკი #{sale.fiscal_id}</span>
                                  : sale.fiscal_status === 'pending'
                                    ? <span className="text-amber-700 font-semibold">ჩეკი მუშავდება…</span>
                                    : <span className="text-red-600 font-semibold">ფისკალური ჩეკი ვერ გაიცა</span>}
                              </span>
                              {sale.fiscal_status !== 'success' && (
                                <Button
                                  size="sm" variant="outline"
                                  disabled={retryingId === sale.id}
                                  onClick={(e) => { e.stopPropagation(); retryFiscal(sale, items) }}
                                  className="h-8 rounded-lg gap-1.5 text-xs"
                                >
                                  {retryingId === sale.id ? <Loader2 className="size-3.5 animate-spin" /> : <RotateCw className="size-3.5" />}
                                  ჩეკის ხელახლა ცდა
                                </Button>
                              )}
                            </div>
                          )}
                          {sale.type === 'sale' && (
                            <div className="flex justify-end mt-3">
                              <Button
                                size="sm" variant="outline"
                                onClick={(e) => { e.stopPropagation(); setReturnSale(sale) }}
                                className="h-8 rounded-lg gap-1.5 text-xs text-amber-700 border-amber-200 hover:bg-amber-50"
                              >
                                <Undo2 className="size-3.5" /> დაბრუნება
                              </Button>
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </>
                )
              })
            )}
          </tbody>
        </table>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-muted/20">
            <p className="text-xs text-muted-foreground">გვ. {page} / {totalPages}</p>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" disabled={page === 1} onClick={() => setPage(p => p - 1)}>უკან</Button>
              <Button size="sm" variant="outline" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>წინ</Button>
            </div>
          </div>
        )}
      </div>

      <ReturnDialog
        open={!!returnSale}
        onClose={() => setReturnSale(null)}
        sale={returnSale}
        items={returnSale ? saleItems.filter(si => si.sale_id === returnSale.id) : []}
      />
    </div>
  )
}
