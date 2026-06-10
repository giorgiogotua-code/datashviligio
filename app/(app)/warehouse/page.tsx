"use client"

import { useState } from 'react'
import { CategoryTree } from '@/components/warehouse/category-tree'
import { ProductList } from '@/components/warehouse/product-list'

export default function WarehousePage() {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null)
  const [mobileCatsOpen, setMobileCatsOpen] = useState(false)

  return (
    <div className="flex gap-5 h-full min-h-0">
      {/* Desktop sidebar */}
      <div className="hidden md:flex shrink-0">
        <CategoryTree selectedId={selectedCategoryId} onSelect={setSelectedCategoryId} />
      </div>

      {/* Mobile drawer overlay */}
      {mobileCatsOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setMobileCatsOpen(false)}
          />
          <div className="relative z-10 w-[85vw] max-w-[320px] h-full overflow-y-auto">
            <CategoryTree
              selectedId={selectedCategoryId}
              onSelect={(id) => { setSelectedCategoryId(id); setMobileCatsOpen(false) }}
            />
          </div>
        </div>
      )}

      <ProductList
        selectedCategoryId={selectedCategoryId}
        onOpenMobileCategories={() => setMobileCatsOpen(true)}
      />
    </div>
  )
}
