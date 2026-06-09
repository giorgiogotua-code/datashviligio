"use client"

import { useState } from 'react'
import { CategoryTree } from '@/components/warehouse/category-tree'
import { ProductList } from '@/components/warehouse/product-list'

export default function WarehousePage() {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null)

  return (
    <div className="flex gap-5 h-full min-h-0">
      <CategoryTree selectedId={selectedCategoryId} onSelect={setSelectedCategoryId} />
      <ProductList selectedCategoryId={selectedCategoryId} />
    </div>
  )
}
