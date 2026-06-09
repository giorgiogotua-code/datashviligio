// ─────────────────────────────────────────────────────────────────────────────
//  Fiscalization adapter — Daisy eXpert via ErpNet.FP
//
//  Device: Daisy eXpert (Daisy protocol "bg.dy.isl"), USB/COM at the cashier,
//  registered directly with RS.ge.
//
//  We do NOT speak the raw Daisy binary protocol. Instead we drive the free,
//  open-source local bridge **ErpNet.FP** (https://github.com/erpnet/ErpNet.FP),
//  a small HTTP server that runs on the cashier PC, auto-detects the device over
//  USB, and exposes a clean JSON REST API on http://localhost:8001. The browser
//  POS calls it directly (Chrome treats http://localhost as a secure origin, so
//  this also works from the deployed HTTPS site).
//
//  ⚠️ TO VERIFY ON THE REAL DEVICE (likely first tweaks during on-site testing):
//    • TAX_GROUP — must match how the Daisy is programmed for Georgian VAT (18%).
//    • USN — Bulgarian ErpNet.FP wants a unique-sale-number; the Georgian Daisy
//      may auto-number. We only send one if NEXT_PUBLIC_FISCAL_USN_PREFIX is set.
//    • Whether ErpNet.FP fully supports the Georgian Daisy firmware; if not, the
//      fallback is GSN's local driver / the documented Georgian PC protocol.
//  Everything else in the app stays the same — this file is the only seam.
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
  fiscalId: string // receipt number from the device
  qrUrl?: string | null
  raw: Record<string, unknown>
}

export type FiscalReportType = 'Z' | 'X'

export interface FiscalReportResult {
  reportId?: string | null
  raw: Record<string, unknown>
}

export interface FiscalProvider {
  readonly id: string
  isConfigured(): boolean
  issueReceipt(input: FiscalReceiptInput): Promise<FiscalResult>
  printReport(type: FiscalReportType): Promise<FiscalReportResult>
}

// ── Config (overridable via env) ─────────────────────────────────────────────
const BRIDGE_URL = (process.env.NEXT_PUBLIC_FISCAL_BRIDGE_URL || 'http://localhost:8001').replace(/\/$/, '')
const PRINTER_ID_OVERRIDE = process.env.NEXT_PUBLIC_FISCAL_PRINTER_ID || ''
const TAX_GROUP = Number(process.env.NEXT_PUBLIC_FISCAL_TAX_GROUP || '1')
const USN_PREFIX = process.env.NEXT_PUBLIC_FISCAL_USN_PREFIX || ''

// ErpNet.FP returns ok as the string "true"/"false" (older builds) or a boolean.
function isOk(data: Record<string, unknown>): boolean {
  return data.ok === true || data.ok === 'true'
}

function messagesOf(data: Record<string, unknown>): string {
  const msgs = data.messages
  if (Array.isArray(msgs)) {
    return msgs.map((m) => (m && typeof m === 'object' ? (m as any).text : String(m))).filter(Boolean).join('; ')
  }
  return ''
}

let cachedPrinterId: string | null = null

class ErpNetFpProvider implements FiscalProvider {
  readonly id = 'erpnet-fp'

  isConfigured() {
    return BRIDGE_URL.length > 0
  }

  private async request(path: string, body?: unknown): Promise<Record<string, unknown>> {
    let res: Response
    try {
      res = await fetch(`${BRIDGE_URL}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body ?? {}),
      })
    } catch {
      throw new FiscalError('network_error', 'ფისკალურ აპარატთან კავშირი ვერ დამყარდა (ErpNet.FP გაშვებულია?)')
    }
    if (!res.ok) {
      throw new FiscalError('device_error', `ფისკალურმა აპარატმა დააბრუნა შეცდომა (${res.status})`)
    }
    const data = (await res.json()) as Record<string, unknown>
    if (!isOk(data)) {
      throw new FiscalError('device_error', messagesOf(data) || 'ფისკალურმა აპარატმა დაარეჯექტა ოპერაცია')
    }
    return data
  }

  /** Resolve the printerId once (env override, else first device ErpNet.FP found). */
  private async getPrinterId(): Promise<string> {
    if (PRINTER_ID_OVERRIDE) return PRINTER_ID_OVERRIDE
    if (cachedPrinterId) return cachedPrinterId
    let res: Response
    try {
      res = await fetch(`${BRIDGE_URL}/printers`)
    } catch {
      throw new FiscalError('network_error', 'ფისკალურ აპარატთან კავშირი ვერ დამყარდა (ErpNet.FP გაშვებულია?)')
    }
    if (!res.ok) throw new FiscalError('device_error', `აპარატების სია ვერ წამოვიდა (${res.status})`)
    const printers = (await res.json()) as Record<string, unknown>
    const ids = Object.keys(printers)
    if (ids.length === 0) throw new FiscalError('device_error', 'ფისკალური აპარატი ვერ მოიძებნა')
    cachedPrinterId = ids[0]
    return cachedPrinterId
  }

  async issueReceipt(input: FiscalReceiptInput): Promise<FiscalResult> {
    if (!this.isConfigured()) {
      throw new FiscalError('not_configured', 'ფისკალური აპარატი არ არის კონფიგურირებული')
    }
    const printerId = await this.getPrinterId()

    const body: Record<string, unknown> = {
      items: input.items.map((i) => ({
        text: i.name,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        taxGroup: TAX_GROUP,
      })),
      payments: [{ amount: input.total, paymentType: input.paymentMethod }],
    }
    if (USN_PREFIX) {
      // Bulgarian-style unique sale number; only sent when explicitly configured.
      body.uniqueSaleNumber = `${USN_PREFIX}-${input.saleId.replace(/\D/g, '').slice(0, 7).padStart(7, '0')}`
    }

    const data = await this.request(`/printers/${printerId}/receipt`, body)
    const fiscalId = (data.receiptNumber as string) ?? ''
    if (!fiscalId) throw new FiscalError('device_error', 'აპარატმა ჩეკის ნომერი არ დააბრუნა')
    return { fiscalId, qrUrl: null, raw: data }
  }

  async printReport(type: FiscalReportType): Promise<FiscalReportResult> {
    if (!this.isConfigured()) {
      throw new FiscalError('not_configured', 'ფისკალური აპარატი არ არის კონფიგურირებული')
    }
    const printerId = await this.getPrinterId()
    const path = type === 'Z' ? 'zreport' : 'xreport'
    const data = await this.request(`/printers/${printerId}/${path}`)
    return { reportId: (data.receiptNumber as string) ?? null, raw: data }
  }
}

let provider: FiscalProvider | null = null

export function getFiscalProvider(): FiscalProvider {
  if (!provider) provider = new ErpNetFpProvider()
  return provider
}

export function issueFiscalReceipt(input: FiscalReceiptInput): Promise<FiscalResult> {
  return getFiscalProvider().issueReceipt(input)
}

export function printFiscalReport(type: FiscalReportType): Promise<FiscalReportResult> {
  return getFiscalProvider().printReport(type)
}

export function isFiscalConfigured(): boolean {
  return getFiscalProvider().isConfigured()
}
