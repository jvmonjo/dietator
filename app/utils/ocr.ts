// Client-side OCR for receipts/tickets. Runs entirely in the browser with
// tesseract.js (no backend, keeps the app's privacy model) and extracts the
// fields the expense form needs: amount, date and a likely description.
//
// tesseract.js is heavy and downloads a language model on first use, so it is
// imported lazily — only when the user explicitly asks to scan a ticket.

// Languages to load. Spanish + English cover most receipts in Spain; numbers
// and dates are largely language-agnostic.
const OCR_LANGS = 'spa+eng'

export interface ParsedReceipt {
  amount?: number
  // Local datetime-local value (YYYY-MM-DDTHH:mm) ready for the form input.
  dateTime?: string
  description?: string
}

// Recognise the raw text of an image. `image` may be a data URL, a blob or any
// source tesseract.js accepts. `onProgress` receives 0..1 during recognition.
export async function recognizeText(
  image: string | Blob,
  onProgress?: (progress: number) => void
): Promise<string> {
  const { createWorker } = await import('tesseract.js')
  const worker = await createWorker(OCR_LANGS, 1, {
    logger: onProgress
      ? (m: { status: string, progress: number }) => {
          if (m.status === 'recognizing text') onProgress(m.progress)
        }
      : undefined
  })
  try {
    const { data } = await worker.recognize(image)
    return data.text || ''
  } finally {
    await worker.terminate()
  }
}

// Matches a monetary value like 12,34 / 1.234,56 / 12.34 / 1,234.56 with two
// decimals. The decimal separator is the last '.' or ',' in the token.
const AMOUNT_RE = /\d{1,3}(?:[.,\s]\d{3})*[.,]\d{2}(?!\d)|\d+[.,]\d{2}(?!\d)/g

// Keywords (case-insensitive, accent-insensitive) that mark the line holding
// the total to pay. Ordered roughly by how decisive they are.
const TOTAL_KEYWORDS = [
  'total a pagar', 'importe total', 'import total', 'total importe',
  'a pagar', 'total euro', 'total eur', 'total', 'import', 'importe', 'suma'
]

const stripAccents = (value: string) =>
  value.normalize('NFD').replace(/[̀-ͯ]/g, '')

// Turn a matched amount token into a number, honouring European (comma) and
// English (dot) decimal separators plus thousands separators.
const parseAmountToken = (token: string): number | undefined => {
  const cleaned = token.replace(/\s/g, '')
  const lastDot = cleaned.lastIndexOf('.')
  const lastComma = cleaned.lastIndexOf(',')
  const decimalSep = lastDot > lastComma ? '.' : ','
  const thousandSep = decimalSep === '.' ? ',' : '.'
  const normalized = cleaned
    .split(thousandSep).join('')
    .replace(decimalSep, '.')
  const value = Number.parseFloat(normalized)
  return Number.isFinite(value) ? value : undefined
}

const extractAmount = (lines: string[]): number | undefined => {
  const candidates: { value: number, keyword: boolean }[] = []
  for (const line of lines) {
    const normalized = stripAccents(line.toLowerCase())
    const hasKeyword = TOTAL_KEYWORDS.some(k => normalized.includes(k))
    const matches = line.match(AMOUNT_RE)
    if (!matches) continue
    for (const token of matches) {
      const value = parseAmountToken(token)
      if (value !== undefined && value > 0) candidates.push({ value, keyword: hasKeyword })
    }
  }
  if (candidates.length === 0) return undefined
  // Prefer the largest value on a "total" line; otherwise the largest value
  // overall (the grand total is almost always the biggest number on a ticket).
  const keyworded = candidates.filter(c => c.keyword)
  const pool = keyworded.length ? keyworded : candidates
  return pool.reduce((max, c) => (c.value > max ? c.value : max), 0)
}

const pad2 = (n: number) => String(n).padStart(2, '0')

// Extract the first plausible date, returning a datetime-local string. A time
// is included when present on the receipt, otherwise midday is used to avoid
// any day-shift surprises around time zones.
const extractDateTime = (text: string): string | undefined => {
  // dd/mm/yyyy, dd-mm-yyyy, dd.mm.yyyy (year 2 or 4 digits).
  const dmy = text.match(/\b(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})\b/)
  // yyyy-mm-dd
  const ymd = text.match(/\b(\d{4})[/.-](\d{1,2})[/.-](\d{1,2})\b/)

  let year: number | undefined
  let month: number | undefined
  let day: number | undefined

  if (ymd) {
    year = Number(ymd[1]); month = Number(ymd[2]); day = Number(ymd[3])
  } else if (dmy) {
    day = Number(dmy[1]); month = Number(dmy[2])
    year = Number(dmy[3])
    if (year < 100) year += 2000
  }

  if (!year || !month || !day) return undefined
  if (month < 1 || month > 12 || day < 1 || day > 31) return undefined

  // Optional time (HH:mm or HH:mm:ss).
  const time = text.match(/\b([01]?\d|2[0-3]):([0-5]\d)(?::[0-5]\d)?\b/)
  const hh = time ? pad2(Number(time[1])) : '12'
  const mm = time ? pad2(Number(time[2])) : '00'

  return `${year}-${pad2(month)}-${pad2(day)}T${hh}:${mm}`
}

// A receipt header line is usually the merchant name: letters, not a date or an
// amount, of a reasonable length. Pick the first such line near the top.
const extractDescription = (lines: string[]): string | undefined => {
  for (const line of lines.slice(0, 8)) {
    const letters = line.replace(/[^a-zA-ZÀ-ſ]/g, '')
    if (letters.length < 3) continue
    if (/\d{1,2}[/.-]\d{1,2}/.test(line)) continue // looks like a date
    if (AMOUNT_RE.test(line)) continue // looks like an amount
    const trimmed = line.trim()
    if (trimmed.length >= 3 && trimmed.length <= 60) return trimmed
  }
  return undefined
}

// Parse OCR text into the fields the expense form can prefill.
export function parseReceiptText(text: string): ParsedReceipt {
  const lines = text
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(Boolean)

  return {
    amount: extractAmount(lines),
    dateTime: extractDateTime(text),
    description: extractDescription(lines)
  }
}
