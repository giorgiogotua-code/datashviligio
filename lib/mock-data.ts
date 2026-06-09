"use client"

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

export type Sale = {
  id: string
  total: number
  payment_method: 'cash' | 'card'
  items_count: number
  created_at: string
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

// ---- Categories ----
export const INITIAL_CATEGORIES: Category[] = [
  { id: 'c1', name: 'ქეისები', parent_id: null, icon: 'smartphone', created_at: '2024-01-01' },
  { id: 'c2', name: 'დამტენები', parent_id: null, icon: 'zap', created_at: '2024-01-02' },
  { id: 'c3', name: 'ყურსასმენები', parent_id: null, icon: 'headphones', created_at: '2024-01-03' },
  { id: 'c4', name: 'სპიკერები', parent_id: null, icon: 'speaker', created_at: '2024-01-04' },
  { id: 'c5', name: 'კაბელები', parent_id: null, icon: 'plug', created_at: '2024-01-05' },
  { id: 'c6', name: 'დამცავი მინები', parent_id: null, icon: 'shield', created_at: '2024-01-06' },
  { id: 'c11', name: 'Samsung ქეისები', parent_id: 'c1', icon: null, created_at: '2024-01-07' },
  { id: 'c12', name: 'iPhone ქეისები', parent_id: 'c1', icon: null, created_at: '2024-01-08' },
  { id: 'c21', name: 'სადენიანი დამტენები', parent_id: 'c2', icon: null, created_at: '2024-01-09' },
  { id: 'c22', name: 'უსადენო დამტენები', parent_id: 'c2', icon: null, created_at: '2024-01-10' },
]

// ---- Products with real Unsplash photos ----
export const INITIAL_PRODUCTS: Product[] = [
  {
    id: 'p1',
    name: 'Samsung A54 სილიკონის ქეისი',
    barcode: '4751001000001',
    category_id: 'c11',
    purchase_price: 3.5,
    sale_price: 9.99,
    quantity: 45,
    photo_url: 'https://images.unsplash.com/photo-1601593346740-925612772716?w=300&h=300&fit=crop',
    created_at: '2024-02-01',
  },
  {
    id: 'p2',
    name: 'iPhone 15 Pro ტყავის ქეისი',
    barcode: '4751001000002',
    category_id: 'c12',
    purchase_price: 8.0,
    sale_price: 24.99,
    quantity: 22,
    photo_url: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=300&h=300&fit=crop',
    created_at: '2024-02-02',
  },
  {
    id: 'p3',
    name: 'USB-C 65W სწრაფი დამტენი',
    barcode: '4751001000003',
    category_id: 'c21',
    purchase_price: 12.0,
    sale_price: 34.99,
    quantity: 15,
    photo_url: 'https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=300&h=300&fit=crop',
    created_at: '2024-02-03',
  },
  {
    id: 'p4',
    name: 'Anker 15W უსადენო დამტენი',
    barcode: '4751001000004',
    category_id: 'c22',
    purchase_price: 18.0,
    sale_price: 49.99,
    quantity: 8,
    photo_url: 'https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=300&h=300&fit=crop',
    created_at: '2024-02-04',
  },
  {
    id: 'p5',
    name: 'Sony WH-1000XM5 ყურსასმენი',
    barcode: '4751001000005',
    category_id: 'c3',
    purchase_price: 120.0,
    sale_price: 299.99,
    quantity: 4,
    photo_url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=300&h=300&fit=crop',
    created_at: '2024-02-05',
  },
  {
    id: 'p6',
    name: 'JBL Flip 6 სპიკერი',
    barcode: '4751001000006',
    category_id: 'c4',
    purchase_price: 55.0,
    sale_price: 149.99,
    quantity: 12,
    photo_url: 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=300&h=300&fit=crop',
    created_at: '2024-02-06',
  },
  {
    id: 'p7',
    name: 'USB-C to Lightning კაბელი 2მ',
    barcode: '4751001000007',
    category_id: 'c5',
    purchase_price: 4.0,
    sale_price: 12.99,
    quantity: 60,
    photo_url: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=300&h=300&fit=crop',
    created_at: '2024-02-07',
  },
  {
    id: 'p8',
    name: 'iPhone 15 9H დამცავი მინა',
    barcode: '4751001000008',
    category_id: 'c6',
    purchase_price: 2.5,
    sale_price: 7.99,
    quantity: 80,
    photo_url: 'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=300&h=300&fit=crop',
    created_at: '2024-02-08',
  },
  {
    id: 'p9',
    name: 'Samsung S24 მატე ქეისი',
    barcode: '4751001000009',
    category_id: 'c11',
    purchase_price: 4.0,
    sale_price: 12.99,
    quantity: 3,
    photo_url: 'https://images.unsplash.com/photo-1601593346740-925612772716?w=300&h=300&fit=crop',
    created_at: '2024-02-09',
  },
  {
    id: 'p10',
    name: 'Apple AirPods Pro 2',
    barcode: '4751001000010',
    category_id: 'c3',
    purchase_price: 150.0,
    sale_price: 379.99,
    quantity: 2,
    photo_url: 'https://images.unsplash.com/photo-1588423771073-b8903fbb85b5?w=300&h=300&fit=crop',
    created_at: '2024-02-10',
  },
  {
    id: 'p11',
    name: 'Micro-USB კაბელი 1მ',
    barcode: '4751001000011',
    category_id: 'c5',
    purchase_price: 1.5,
    sale_price: 4.99,
    quantity: 120,
    photo_url: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=300&h=300&fit=crop',
    created_at: '2024-02-11',
  },
  {
    id: 'p12',
    name: 'Samsung A34 დამცავი მინა',
    barcode: '4751001000012',
    category_id: 'c6',
    purchase_price: 2.0,
    sale_price: 6.99,
    quantity: 35,
    photo_url: 'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=300&h=300&fit=crop',
    created_at: '2024-02-12',
  },
]

// ---- Sales (last 14 days) ----
function daysAgo(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString()
}

export const INITIAL_SALES: Sale[] = [
  { id: 's1', total: 44.98, payment_method: 'cash', items_count: 3, created_at: daysAgo(0) },
  { id: 's2', total: 299.99, payment_method: 'card', items_count: 1, created_at: daysAgo(0) },
  { id: 's3', total: 22.98, payment_method: 'cash', items_count: 2, created_at: daysAgo(1) },
  { id: 's4', total: 149.99, payment_method: 'card', items_count: 1, created_at: daysAgo(1) },
  { id: 's5', total: 62.97, payment_method: 'cash', items_count: 4, created_at: daysAgo(2) },
  { id: 's6', total: 379.99, payment_method: 'card', items_count: 1, created_at: daysAgo(2) },
  { id: 's7', total: 19.98, payment_method: 'cash', items_count: 2, created_at: daysAgo(3) },
  { id: 's8', total: 54.97, payment_method: 'card', items_count: 3, created_at: daysAgo(4) },
  { id: 's9', total: 34.99, payment_method: 'cash', items_count: 1, created_at: daysAgo(5) },
  { id: 's10', total: 199.98, payment_method: 'card', items_count: 2, created_at: daysAgo(6) },
  { id: 's11', total: 27.97, payment_method: 'cash', items_count: 3, created_at: daysAgo(7) },
  { id: 's12', total: 49.99, payment_method: 'card', items_count: 1, created_at: daysAgo(8) },
]

export const INITIAL_SALE_ITEMS: SaleItem[] = [
  { id: 'si1', sale_id: 's1', product_id: 'p1', product_name: 'Samsung A54 სილიკონის ქეისი', barcode: '4751001000001', quantity: 2, unit_price: 9.99, total_price: 19.98 },
  { id: 'si2', sale_id: 's1', product_id: 'p8', product_name: 'iPhone 15 9H დამცავი მინა', barcode: '4751001000008', quantity: 1, unit_price: 7.99, total_price: 7.99 },
  { id: 'si3', sale_id: 's1', product_id: 'p11', product_name: 'Micro-USB კაბელი 1მ', barcode: '4751001000011', quantity: 1, unit_price: 4.99, total_price: 4.99 },
  { id: 'si4', sale_id: 's2', product_id: 'p5', product_name: 'Sony WH-1000XM5 ყურსასმენი', barcode: '4751001000005', quantity: 1, unit_price: 299.99, total_price: 299.99 },
  { id: 'si5', sale_id: 's3', product_id: 'p7', product_name: 'USB-C to Lightning კაბელი 2მ', barcode: '4751001000007', quantity: 2, unit_price: 12.99, total_price: 25.98 },
  { id: 'si6', sale_id: 's4', product_id: 'p6', product_name: 'JBL Flip 6 სპიკერი', barcode: '4751001000006', quantity: 1, unit_price: 149.99, total_price: 149.99 },
]
