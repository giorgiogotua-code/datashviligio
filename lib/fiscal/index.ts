// ─────────────────────────────────────────────────────────────────────────────
//  Fiscalization adapter (RS.GE cash register)
//
//  Topology: the fiscal device sits at the cashier (USB) with a small LOCAL
//  driver/service. The browser cannot touch USB directly, so the POS talks to
//  that local service over http://localhost:<port>. This module is the single
//  seam where the device-specific protocol lives — swap `toDevicePayload` /
//  `fromDeviceResponse` for your exact model (Tremol / Datecs / ORIS / Eltrade …)
//  and nothing else in the app changes.
// ─────────────────────────────────────────────────────────────────────────────

export type FiscalErrorCode = 'not_configured' | 'device_error' | 'network_error'

export class FiscalError extends Error {
  code: FiscalErrorCode
  constructor(code: FiscalErrorCode, message: string) {
    super(message)
    this.code = code
    this.name = 'FiscalError'
  }
}

export interface FiscalLineItem {
  name: string
  quantity: number
  unitPrice: number // GEL
  total: number // GEL
  barcode?: string | null
}

export interface FiscalReceiptInput {
  saleId: string
  items: FiscalLineItem[]
  total: number
  paymentMethod: 'cash' | 'card'
}

export interface FiscalResult {
  fiscalId: string // receipt number returned by the device
  qrUrl?: string | null // RS verification link / QR payload, if the device returns one
  raw: Record<string, unknown> // full device response, stored for audit
}

export type FiscalReportType = 'Z' | 'X'

export interface FiscalReportResult {
  reportId?: string | null // report number from the device, if any
  raw: Record<string, unknown> // full device response (totals, counters, ...)
}

export interface FiscalProvider {
  readonly id: string
  isConfigured(): boolean
  issueReceipt(input: FiscalReceiptInput): Promise<FiscalResult>
  /** Z = close the fiscal day (resets counters); X = read-only daily totals. */
  printReport(type: FiscalReportType): Promise<FiscalReportResult>
}

// URL of the local fiscal bridge running on the cashier machine, e.g. http://localhost:7000
const BRIDGE_URL = process.env.NEXT_PUBLIC_FISCAL_BRIDGE_URL?.replace(/\/$/, '') ?? ''

// ⚠️ DEVICE-SPECIFIC — replace once the device model is known.
// Map our normalized receipt into whatever JSON the device's local driver expects.
function toDevicePayload(input: FiscalReceiptInput): unknown {
  return {
    operation: 'sale',
    payment: input.paymentMethod, // 'cash' | 'card'
    items: input.items.map((i) => ({
      name: i.name,
      quantity: i.quantity,
      price: i.unitPrice,
      amount: i.total,
      barcode: i.barcode ?? undefined,
    })),
    total: input.total,
    externalId: input.saleId,
  }
}

// ⚠️ DEVICE-SPECIFIC — replace once the device model is known.
// Parse the device's response into our normalized FiscalResult.
function fromDeviceResponse(data: Record<string, unknown>): FiscalResult {
  const fiscalId =
    (data.receiptId as string) ??
    (data.fiscalId as string) ??
    (data.number as string) ??
    ''
  if (!fiscalId) {
    throw new FiscalError('device_error', 'ფისკალურმა აპარატმა ჩეკის ნომერი არ დააბრუნა')
  }
  return {
    fiscalId,
    qrUrl: (data.qrUrl as string) ?? (data.qr as string) ?? null,
    raw: data,
  }
}

class LocalBridgeProvider implements FiscalProvider {
  readonly id = 'local-bridge'

  isConfigured() {
    return BRIDGE_URL.length > 0
  }

  async issueReceipt(input: FiscalReceiptInput): Promise<FiscalResult> {
    if (!this.isConfigured()) {
      throw new FiscalError(
        'not_configured',
        'ფისკალური აპარატი არ არის კონფიგურირებული (NEXT_PUBLIC_FISCAL_BRIDGE_URL)'
      )
    }

    let res: Response
    try {
      res = await fetch(`${BRIDGE_URL}/receipt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(toDevicePayload(input)),
      })
    } catch {
      throw new FiscalError('network_error', 'ფისკალურ აპარატთან კავშირი ვერ დამყარდა')
    }

    if (!res.ok) {
      throw new FiscalError('device_error', `ფისკალურმა აპარატმა დააბრუნა შეცდომა (${res.status})`)
    }

    const data = (await res.json()) as Record<string, unknown>
    return fromDeviceResponse(data)
  }

  async printReport(type: FiscalReportType): Promise<FiscalReportResult> {
    if (!this.isConfigured()) {
      throw new FiscalError(
        'not_configured',
        'ფისკალური აპარატი არ არის კონფიგურირებული (NEXT_PUBLIC_FISCAL_BRIDGE_URL)'
      )
    }

    // ⚠️ DEVICE-SPECIFIC — endpoint/payload depend on the device's local driver.
    const path = type === 'Z' ? '/z-report' : '/x-report'
    let res: Response
    try {
      res = await fetch(`${BRIDGE_URL}${path}`, { method: 'POST' })
    } catch {
      throw new FiscalError('network_error', 'ფისკალურ აპარატთან კავშირი ვერ დამყარდა')
    }
    if (!res.ok) {
      throw new FiscalError('device_error', `ფისკალურმა აპარატმა დააბრუნა შეცდომა (${res.status})`)
    }
    const data = (await res.json()) as Record<string, unknown>
    return { reportId: (data.reportId as string) ?? (data.number as string) ?? null, raw: data }
  }
}

let provider: FiscalProvider | null = null

export function getFiscalProvider(): FiscalProvider {
  if (!provider) provider = new LocalBridgeProvider()
  return provider
}

/** Convenience wrapper used by the POS. */
export function issueFiscalReceipt(input: FiscalReceiptInput): Promise<FiscalResult> {
  return getFiscalProvider().issueReceipt(input)
}

/** Z = close the fiscal day; X = mid-day read. */
export function printFiscalReport(type: FiscalReportType): Promise<FiscalReportResult> {
  return getFiscalProvider().printReport(type)
}

export function isFiscalConfigured(): boolean {
  return getFiscalProvider().isConfigured()
}
