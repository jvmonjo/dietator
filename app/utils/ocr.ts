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
  location?: string
}

// Recognise the combined text of one or more images, reusing a single worker.
// Each image may be a data URL, a blob or any source tesseract.js accepts.
// `onProgress` receives 0..1 across all images.
export async function recognizeImages(
  images: (string | Blob)[],
  onProgress?: (progress: number) => void
): Promise<string> {
  if (images.length === 0) return ''
  const { createWorker } = await import('tesseract.js')
  let pageIndex = 0
  const worker = await createWorker(OCR_LANGS, 1, {
    logger: onProgress
      ? (m: { status: string, progress: number }) => {
          if (m.status === 'recognizing text') {
            onProgress((pageIndex + m.progress) / images.length)
          }
        }
      : undefined
  })
  try {
    const texts: string[] = []
    for (let i = 0; i < images.length; i++) {
      pageIndex = i
      const { data } = await worker.recognize(images[i]!)
      texts.push(data.text || '')
    }
    return texts.join('\n')
  } finally {
    await worker.terminate()
  }
}

// Recognise the raw text of a single image (convenience wrapper).
export async function recognizeText(
  image: string | Blob,
  onProgress?: (progress: number) => void
): Promise<string> {
  return recognizeImages([image], onProgress)
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

const hasAmount = (line: string) => Boolean(line.match(AMOUNT_RE))

const pad2 = (n: number) => String(n).padStart(2, '0')

// Extract the first plausible date, returning a datetime-local string. A time
// is included when present on the receipt, otherwise midday is used to avoid
// any day-shift surprises around time zones.
const parseDateParts = (year: number, month: number, day: number) => {
  if (year < 100) year += 2000
  if (month < 1 || month > 12 || day < 1 || day > 31) return undefined
  return { year, month, day }
}

const findNearestTime = (text: string, dateIndex: number, dateLength: number): RegExpMatchArray | null => {
  // Prefer a time printed on the same receipt line as the date; fall back to a
  // nearby time to handle OCR line breaks between date and hour labels.
  const lineStart = text.lastIndexOf('\n', dateIndex) + 1
  const nextBreak = text.indexOf('\n', dateIndex + dateLength)
  const lineEnd = nextBreak === -1 ? text.length : nextBreak
  const sameLine = text.slice(lineStart, lineEnd).match(/\b([01]?\d|2[0-3]):([0-5]\d)(?::[0-5]\d)?\b/)
  if (sameLine) return sameLine

  const windowStart = Math.max(0, dateIndex - 80)
  const windowEnd = Math.min(text.length, dateIndex + dateLength + 80)
  const windowText = text.slice(windowStart, windowEnd)
  const matches = Array.from(windowText.matchAll(/\b([01]?\d|2[0-3]):([0-5]\d)(?::[0-5]\d)?\b/g))
  const afterDate = matches.find(match => match.index != null && windowStart + match.index >= dateIndex + dateLength)
  if (afterDate) return afterDate
  return matches.reduce<RegExpMatchArray | null>((nearest, current) => {
    if (current.index == null) return nearest
    if (!nearest || nearest.index == null) return current
    const absoluteCurrent = windowStart + current.index
    const absoluteNearest = windowStart + nearest.index
    const currentDistance = Math.min(
      Math.abs(absoluteCurrent - dateIndex),
      Math.abs(absoluteCurrent - (dateIndex + dateLength))
    )
    const nearestDistance = Math.min(
      Math.abs(absoluteNearest - dateIndex),
      Math.abs(absoluteNearest - (dateIndex + dateLength))
    )
    return currentDistance < nearestDistance ? current : nearest
  }, null)
}

const extractDateTime = (text: string): string | undefined => {
  const patterns = [
    // yyyy-mm-dd / yyyy/mm/dd / yyyy.mm.dd
    { re: /\b(\d{4})[/.-](\d{1,2})[/.-](\d{1,2})\b/, order: 'ymd' },
    // dd/mm/yyyy, dd-mm-yyyy, dd.mm.yyyy (year 2 or 4 digits).
    { re: /\b(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})\b/, order: 'dmy' }
  ] as const

  for (const pattern of patterns) {
    const match = text.match(pattern.re)
    if (!match || match.index == null) continue

    const parts = pattern.order === 'ymd'
      ? parseDateParts(Number(match[1]), Number(match[2]), Number(match[3]))
      : parseDateParts(Number(match[3]), Number(match[2]), Number(match[1]))
    if (!parts) continue

    const time = findNearestTime(text, match.index, match[0].length)
    const hh = time ? pad2(Number(time[1])) : '12'
    const mm = time ? pad2(Number(time[2])) : '00'

    return `${parts.year}-${pad2(parts.month)}-${pad2(parts.day)}T${hh}:${mm}`
  }

  return undefined
}

// A receipt header line is usually the merchant name: letters, not a date or an
// amount, of a reasonable length. Pick the first such line near the top.
const extractDescription = (lines: string[]): string | undefined => {
  for (const line of lines.slice(0, 8)) {
    const letters = line.replace(/[^a-zA-ZÀ-ſ]/g, '')
    if (letters.length < 3) continue
    if (/\d{1,2}[/.-]\d{1,2}/.test(line)) continue // looks like a date
    if (hasAmount(line)) continue // looks like an amount
    const trimmed = line.trim()
    if (trimmed.length >= 3 && trimmed.length <= 60) return trimmed
  }
  return undefined
}

const LOCATION_KEYWORDS = [
  'c/', 'calle', 'carrer', 'avenida', 'avinguda', 'avda', 'av.', 'plaza', 'plaça',
  'paseo', 'passeig', 'ronda', 'carretera', 'ctra', 'poligono', 'polígono', 'local'
]

const looksLikeReceiptMetadata = (line: string) => {
  const normalized = stripAccents(line.toLowerCase())
  return normalized.includes('fecha')
    || normalized.includes('date')
    || normalized.includes('hora')
    || normalized.includes('time')
    || TOTAL_KEYWORDS.some(keyword => normalized.includes(keyword))
}

const extractLocation = (lines: string[]): string | undefined => {
  for (const line of lines.slice(0, 12)) {
    const trimmed = line.trim()
    if (trimmed.length < 4 || trimmed.length > 90) continue
    if (looksLikeReceiptMetadata(trimmed)) continue
    if (hasAmount(trimmed)) continue

    const normalized = stripAccents(trimmed.toLowerCase())
    const hasAddressKeyword = LOCATION_KEYWORDS.some(keyword => normalized.includes(stripAccents(keyword)))
    const hasPostalCode = /\b\d{5}\b/.test(trimmed)
    const hasAddressNumber = /\b\d{1,4}\b/.test(trimmed) && /[a-zA-ZÀ-ſ]/.test(trimmed)
    if (hasAddressKeyword || hasPostalCode || hasAddressNumber) return trimmed
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
    description: extractDescription(lines),
    location: extractLocation(lines)
  }
}
