import { useEffect, useRef } from 'react'

interface UseBarcodeScannerOptions {
  onScan: (barcode: string) => void
  disabled?: boolean
  /** Max ms between keystrokes to be considered a scanner (not human). Default: 30ms */
  timeout?: number
}

export function useBarcodeScanner({ onScan, disabled = false, timeout = 30 }: UseBarcodeScannerOptions) {
  const barcodeBuffer = useRef('')
  const lastKeyTime   = useRef(Date.now())
  // Keep onScan in a ref so we never need to re-register the event listener on every render
  const onScanRef = useRef(onScan)
  onScanRef.current = onScan

  useEffect(() => {
    if (disabled) return

    const handleKeyDown = (e: KeyboardEvent) => {
      const currentTime = Date.now()
      const timeDiff    = currentTime - lastKeyTime.current

      // Reset buffer if gap between keystrokes is too long — human typing, not scanner
      if (timeDiff > timeout) {
        barcodeBuffer.current = ''
      }

      if (e.key.length === 1) {
        // Printable character — accumulate
        barcodeBuffer.current += e.key
      } else if (e.key === 'Enter') {
        const barcode = barcodeBuffer.current.trim()

        if (barcode.length > 2) {
          // Prevent Enter from submitting a focused form/button
          e.preventDefault()
          onScanRef.current(barcode)
        }

        barcodeBuffer.current = ''
      }

      lastKeyTime.current = currentTime
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [disabled, timeout]) // onScan intentionally omitted — handled via ref above
}
