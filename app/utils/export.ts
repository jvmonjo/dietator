import JSZip from 'jszip'
import { saveAs } from 'file-saver'
import type { MonthOption, ServiceTotals } from '~/composables/useServiceStats'
import type { ServiceRecord } from '~/stores/services'
import type { TemplateFile } from '~/stores/settings'

type TemplateValue = string | number | boolean | Date | null | undefined

interface TemplateContext {
  variables: Record<string, TemplateValue>
  loops?: Record<string, TemplateContext[]>
  parent?: TemplateContext
}

interface ExportSettings {
  halfDietPrice: number
  fullDietPrice: number
}

interface GenerateWordReportOptions {
  records: ServiceRecord[]
  totals: ServiceTotals
  month: MonthOption
  settings: ExportSettings
  templates: {
    monthly?: TemplateFile | null
    service?: TemplateFile | null
  }
}

interface ServiceDocumentContext {
  context: TemplateContext
  reference: string
}

const HUMAN_DATE_FORMATTER = new Intl.DateTimeFormat('ca-ES', {
  day: 'numeric',
  month: 'long',
  year: 'numeric'
})

const CURRENCY_FORMATTER = new Intl.NumberFormat('ca-ES', {
  style: 'currency',
  currency: 'EUR'
})

const LOOP_REGEX = /\[loop:([a-z0-9_]+)\]([\s\S]*?)\[endloop:\1\]/gi
const IF_REGEX = /\[if:([a-z0-9_]+)\]([\s\S]*?)\[endif:\1\]/gi
const VARIABLE_REGEX = /\[([a-z0-9_]+)(?::([a-z0-9_]+))?\]/gi

export const generateWordReport = async (options: GenerateWordReportOptions) => {
  const { templates } = options
  const { monthly, service } = templates

  const tasks: Promise<void>[] = []
  const { monthlyContext, serviceDocuments } = buildContexts(options)

  if (monthly && monthlyContext) {
    tasks.push(fillTemplateAndDownload(monthly, monthlyContext, `dietator-mensual-${options.month.value}.docx`))
  }

  if (service && serviceDocuments.length > 0) {
    serviceDocuments.forEach((doc) => {
      tasks.push(fillTemplateAndDownload(service, doc.context, `dietator-servei-${doc.reference}.docx`))
    })
  }

  await Promise.all(tasks)
}

const buildContexts = (options: GenerateWordReportOptions) => {
  const { records, totals, month, settings } = options
  const monthlyDisplacements: TemplateContext[] = []
  const serviceDocuments: ServiceDocumentContext[] = []
  const serviceContexts: TemplateContext[] = []

  const totalDisplacements = records.reduce((sum, record) => sum + record.displacements.length, 0)
  const laborDays = getPreviousWorkingDays(month.value, 3)

  const globalVariables: TemplateContext['variables'] = {
    half_diet_price: CURRENCY_FORMATTER.format(settings.halfDietPrice || 0),
    half_diet_price_value: settings.halfDietPrice,
    full_diet_price: CURRENCY_FORMATTER.format(settings.fullDietPrice || 0),
    full_diet_price_value: settings.fullDietPrice,
    current_month_label: month.label,
    current_month_key: month.value,
    month_service_count: totals.serviceCount,
    month_displacement_count: totalDisplacements,
    month_lunches: totals.lunches,
    month_dinners: totals.dinners,
    month_half_diets: totals.halfDietCount,
    month_full_diets: totals.fullDietCount,
    month_diet_units: totals.dietUnits.toString(),
    month_allowance: CURRENCY_FORMATTER.format(totals.allowance || 0),
    month_allowance_value: totals.allowance,
    previous_month_last_working_day: laborDays[0]?.iso ?? '',
    previous_month_last_working_day_human: laborDays[0]?.human ?? '',
    previous_month_last_working_day_minus_1: laborDays[1]?.iso ?? '',
    previous_month_last_working_day_minus_1_human: laborDays[1]?.human ?? '',
    previous_month_last_working_day_minus_2: laborDays[2]?.iso ?? '',
    previous_month_last_working_day_minus_2_human: laborDays[2]?.human ?? ''
  }

  let monthDisplacementIndex = 1

  records.forEach((record, recordIndex) => {
    const serviceVariables = buildServiceVariables(record, recordIndex, settings)
    const displacementContexts = record.displacements.map((displacement, displacementIndex) => {
      const displacementVars = buildDisplacementVariables(displacement, displacementIndex, serviceVariables)
      const context: TemplateContext = {
        variables: displacementVars
      }
      monthlyDisplacements.push({
        variables: {
          ...displacementVars,
          month_index: monthDisplacementIndex++,
          service_index: serviceVariables.service_index,
          service_reference: serviceVariables.service_reference,
          service_id: record.id,
          service_start_date: serviceVariables.service_start_date
        }
      })
      return context
    })

    const serviceContext: TemplateContext = {
      variables: serviceVariables,
      loops: {
        service_displacements: displacementContexts
      }
    }
    serviceContexts.push(serviceContext)
    serviceDocuments.push({
      reference: serviceVariables.service_reference,
      context: {
        variables: {
          ...globalVariables,
          ...serviceVariables
        },
        loops: {
          service_displacements: displacementContexts
        }
      }
    })
  })

  const monthlyContext: TemplateContext = {
    variables: globalVariables,
    loops: {
      services: serviceContexts,
      month_displacements: monthlyDisplacements
    }
  }

  return {
    monthlyContext,
    serviceDocuments
  }
}

const buildServiceVariables = (record: ServiceRecord, recordIndex: number, settings: ExportSettings) => {
  const start = new Date(record.startTime)
  const end = new Date(record.endTime)
  const startDate = formatLocalDate(start)
  const endDate = formatLocalDate(end)
  const startTime = formatLocalTime(start)
  const endTime = formatLocalTime(end)
  const durationHours = calculateDuration(start, end)
  const lunches = record.displacements.filter(d => d.hasLunch).length
  const dinners = record.displacements.filter(d => d.hasDinner).length
  const serviceHasLunch = lunches > 0
  const serviceHasDinner = dinners > 0
  const fullDiets = serviceHasLunch && serviceHasDinner ? 1 : 0
  const halfDiets = !fullDiets && (serviceHasLunch || serviceHasDinner) ? 1 : 0
  const allowance = (fullDiets * settings.fullDietPrice) + (halfDiets * settings.halfDietPrice)

  return {
    service_index: recordIndex + 1,
    service_id: record.id,
    service_reference: buildServiceReference(startDate, recordIndex),
    service_start_date: startDate,
    service_end_date: endDate,
    service_start_time: startTime,
    service_end_time: endTime,
    service_start_iso: record.startTime,
    service_end_iso: record.endTime,
    service_duration_hours: durationHours,
    service_displacement_count: record.displacements.length,
    service_half_diets: halfDiets,
    service_full_diets: fullDiets,
    service_lunches: lunches,
    service_dinners: dinners,
    service_total_lunches: lunches,
    service_total_dinners: dinners,
    service_total_allowance: CURRENCY_FORMATTER.format(allowance || 0),
    service_total_allowance_value: allowance
  }
}

const buildDisplacementVariables = (
  displacement: ServiceRecord['displacements'][number],
  displacementIndex: number,
  serviceVariables: ReturnType<typeof buildServiceVariables>
) => {
  const hasLunch = Boolean(displacement.hasLunch)
  const hasDinner = Boolean(displacement.hasDinner)
  return {
    displacement_index: displacementIndex + 1,
    displacement_id: displacement.id,
    displacement_province: displacement.province,
    displacement_municipality: displacement.municipality,
    displacement_has_lunch: hasLunch,
    displacement_has_dinner: hasDinner,
    displacement_meals: describeMeals(hasLunch, hasDinner),
    displacement_date: serviceVariables.service_start_date
  }
}

const fillTemplateAndDownload = async (template: TemplateFile, context: TemplateContext, filename: string) => {
  const buffer = decodeDataUrl(template.dataUrl)
  const zip = await JSZip.loadAsync(buffer)
  const documentFile = zip.file('word/document.xml')
  if (!documentFile) {
    throw new Error('No s\'ha trobat el document principal dins la plantilla')
  }
  const xmlContent = await documentFile.async('string')
  const normalized = normalizePlaceholders(xmlContent)
  const cleaned = unwrapPlaceholderParagraphs(normalized)
  const rendered = renderTemplate(cleaned, context)
  zip.file('word/document.xml', rendered)
  const blob = await zip.generateAsync({ type: 'blob' })
  saveAs(blob, filename)
}

const renderTemplate = (content: string, context: TemplateContext): string => {
  const withLoops = content.replace(LOOP_REGEX, (_, loopName: string, inner: string) => {
    const items = context.loops?.[loopName] ?? []
    return items.map(item =>
      renderTemplate(inner, {
        variables: item.variables,
        loops: item.loops,
        parent: context
      })
    ).join('')
  })

  const withConditionals = withLoops.replace(IF_REGEX, (_, variable: string, inner: string) => {
    const value = resolveValue(context, variable)
    return isTruthy(value) ? renderTemplate(inner, context) : ''
  })

  return withConditionals.replace(VARIABLE_REGEX, (_, raw: string, modifier?: string) => {
    const value = resolveValue(context, raw)
    return formatValue(value, modifier)
  })
}

const resolveValue = (context: TemplateContext, key: string): TemplateValue => {
  let cursor: TemplateContext | undefined = context
  while (cursor) {
    if (cursor.variables && Object.prototype.hasOwnProperty.call(cursor.variables, key)) {
      return cursor.variables[key]
    }
    cursor = cursor.parent
  }
  return ''
}

const formatValue = (value: TemplateValue, modifier?: string): string => {
  if (modifier?.startsWith('limit')) {
    const count = Number(modifier.replace('limit', ''))
    const safeCount = Number.isFinite(count) && count > 0 ? count : 0
    if (safeCount <= 0) {
      return ''
    }
    const stringValue = value === null || value === undefined ? '' : String(value)
    return stringValue.slice(0, safeCount)
  }

  if (modifier === 'boolean') {
    return toBoolean(value) ? 'true' : 'false'
  }

  if (modifier === 'human') {
    const parsed = toDate(value)
    return parsed ? HUMAN_DATE_FORMATTER.format(parsed) : ''
  }

  if (value === null || value === undefined) {
    return ''
  }

  if (typeof value === 'boolean') {
    return value ? 'Sí' : 'No'
  }

  if (value instanceof Date) {
    return formatLocalDate(value)
  }

  return String(value)
}

const isTruthy = (value: TemplateValue) => {
  if (value === null || value === undefined) {
    return false
  }
  if (typeof value === 'boolean') {
    return value
  }
  if (typeof value === 'number') {
    return value !== 0
  }
  if (value instanceof Date) {
    return !Number.isNaN(value.getTime())
  }
  if (typeof value === 'string') {
    return value.trim().length > 0
  }
  return true
}

const toBoolean = (value: TemplateValue) => {
  if (value === null || value === undefined) return false
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value !== 0
  if (typeof value === 'string') return value.trim().length > 0
  return true
}

const toDate = (value: TemplateValue) => {
  if (value instanceof Date) return value
  if (typeof value === 'string') {
    const parsed = new Date(value)
    if (!Number.isNaN(parsed.getTime())) {
      return parsed
    }
  }
  return null
}

const formatLocalDate = (date: Date) => {
  if (Number.isNaN(date.getTime())) return ''
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const formatLocalTime = (date: Date) => {
  if (Number.isNaN(date.getTime())) return ''
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${hours}:${minutes}`
}

const calculateDuration = (start: Date, end: Date) => {
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return ''
  const diff = end.getTime() - start.getTime()
  if (diff <= 0) return ''
  return (diff / 3600000).toFixed(2)
}

const describeMeals = (hasLunch: boolean, hasDinner: boolean) => {
  if (hasLunch && hasDinner) return 'Dinar i sopar'
  if (hasLunch) return 'Dinar'
  if (hasDinner) return 'Sopar'
  return '—'
}

const buildServiceReference = (startDate: string, index: number) => {
  const suffix = String(index + 1).padStart(2, '0')
  const safeDate = startDate || 'sense-data'
  return `SERV-${safeDate}-${suffix}`
}

const getPreviousWorkingDays = (monthKey: string, count: number) => {
  const [yearStr, monthStr] = monthKey.split('-')
  const year = Number(yearStr)
  const month = Number(monthStr)
  if (!Number.isFinite(year) || !Number.isFinite(month)) return []

  const firstDayOfMonth = new Date(Date.UTC(year, month - 1, 1))
  const days: { iso: string, human: string }[] = []
  const cursor = new Date(firstDayOfMonth)

  while (days.length < count) {
    cursor.setUTCDate(cursor.getUTCDate() - 1)
    const weekday = cursor.getUTCDay()
    if (weekday === 0 || weekday === 6) {
      continue
    }
    const iso = formatLocalDate(cursor)
    days.push({
      iso,
      human: HUMAN_DATE_FORMATTER.format(cursor)
    })
  }

  return days
}

const decodeDataUrl = (dataUrl: string) => {
  const [, base64 = dataUrl] = dataUrl.split(',')
  const binary = atob(base64)
  const len = binary.length
  const buffer = new ArrayBuffer(len)
  const view = new Uint8Array(buffer)
  for (let i = 0; i < len; i++) {
    view[i] = binary.charCodeAt(i)
  }
  return buffer
}

const unwrapPlaceholderParagraphs = (content: string) => {
  const placeholderPattern = /^\[(?:end)?(?:loop|if):[a-z0-9_]+\]$/i
  return content.replace(/<w:p[^>]*>([\s\S]*?)<\/w:p>/gi, (fullMatch, inner) => {
    const textOnly = inner
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/gi, ' ')
      .trim()
    if (textOnly && placeholderPattern.test(textOnly)) {
      return textOnly
    }
    return fullMatch
  })
}

const normalizePlaceholders = (content: string) => {
  return content.replace(/\[(?:[^[\]]|<[^>]+>)+\]/g, (match) => {
    return match.replace(/<[^>]+>/g, '')
  })
}
