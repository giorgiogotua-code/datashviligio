import { Sidebar } from '@/components/sidebar'
import { TopHeader } from '@/components/top-header'
import { PinLock } from '@/components/pin-lock'
import { StoreHydrator } from '@/components/store-hydrator'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <StoreHydrator>
      <PinLock />
      <div className="flex h-screen overflow-hidden mesh-bg p-3 md:p-4 gap-3 md:gap-4">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden gap-3 md:gap-4">
          <TopHeader />
          <main className="flex-1 overflow-y-auto floating-panel rounded-3xl p-5 lg:p-6">
            {children}
          </main>
        </div>
      </div>
    </StoreHydrator>
  )
}
