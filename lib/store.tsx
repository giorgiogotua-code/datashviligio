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
    sale: Pick<Sale, 'total' | 'payment_method' | 'items_count' | 'is_fiscal'>,
    items: Omit<SaleItem, 'id' | 'sale_id'>[]
  ) => Promise<Sale | null>
  addReturn: (
    original: Sale,
    items: Omit<SaleItem, 'id' | 'sale_id'>[]
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
    payment_method: r.payment_method,
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
      settings: DEFAULT_SETTINGS,
      pin: '1234',
      isHydrated: false,
      isLocked: false,
      isMobileSidebarOpen: false,
      isDesktopSidebarCollapsed: false,

      // ---- Load everything from Supabase ----
      hydrate: async () => {
        const [cats, prods, sales, items, settingsRows] = await Promise.all([
          supabase.from('categories').select('*').order('created_at', { ascending: true }),
          supabase.from('products').select('*').order('created_at', { ascending: false }),
          supabase.from('sales').select('*').order('created_at', { ascending: false }),
          supabase.from('sale_items').select('*'),
          supabase.from('settings').select('*'),
        ])

        if (cats.error || prods.error || sales.error || items.error || settingsRows.error) {
          console.error('Hydrate error', { cats, prods, sales, items, settingsRows })
          toast.error('მონაცემების ჩატვირთვა ვერ მოხერხდა')
          set({ isHydrated: true })
          return
        }

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
        const { data, error } = await supabase.rpc('create_sale', {
          p_total: sale.total,
          p_payment_method: sale.payment_method,
          p_items_count: sale.items_count,
          p_is_fiscal: sale.is_fiscal,
          p_items: items,
          p_type: 'sale',
        })
        if (failed(error, 'გაყიდვის შენახვა ვერ მოხერხდა') || !data) return null

        const saleRow = (data as any).sale
        const savedItems = ((data as any).items ?? []) as any[]
        const newSale = mapSale(saleRow)
        set((state) => ({
          sales: [newSale, ...state.sales],
          saleItems: [...state.saleItems, ...savedItems.map(mapSaleItem)],
          products: state.products.map((p) => {
            const sold = items.find((i) => i.product_id === p.id)
            return sold ? { ...p, quantity: Math.max(0, p.quantity - sold.quantity) } : p
          }),
        }))
        return newSale
      },

      // Return / refund: restores stock (+qty) via the same atomic function.
      addReturn: async (original, items) => {
        const total = items.reduce((s, i) => s + i.total_price, 0)
        const itemsCount = items.reduce((s, i) => s + i.quantity, 0)
        const { data, error } = await supabase.rpc('create_sale', {
          p_total: total,
          p_payment_method: original.payment_method,
          p_items_count: itemsCount,
          p_is_fiscal: original.is_fiscal,
          p_items: items,
          p_type: 'return',
          p_reversal_of: original.id,
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
        }))
        return newReturn
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
