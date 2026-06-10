import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { toast } from 'sonner'
import { createClient } from './supabase/client'
import {
  type Category,
  type Product,
  type Sale,
  type SaleItem,
  type FiscalStatus,
  type HeldCart,
  type HeldCartItem,
  type DiscountType,
  type Supplier,
  type Purchase,
  type PurchaseItem,
  type SupplierPayment,
  type Customer,
  type CustomerPayment,
  type Cashier,
  type Shift,
} from './mock-data'

const supabase = createClient()

export interface Settings {
  companyName: string
  companyId: string
  address: string
  phone: string
}

export interface StoreState {
  categories: Category[]
  products: Product[]
  sales: Sale[]
  saleItems: SaleItem[]
  heldCarts: HeldCart[]
  suppliers: Supplier[]
  purchases: Purchase[]
  purchaseItems: PurchaseItem[]
  supplierPayments: SupplierPayment[]
  customers: Customer[]
  customerPayments: CustomerPayment[]
  cashiers: Cashier[]
  shifts: Shift[]
  settings: Settings
  pin: string
  isHydrated: boolean
  isLocked: boolean
  isMobileSidebarOpen: boolean
  isDesktopSidebarCollapsed: boolean

  hydrate: () => Promise<void>
  setMobileSidebarOpen: (open: boolean) => void
  setDesktopSidebarCollapsed: (collapsed: boolean) => void
  updateSettings: (s: Partial<Settings>) => Promise<void>
  setPin: (pin: string) => Promise<void>
  lock: () => void
  unlock: (pin: string) => boolean
  addCategory: (cat: Omit<Category, 'id' | 'created_at'>) => Promise<void>
  updateCategory: (id: string, cat: Partial<Category>) => Promise<void>
  deleteCategory: (id: string) => Promise<void>
  addProduct: (p: Omit<Product, 'id' | 'created_at'>) => Promise<void>
  importProducts: (products: Omit<Product, 'id' | 'created_at'>[]) => Promise<void>
  updateProduct: (id: string, p: Partial<Product>) => Promise<void>
  deleteProduct: (id: string) => Promise<void>
  addSale: (
    sale: Pick<Sale, 'total' | 'payment_method' | 'items_count' | 'is_fiscal'> &
      { discount?: number; customer_id?: string | null; customer_name?: string | null; paid?: number },
    items: Omit<SaleItem, 'id' | 'sale_id' | 'unit_cost'>[]
  ) => Promise<Sale | null>
  // Held (parked) carts — persisted in Supabase so they survive refresh.
  holdCart: (cart: {
    label?: string | null
    items: HeldCartItem[]
    discount: number
    discount_type: DiscountType | null
    discount_value: number
    total: number
    items_count: number
  }) => Promise<void>
  deleteHeldCart: (id: string) => Promise<void>
  // Suppliers & purchasing
  addSupplier: (s: Pick<Supplier, 'name' | 'phone' | 'contact' | 'address' | 'note'>) => Promise<Supplier | null>
  updateSupplier: (id: string, s: Partial<Supplier>) => Promise<void>
  deleteSupplier: (id: string) => Promise<void>
  createPurchase: (
    purchase: { supplier_id: string | null; supplier_name: string | null; total: number; paid: number; items_count: number; note: string | null },
    items: Omit<PurchaseItem, 'id' | 'purchase_id'>[]
  ) => Promise<Purchase | null>
  paySupplier: (supplierId: string, amount: number, note?: string | null) => Promise<void>
  // Customers & credit (ნისია)
  addCustomer: (c: Pick<Customer, 'name' | 'phone' | 'note'>) => Promise<Customer | null>
  updateCustomer: (id: string, c: Partial<Customer>) => Promise<void>
  deleteCustomer: (id: string) => Promise<void>
  payCustomer: (customerId: string, amount: number, note?: string | null) => Promise<void>
  // Cashiers & shifts (ცვლები)
  addCashier: (c: Pick<Cashier, 'name' | 'pin'>) => Promise<Cashier | null>
  updateCashier: (id: string, c: Partial<Cashier>) => Promise<void>
  deleteCashier: (id: string) => Promise<void>
  openShift: (cashierId: string, cashierName: string, openingCash: number) => Promise<Shift | null>
  closeShift: (shiftId: string, closingCash: number) => Promise<Shift | null>
  addReturn: (
    original: Sale,
    items: Omit<SaleItem, 'id' | 'sale_id' | 'unit_cost'>[]
  ) => Promise<Sale | null>
  updateSaleFiscal: (
    saleId: string,
    fiscal: { fiscal_status: FiscalStatus; fiscal_id?: string | null; fiscal_data?: Record<string, unknown> | null }
  ) => Promise<void>
}

const DEFAULT_SETTINGS: Settings = {
  companyName: 'AccessoryShop',
  companyId: '',
  address: '',
  phone: '',
}

// ---- Row mappers: Postgres numeric/decimal can arrive as strings, so coerce. ----
const num = (v: unknown) => (v == null ? 0 : Number(v))

function mapProduct(r: any): Product {
  return {
    id: r.id,
    name: r.name,
    barcode: r.barcode ?? null,
    category_id: r.category_id ?? '',
    purchase_price: num(r.purchase_price),
    sale_price: num(r.sale_price),
    quantity: num(r.quantity),
    photo_url: r.photo_url ?? null,
    created_at: r.created_at,
  }
}

function mapSale(r: any): Sale {
  return {
    id: r.id,
    total: num(r.total),
    discount: num(r.discount),
    payment_method: r.payment_method,
    customer_id: r.customer_id ?? null,
    customer_name: r.customer_name ?? null,
    paid: num(r.paid),
    shift_id: r.shift_id ?? null,
    cashier_id: r.cashier_id ?? null,
    cashier_name: r.cashier_name ?? null,
    items_count: num(r.items_count),
    created_at: r.created_at,
    type: r.type ?? 'sale',
    reversal_of: r.reversal_of ?? null,
    is_fiscal: !!r.is_fiscal,
    fiscal_status: r.fiscal_status ?? 'none',
    fiscal_id: r.fiscal_id ?? null,
    fiscal_data: r.fiscal_data ?? null,
    fiscalized_at: r.fiscalized_at ?? null,
  }
}

function mapHeldCart(r: any): HeldCart {
  return {
    id: r.id,
    label: r.label ?? null,
    items: Array.isArray(r.items) ? (r.items as HeldCartItem[]) : [],
    discount: num(r.discount),
    discount_type: r.discount_type ?? null,
    discount_value: num(r.discount_value),
    total: num(r.total),
    items_count: num(r.items_count),
    created_at: r.created_at,
  }
}

function mapSupplier(r: any): Supplier {
  return {
    id: r.id,
    name: r.name,
    phone: r.phone ?? null,
    contact: r.contact ?? null,
    address: r.address ?? null,
    note: r.note ?? null,
    balance: num(r.balance),
    created_at: r.created_at,
  }
}

function mapPurchase(r: any): Purchase {
  return {
    id: r.id,
    supplier_id: r.supplier_id ?? null,
    supplier_name: r.supplier_name ?? null,
    total: num(r.total),
    paid: num(r.paid),
    items_count: num(r.items_count),
    note: r.note ?? null,
    created_at: r.created_at,
  }
}

function mapPurchaseItem(r: any): PurchaseItem {
  return {
    id: r.id,
    purchase_id: r.purchase_id,
    product_id: r.product_id ?? null,
    product_name: r.product_name,
    barcode: r.barcode ?? null,
    quantity: num(r.quantity),
    unit_cost: num(r.unit_cost),
    total_cost: num(r.total_cost),
  }
}

function mapSupplierPayment(r: any): SupplierPayment {
  return {
    id: r.id,
    supplier_id: r.supplier_id,
    amount: num(r.amount),
    note: r.note ?? null,
    created_at: r.created_at,
  }
}

function mapCustomer(r: any): Customer {
  return {
    id: r.id,
    name: r.name,
    phone: r.phone ?? null,
    note: r.note ?? null,
    balance: num(r.balance),
    created_at: r.created_at,
  }
}

function mapCustomerPayment(r: any): CustomerPayment {
  return {
    id: r.id,
    customer_id: r.customer_id,
    amount: num(r.amount),
    note: r.note ?? null,
    created_at: r.created_at,
  }
}

function mapCashier(r: any): Cashier {
  return {
    id: r.id,
    name: r.name,
    pin: r.pin ?? '',
    active: r.active ?? true,
    created_at: r.created_at,
  }
}

function mapShift(r: any): Shift {
  return {
    id: r.id,
    cashier_id: r.cashier_id ?? null,
    cashier_name: r.cashier_name ?? null,
    status: r.status ?? 'open',
    opening_cash: num(r.opening_cash),
    closing_cash: r.closing_cash == null ? null : num(r.closing_cash),
    cash_sales: num(r.cash_sales),
    card_sales: num(r.card_sales),
    credit_sales: num(r.credit_sales),
    credit_paid: num(r.credit_paid),
    returns_total: num(r.returns_total),
    sales_count: num(r.sales_count),
    expected_cash: num(r.expected_cash),
    difference: num(r.difference),
    opened_at: r.opened_at,
    closed_at: r.closed_at ?? null,
  }
}

function mapSaleItem(r: any): SaleItem {
  return {
    id: r.id,
    sale_id: r.sale_id,
    product_id: r.product_id,
    product_name: r.product_name,
    barcode: r.barcode ?? null,
    quantity: num(r.quantity),
    unit_price: num(r.unit_price),
    total_price: num(r.total_price),
    unit_cost: num(r.unit_cost),
  }
}

/** Empty category_id ('' from the UI) is not a valid UUID — send NULL instead. */
function sanitizeProductWrite<T extends { category_id?: string | null }>(p: T): T {
  if (!('category_id' in p)) return p
  return { ...p, category_id: p.category_id ? p.category_id : null }
}

/** Centralised error surface for DB writes. Returns true on success. */
function failed(error: unknown, msg: string): boolean {
  if (error) {
    console.error(msg, error)
    toast.error(msg)
    return true
  }
  return false
}

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      categories: [],
      products: [],
      sales: [],
      saleItems: [],
      heldCarts: [],
      suppliers: [],
      purchases: [],
      purchaseItems: [],
      supplierPayments: [],
      customers: [],
      customerPayments: [],
      cashiers: [],
      shifts: [],
      settings: DEFAULT_SETTINGS,
      pin: '1234',
      isHydrated: false,
      isLocked: false,
      isMobileSidebarOpen: false,
      isDesktopSidebarCollapsed: false,

      // ---- Load everything from Supabase ----
      hydrate: async () => {
        const [cats, prods, sales, items, settingsRows, held, sups, purch, purchItems, supPays, custs, custPays, cashRows, shiftRows] = await Promise.all([
          supabase.from('categories').select('*').order('created_at', { ascending: true }),
          supabase.from('products').select('*').order('created_at', { ascending: false }),
          supabase.from('sales').select('*').order('created_at', { ascending: false }),
          supabase.from('sale_items').select('*'),
          supabase.from('settings').select('*'),
          supabase.from('held_carts').select('*').order('created_at', { ascending: false }),
          supabase.from('suppliers').select('*').order('created_at', { ascending: false }),
          supabase.from('purchases').select('*').order('created_at', { ascending: false }),
          supabase.from('purchase_items').select('*'),
          supabase.from('supplier_payments').select('*').order('created_at', { ascending: false }),
          supabase.from('customers').select('*').order('created_at', { ascending: false }),
          supabase.from('customer_payments').select('*').order('created_at', { ascending: false }),
          supabase.from('cashiers').select('*').order('created_at', { ascending: true }),
          supabase.from('shifts').select('*').order('opened_at', { ascending: false }),
        ])

        if (cats.error || prods.error || sales.error || items.error || settingsRows.error) {
          console.error('Hydrate error', { cats, prods, sales, items, settingsRows })
          toast.error('მონაცემების ჩატვირთვა ვერ მოხერხდა')
          set({ isHydrated: true })
          return
        }
        // held_carts + supplier tables are non-critical (newer tables); don't fail hydrate if they error
        if (held.error) console.error('held_carts load error', held.error)
        if (sups.error || purch.error || purchItems.error || supPays.error)
          console.error('suppliers load error', { sups, purch, purchItems, supPays })
        if (custs.error || custPays.error)
          console.error('customers load error', { custs, custPays })
        if (cashRows.error || shiftRows.error)
          console.error('cashiers/shifts load error', { cashRows, shiftRows })

        // settings key-value rows -> Settings object (+ pin)
        const kv: Record<string, string> = {}
        for (const row of settingsRows.data ?? []) kv[row.key] = row.value
        const settings: Settings = {
          companyName: kv.companyName ?? DEFAULT_SETTINGS.companyName,
          companyId: kv.companyId ?? DEFAULT_SETTINGS.companyId,
          address: kv.address ?? DEFAULT_SETTINGS.address,
          phone: kv.phone ?? DEFAULT_SETTINGS.phone,
        }

        set({
          categories: (cats.data ?? []) as Category[],
          products: (prods.data ?? []).map(mapProduct),
          sales: (sales.data ?? []).map(mapSale),
          saleItems: (items.data ?? []).map(mapSaleItem),
          heldCarts: (held.data ?? []).map(mapHeldCart),
          suppliers: (sups.data ?? []).map(mapSupplier),
          purchases: (purch.data ?? []).map(mapPurchase),
          purchaseItems: (purchItems.data ?? []).map(mapPurchaseItem),
          supplierPayments: (supPays.data ?? []).map(mapSupplierPayment),
          customers: (custs.data ?? []).map(mapCustomer),
          customerPayments: (custPays.data ?? []).map(mapCustomerPayment),
          cashiers: (cashRows.data ?? []).map(mapCashier),
          shifts: (shiftRows.data ?? []).map(mapShift),
          settings,
          pin: kv.pin ?? '1234',
          isHydrated: true,
        })
      },

      // ---- UI-only state ----
      setMobileSidebarOpen: (open) => set({ isMobileSidebarOpen: open }),
      setDesktopSidebarCollapsed: (collapsed) => set({ isDesktopSidebarCollapsed: collapsed }),

      lock: () => set({ isLocked: true }),
      unlock: (inputPin) => {
        if (inputPin === get().pin) {
          set({ isLocked: false })
          return true
        }
        return false
      },

      // ---- Settings (key-value upsert) ----
      updateSettings: async (s) => {
        const prev = get().settings
        const next = { ...prev, ...s }
        set({ settings: next }) // optimistic
        const rows = Object.entries(s).map(([key, value]) => ({ key, value: String(value ?? '') }))
        const { error } = await supabase.from('settings').upsert(rows, { onConflict: 'key' })
        if (failed(error, 'პარამეტრების შენახვა ვერ მოხერხდა')) set({ settings: prev })
      },

      setPin: async (pin) => {
        const prev = get().pin
        set({ pin }) // optimistic
        const { error } = await supabase.from('settings').upsert({ key: 'pin', value: pin }, { onConflict: 'key' })
        if (failed(error, 'PIN-ის შენახვა ვერ მოხერხდა')) set({ pin: prev })
      },

      // ---- Categories ----
      addCategory: async (cat) => {
        const { data, error } = await supabase
          .from('categories')
          .insert({ name: cat.name, parent_id: cat.parent_id ?? null, icon: cat.icon ?? null })
          .select()
          .single()
        if (failed(error, 'კატეგორიის დამატება ვერ მოხერხდა') || !data) return
        set((state) => ({ categories: [...state.categories, data as Category] }))
      },

      updateCategory: async (id, cat) => {
        const { error } = await supabase.from('categories').update(cat).eq('id', id)
        if (failed(error, 'კატეგორიის განახლება ვერ მოხერხდა')) return
        set((state) => ({
          categories: state.categories.map((c) => (c.id === id ? { ...c, ...cat } : c)),
        }))
      },

      deleteCategory: async (id) => {
        const { error } = await supabase.from('categories').delete().eq('id', id)
        if (failed(error, 'კატეგორიის წაშლა ვერ მოხერხდა')) return
        set((state) => {
          // mirror DB cascade locally: remove the category + all descendants
          const toRemove = new Set<string>([id])
          let grew = true
          while (grew) {
            grew = false
            for (const c of state.categories) {
              if (c.parent_id && toRemove.has(c.parent_id) && !toRemove.has(c.id)) {
                toRemove.add(c.id)
                grew = true
              }
            }
          }
          return {
            categories: state.categories.filter((c) => !toRemove.has(c.id)),
            // products kept their rows in DB (ON DELETE SET NULL); reflect that locally
            products: state.products.map((p) =>
              p.category_id && toRemove.has(p.category_id) ? { ...p, category_id: '' } : p
            ),
          }
        })
      },

      // ---- Products ----
      addProduct: async (p) => {
        const { data, error } = await supabase.from('products').insert(sanitizeProductWrite(p)).select().single()
        if (failed(error, 'პროდუქტის დამატება ვერ მოხერხდა') || !data) return
        set((state) => ({ products: [mapProduct(data), ...state.products] }))
      },

      importProducts: async (products) => {
        if (products.length === 0) return
        const { data, error } = await supabase.from('products').insert(products.map(sanitizeProductWrite)).select()
        if (failed(error, 'პროდუქტების იმპორტი ვერ მოხერხდა') || !data) return
        set((state) => ({ products: [...data.map(mapProduct), ...state.products] }))
      },

      updateProduct: async (id, p) => {
        const { error } = await supabase.from('products').update(sanitizeProductWrite(p)).eq('id', id)
        if (failed(error, 'პროდუქტის განახლება ვერ მოხერხდა')) return
        set((state) => ({
          products: state.products.map((prod) => (prod.id === id ? { ...prod, ...p } : prod)),
        }))
      },

      deleteProduct: async (id) => {
        const { error } = await supabase.from('products').delete().eq('id', id)
        if (failed(error, 'პროდუქტის წაშლა ვერ მოხერხდა')) return
        set((state) => ({ products: state.products.filter((p) => p.id !== id) }))
      },

      // ---- Sales ----
      // Atomic: sale + line items + stock change happen in one DB transaction
      // (Postgres function create_sale). is_fiscal sales start as 'pending'.
      addSale: async (sale, items) => {
        const openShiftRow = get().shifts.find((s) => s.status === 'open')
        const { data, error } = await supabase.rpc('create_sale', {
          p_total: sale.total,
          p_payment_method: sale.payment_method,
          p_items_count: sale.items_count,
          p_is_fiscal: sale.is_fiscal,
          p_items: items,
          p_type: 'sale',
          p_discount: sale.discount ?? 0,
          p_customer_id: sale.customer_id ?? null,
          p_customer_name: sale.customer_name ?? null,
          p_paid: sale.paid ?? null,
          p_shift_id: openShiftRow?.id ?? null,
          p_cashier_id: openShiftRow?.cashier_id ?? null,
          p_cashier_name: openShiftRow?.cashier_name ?? null,
        })
        if (error) {
          // Server rejected an oversell (stock changed under us) — show real stock.
          const m = (error as { message?: string }).message ?? ''
          if (m.includes('INSUFFICIENT_STOCK')) {
            const [name, avail] = m.split('INSUFFICIENT_STOCK:')[1]?.split(':') ?? []
            toast.error(`${name || 'პროდუქტი'} — მარაგში მხოლოდ ${avail || 0} ცალია`)
            // Resync product stock so the cart reflects reality.
            const { data: fresh } = await supabase.from('products').select('*')
            if (fresh) set({ products: fresh.map(mapProduct) })
            return null
          }
          failed(error, 'გაყიდვის შენახვა ვერ მოხერხდა')
          return null
        }
        if (!data) return null

        const saleRow = (data as any).sale
        const savedItems = ((data as any).items ?? []) as any[]
        const newSale = mapSale(saleRow)
        // Unpaid remainder of a credit sale increases the customer's debt locally.
        const debtAdded = sale.customer_id ? sale.total - (sale.paid ?? sale.total) : 0
        set((state) => ({
          sales: [newSale, ...state.sales],
          saleItems: [...state.saleItems, ...savedItems.map(mapSaleItem)],
          products: state.products.map((p) => {
            const sold = items.find((i) => i.product_id === p.id)
            return sold ? { ...p, quantity: Math.max(0, p.quantity - sold.quantity) } : p
          }),
          customers: debtAdded !== 0
            ? state.customers.map((c) => (c.id === sale.customer_id ? { ...c, balance: c.balance + debtAdded } : c))
            : state.customers,
        }))
        return newSale
      },

      // Return / refund: restores stock (+qty) via the same atomic function.
      addReturn: async (original, items) => {
        const total = items.reduce((s, i) => s + i.total_price, 0)
        const itemsCount = items.reduce((s, i) => s + i.quantity, 0)
        const openShiftRow = get().shifts.find((s) => s.status === 'open')
        const { data, error } = await supabase.rpc('create_sale', {
          p_total: total,
          p_payment_method: original.payment_method,
          p_items_count: itemsCount,
          p_is_fiscal: original.is_fiscal,
          p_items: items,
          p_type: 'return',
          p_reversal_of: original.id,
          // A return of a credit sale lowers that customer's debt.
          p_customer_id: original.customer_id ?? null,
          p_customer_name: original.customer_name ?? null,
          p_shift_id: openShiftRow?.id ?? null,
          p_cashier_id: openShiftRow?.cashier_id ?? null,
          p_cashier_name: openShiftRow?.cashier_name ?? null,
        })
        if (failed(error, 'დაბრუნების შენახვა ვერ მოხერხდა') || !data) return null

        const saleRow = (data as any).sale
        const savedItems = ((data as any).items ?? []) as any[]
        const newReturn = mapSale(saleRow)
        set((state) => ({
          sales: [newReturn, ...state.sales],
          saleItems: [...state.saleItems, ...savedItems.map(mapSaleItem)],
          products: state.products.map((p) => {
            const ret = items.find((i) => i.product_id === p.id)
            return ret ? { ...p, quantity: p.quantity + ret.quantity } : p
          }),
          // Mirror the debt reduction locally for credit-sale returns.
          customers: original.customer_id
            ? state.customers.map((c) => (c.id === original.customer_id ? { ...c, balance: c.balance - total } : c))
            : state.customers,
        }))
        return newReturn
      },

      // ---- Held (parked) carts ----
      holdCart: async (cart) => {
        const { data, error } = await supabase
          .from('held_carts')
          .insert({
            label: cart.label ?? null,
            items: cart.items,
            discount: cart.discount,
            discount_type: cart.discount_type,
            discount_value: cart.discount_value,
            total: cart.total,
            items_count: cart.items_count,
          })
          .select()
          .single()
        if (failed(error, 'კალათის გადადება ვერ მოხერხდა') || !data) return
        set((state) => ({ heldCarts: [mapHeldCart(data), ...state.heldCarts] }))
      },

      deleteHeldCart: async (id) => {
        const { error } = await supabase.from('held_carts').delete().eq('id', id)
        if (failed(error, 'გადადებული კალათის წაშლა ვერ მოხერხდა')) return
        set((state) => ({ heldCarts: state.heldCarts.filter((c) => c.id !== id) }))
      },

      // ---- Suppliers ----
      addSupplier: async (s) => {
        const { data, error } = await supabase
          .from('suppliers')
          .insert({ name: s.name, phone: s.phone, contact: s.contact, address: s.address, note: s.note })
          .select()
          .single()
        if (failed(error, 'მომწოდებლის დამატება ვერ მოხერხდა') || !data) return null
        const sup = mapSupplier(data)
        set((state) => ({ suppliers: [sup, ...state.suppliers] }))
        return sup
      },

      updateSupplier: async (id, s) => {
        const { error } = await supabase.from('suppliers').update(s).eq('id', id)
        if (failed(error, 'მომწოდებლის განახლება ვერ მოხერხდა')) return
        set((state) => ({ suppliers: state.suppliers.map((x) => (x.id === id ? { ...x, ...s } : x)) }))
      },

      deleteSupplier: async (id) => {
        const { error } = await supabase.from('suppliers').delete().eq('id', id)
        if (failed(error, 'მომწოდებლის წაშლა ვერ მოხერხდა')) return
        set((state) => ({ suppliers: state.suppliers.filter((x) => x.id !== id) }))
      },

      // ---- Purchasing (atomic: stock up + cost refresh + supplier debt) ----
      createPurchase: async (purchase, items) => {
        const { data, error } = await supabase.rpc('create_purchase', {
          p_supplier_id: purchase.supplier_id,
          p_supplier_name: purchase.supplier_name,
          p_total: purchase.total,
          p_paid: purchase.paid,
          p_items_count: purchase.items_count,
          p_note: purchase.note,
          p_items: items,
        })
        if (failed(error, 'შესყიდვის შენახვა ვერ მოხერხდა') || !data) return null

        const newPurchase = mapPurchase((data as any).purchase)
        const savedItems = ((data as any).items ?? []) as any[]
        set((state) => ({
          purchases: [newPurchase, ...state.purchases],
          purchaseItems: [...state.purchaseItems, ...savedItems.map(mapPurchaseItem)],
          // raise stock + refresh cost locally
          products: state.products.map((p) => {
            const bought = items.find((i) => i.product_id === p.id)
            return bought ? { ...p, quantity: p.quantity + bought.quantity, purchase_price: bought.unit_cost } : p
          }),
          // add unpaid remainder to supplier balance locally
          suppliers: state.suppliers.map((s) =>
            s.id === purchase.supplier_id ? { ...s, balance: s.balance + (purchase.total - purchase.paid) } : s
          ),
        }))
        return newPurchase
      },

      paySupplier: async (supplierId, amount, note) => {
        const { data, error } = await supabase.rpc('pay_supplier', {
          p_supplier_id: supplierId,
          p_amount: amount,
          p_note: note ?? null,
        })
        if (failed(error, 'გადახდის შენახვა ვერ მოხერხდა') || !data) return
        const payment = mapSupplierPayment((data as any).payment)
        const supplier = mapSupplier((data as any).supplier)
        set((state) => ({
          supplierPayments: [payment, ...state.supplierPayments],
          suppliers: state.suppliers.map((s) => (s.id === supplierId ? supplier : s)),
        }))
      },

      // ---- Customers (credit / ნისია) ----
      addCustomer: async (c) => {
        const { data, error } = await supabase
          .from('customers')
          .insert({ name: c.name, phone: c.phone, note: c.note })
          .select()
          .single()
        if (failed(error, 'კლიენტის დამატება ვერ მოხერხდა') || !data) return null
        const cust = mapCustomer(data)
        set((state) => ({ customers: [cust, ...state.customers] }))
        return cust
      },

      updateCustomer: async (id, c) => {
        const { error } = await supabase.from('customers').update(c).eq('id', id)
        if (failed(error, 'კლიენტის განახლება ვერ მოხერხდა')) return
        set((state) => ({ customers: state.customers.map((x) => (x.id === id ? { ...x, ...c } : x)) }))
      },

      deleteCustomer: async (id) => {
        const { error } = await supabase.from('customers').delete().eq('id', id)
        if (failed(error, 'კლიენტის წაშლა ვერ მოხერხდა')) return
        set((state) => ({ customers: state.customers.filter((x) => x.id !== id) }))
      },

      payCustomer: async (customerId, amount, note) => {
        const { data, error } = await supabase.rpc('pay_customer', {
          p_customer_id: customerId,
          p_amount: amount,
          p_note: note ?? null,
        })
        if (failed(error, 'გადახდის შენახვა ვერ მოხერხდა') || !data) return
        const payment = mapCustomerPayment((data as any).payment)
        const customer = mapCustomer((data as any).customer)
        set((state) => ({
          customerPayments: [payment, ...state.customerPayments],
          customers: state.customers.map((c) => (c.id === customerId ? customer : c)),
        }))
      },

      // ---- Cashiers ----
      addCashier: async (c) => {
        const { data, error } = await supabase
          .from('cashiers')
          .insert({ name: c.name, pin: c.pin })
          .select()
          .single()
        if (error) {
          if ((error as { code?: string }).code === '23505') toast.error('ეს PIN უკვე გამოიყენება სხვა აქტიურ კასირზე')
          else failed(error, 'კასირის დამატება ვერ მოხერხდა')
          return null
        }
        if (!data) return null
        const cash = mapCashier(data)
        set((state) => ({ cashiers: [...state.cashiers, cash] }))
        return cash
      },

      updateCashier: async (id, c) => {
        const { error } = await supabase.from('cashiers').update(c).eq('id', id)
        if (error) {
          if ((error as { code?: string }).code === '23505') toast.error('ეს PIN უკვე გამოიყენება სხვა აქტიურ კასირზე')
          else failed(error, 'კასირის განახლება ვერ მოხერხდა')
          return
        }
        set((state) => ({ cashiers: state.cashiers.map((x) => (x.id === id ? { ...x, ...c } : x)) }))
      },

      deleteCashier: async (id) => {
        const { error } = await supabase.from('cashiers').delete().eq('id', id)
        if (failed(error, 'კასირის წაშლა ვერ მოხერხდა')) return
        set((state) => ({ cashiers: state.cashiers.filter((x) => x.id !== id) }))
      },

      // ---- Shifts (ცვლები) ----
      openShift: async (cashierId, cashierName, openingCash) => {
        const { data, error } = await supabase.rpc('open_shift', {
          p_cashier_id: cashierId,
          p_cashier_name: cashierName,
          p_opening_cash: openingCash,
        })
        if (error) {
          const m = (error as { message?: string }).message ?? ''
          if (m.includes('SHIFT_ALREADY_OPEN')) toast.error('ცვლა უკვე გახსნილია')
          else failed(error, 'ცვლის გახსნა ვერ მოხერხდა')
          return null
        }
        const shift = mapShift(data)
        set((state) => ({ shifts: [shift, ...state.shifts] }))
        return shift
      },

      closeShift: async (shiftId, closingCash) => {
        const { data, error } = await supabase.rpc('close_shift', {
          p_shift_id: shiftId,
          p_closing_cash: closingCash,
        })
        if (failed(error, 'ცვლის დახურვა ვერ მოხერხდა') || !data) return null
        const shift = mapShift(data)
        set((state) => ({ shifts: state.shifts.map((s) => (s.id === shiftId ? shift : s)) }))
        return shift
      },

      // ---- Fiscal result of a sale (called after the device responds) ----
      updateSaleFiscal: async (saleId, fiscal) => {
        const patch = {
          fiscal_status: fiscal.fiscal_status,
          fiscal_id: fiscal.fiscal_id ?? null,
          fiscal_data: fiscal.fiscal_data ?? null,
          fiscalized_at: fiscal.fiscal_status === 'success' ? new Date().toISOString() : null,
        }
        const { error } = await supabase.from('sales').update(patch).eq('id', saleId)
        if (failed(error, 'ფისკალური სტატუსის შენახვა ვერ მოხერხდა')) return
        set((state) => ({
          sales: state.sales.map((s) => (s.id === saleId ? { ...s, ...patch } : s)),
        }))
      },
    }),
    {
      name: 'pos-ui-prefs',
      // Only persist lightweight UI prefs locally. All real data lives in Supabase.
      partialize: (state) => ({
        isDesktopSidebarCollapsed: state.isDesktopSidebarCollapsed,
      }),
    }
  )
)
