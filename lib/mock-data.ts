// Shared domain types. Data now lives in Supabase (see lib/store.tsx); this file
// keeps the type definitions that the whole app imports.

export type Category = {
  id: string
  name: string
  parent_id: string | null
  icon: string | null
  created_at: string
}

export type Product = {
  id: string
  name: string
  barcode: string | null
  category_id: string
  purchase_price: number
  sale_price: number
  quantity: number
  photo_url: string | null
  created_at: string
}

export type FiscalStatus = 'none' | 'pending' | 'success' | 'failed'

export type SaleType = 'sale' | 'return'

export type Sale = {
  id: string
  total: number
  payment_method: 'cash' | 'card'
  items_count: number
  created_at: string
  type: SaleType
  reversal_of?: string | null // for returns: the original sale id
  // Fiscalization
  is_fiscal: boolean
  fiscal_status: FiscalStatus
  fiscal_id: string | null
  fiscal_data?: Record<string, unknown> | null
  fiscalized_at?: string | null
}

export type SaleItem = {
  id: string
  sale_id: string
  product_id: string
  product_name: string
  barcode: string | null
  quantity: number
  unit_price: number
  total_price: number
}

/** Signed money value of a sale row: returns count as negative against revenue. */
export function saleAmount(s: Pick<Sale, 'type' | 'total'>): number {
  return s.type === 'return' ? -s.total : s.total
}
