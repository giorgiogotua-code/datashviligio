import { Sidebar } from '@/components/sidebar'
import { TopHeader } from '@/components/top-header'
import { PinLock } from '@/components/pin-lock'
import { StoreHydrator } from '@/components/store-hydrator'
import { AuroraBackground } from '@/components/aurora-bg'
import { TrialBanner } from '@/components/trial-banner'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <StoreHydrator>
      <AuroraBackground />
      <PinLock />
      <div className="flex h-screen overflow-hidden p-3 md:p-4 gap-3 md:gap-4 relative z-0">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden gap-3 md:gap-4">
          <TopHeader />
          <TrialBanner />
          <main className="flex-1 overflow-y-auto floating-panel rounded-3xl p-5 lg:p-6">
            {children}
          </main>
        </div>
      </div>
    </StoreHydrator>
  )
}
