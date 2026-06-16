// Bundle a selection of expenses into a single shareable archive: a CSV summary,
// a JSON copy of the records and every attached ticket file. The archive is
// shared through the Web Share API when available (mobile), falling back to a
// plain download otherwise.
import JSZip from 'jszip'
import { saveAs } from 'file-saver'
import type { ExpenseRecord } from '~/stores/expenses'
import { resolveExpenseCategory } from '~/utils/expenseCategories'

export type ShareOutcome = 'shared' | 'downloaded' | 'cancelled' | 'empty'

interface ShareOptions {
  locale: string
  // Human label for each category value, e.g. t('expenses.categories.<value>').
  categoryLabel: (category: string) => string
  // Title shown in the share sheet / used to derive the file name.
  title?: string
}

// Decode a data URL into raw bytes so it can be written into the zip as a file.
// (Uint8Array is accepted by JSZip in every environment, unlike Blob.)
const dataUrlToBytes = (dataUrl: string): Uint8Array => {
  const base64 = dataUrl.slice(dataUrl.indexOf(',') + 1)
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

const extensionFor = (type?: string, name?: string): string => {
  const fromName = name?.match(/\.([a-z0-9]+)$/i)?.[1]
  if (fromName) return fromName.toLowerCase()
  if (type === 'application/pdf') return 'pdf'
  if (type?.startsWith('image/')) return type.slice('image/'.length)
  return 'bin'
}

// Make a file-system-safe, reasonably short slug for ticket file names.
const slugify = (value: string): string =>
  value
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
    .toLowerCase() || 'expense'

const csvField = (value: string): string => {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`
  return value
}

const sortByDate = (expenses: ExpenseRecord[]) =>
  expenses.slice().sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())

// Build the zip archive (summary + JSON + tickets) for the given expenses.
export async function buildExpensesArchive(
  expenses: ExpenseRecord[],
  options: ShareOptions
): Promise<{ blob: Blob, filename: string } | null> {
  if (expenses.length === 0) return null

  const ordered = sortByDate(expenses)
  const zip = new JSZip()

  const dateFormatter = new Intl.DateTimeFormat(options.locale, { dateStyle: 'short', timeStyle: 'short' })
  const currencyFormatter = new Intl.NumberFormat(options.locale, { style: 'currency', currency: 'EUR' })

  const header = ['date', 'description', 'category', 'amount', 'attachment']
  const rows = [header.map(csvField).join(',')]
  const usedNames = new Set<string>()

  ordered.forEach((expense, index) => {
    let attachmentName = ''
    if (expense.ticket) {
      const ext = extensionFor(expense.ticketType, expense.ticketName)
      const base = `${String(index + 1).padStart(2, '0')}-${slugify(expense.description)}`
      let candidate = `${base}.${ext}`
      // Avoid name collisions inside the tickets/ folder.
      let suffix = 1
      while (usedNames.has(candidate)) {
        candidate = `${base}-${++suffix}.${ext}`
      }
      usedNames.add(candidate)
      attachmentName = candidate
      try {
        zip.file(`tickets/${candidate}`, dataUrlToBytes(expense.ticket))
      } catch {
        attachmentName = '' // Skip an unreadable ticket but keep the row.
      }
    }

    const date = new Date(expense.timestamp)
    const dateLabel = Number.isNaN(date.getTime()) ? '' : dateFormatter.format(date)
    const category = options.categoryLabel(resolveExpenseCategory(expense))
    rows.push([
      dateLabel,
      expense.description,
      category,
      currencyFormatter.format(expense.amount || 0),
      attachmentName
    ].map(csvField).join(','))
  })

  // BOM so spreadsheets open the CSV as UTF-8.
  zip.file('expenses.csv', '﻿' + rows.join('\n'))

  const total = ordered.reduce((sum, e) => sum + (e.amount || 0), 0)
  const jsonPayload = {
    meta: {
      type: 'expenses',
      version: 1,
      count: ordered.length,
      total,
      exportedAt: new Date().toISOString()
    },
    expenses: ordered
  }
  zip.file('expenses.json', JSON.stringify(jsonPayload, null, 2))

  const blob = await zip.generateAsync({ type: 'blob' })
  const today = new Date().toISOString().split('T')[0]
  const filename = `dietator-despeses-${today}.zip`
  return { blob, filename }
}

// Share (or download) the archive for the given expenses. Returns the outcome
// so the caller can surface an appropriate toast.
export async function shareExpenses(
  expenses: ExpenseRecord[],
  options: ShareOptions
): Promise<ShareOutcome> {
  const archive = await buildExpensesArchive(expenses, options)
  if (!archive) return 'empty'

  const { blob, filename } = archive
  const file = new File([blob], filename, { type: blob.type })

  const nav = navigator as Navigator & { canShare?: (data?: ShareData) => boolean }
  if (nav.canShare && nav.canShare({ files: [file] })) {
    try {
      await nav.share({ files: [file], title: options.title })
      return 'shared'
    } catch (error) {
      if ((error as Error).name === 'AbortError') return 'cancelled'
      // Any other failure falls through to a download.
    }
  }

  saveAs(blob, filename)
  return 'downloaded'
}
