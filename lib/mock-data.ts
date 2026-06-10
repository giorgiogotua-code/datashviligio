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
  total: number               // net total (after discount)
  discount?: number           // discount amount applied
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

// ---- Suppliers & purchasing ----
export type Supplier = {
  id: string
  name: string
  phone: string | null
  contact: string | null
  address: string | null
  note: string | null
  balance: number          // amount WE OWE the supplier (positive = our debt)
  created_at: string
}

export type Purchase = {
  id: string
  supplier_id: string | null
  supplier_name: string | null
  total: number
  paid: number
  items_count: number
  note: string | null
  created_at: string
}

export type PurchaseItem = {
  id: string
  purchase_id: string
  product_id: string | null
  product_name: string
  barcode: string | null
  quantity: number
  unit_cost: number
  total_cost: number
}

export type SupplierPayment = {
  id: string
  supplier_id: string
  amount: number
  note: string | null
  created_at: string
}

export type DiscountType = 'amount' | 'percent'

/** A single line item inside a held (parked) cart. Mirrors the POS CartItem shape. */
export type HeldCartItem = {
  product_id: string
  product_name: string
  barcode: string | null
  unit_price: number
  quantity: number
  photo_url: string | null
}

/** A parked cart saved to Supabase so it survives refresh / other devices. */
export type HeldCart = {
  id: string
  label: string | null
  items: HeldCartItem[]
  discount: number              // computed discount amount
  discount_type: DiscountType | null
  discount_value: number        // raw value the cashier typed (₾ or %)
  total: number                 // final total snapshot (after discount)
  items_count: number
  created_at: string
}
