import type { ServiceRecord } from '~/stores/services'
import { jsPDF } from 'jspdf'

interface PdfGeneratorOptions {
    totals: ServiceTotals
    month: MonthOption
    settings: {
        halfDietPrice: number
        fullDietPrice: number
    }
    records: ServiceRecord[]
}

const PRIMARY_COLOR = '#EAB308' // yellow-500
const TEXT_COLOR = '#1F2937' // gray-800
const LIGHT_TEXT_COLOR = '#6B7280' // gray-500

export const generateStatsPdf = async (options: PdfGeneratorOptions): Promise<Blob> => {
    const { Totals, Month, Settings, Records } = { Totals: options.totals, Month: options.month, Settings: options.settings, Records: options.records }
    const doc = new jsPDF()

    // Fonts
    doc.setFont('helvetica')

    // -- HEADER --
    doc.setFillColor(PRIMARY_COLOR)
    doc.rect(0, 0, 210, 40, 'F')

    // Add Logo
    try {
        const config = useRuntimeConfig()
        const baseURL = config.app.baseURL
        // Ensure accurate path construction handling trailing/leading slashes
        const logoPath = 'apple-icon-180.png'
        const logoUrl = baseURL.endsWith('/') ? `${baseURL}${logoPath}` : `${baseURL}/${logoPath}`

        const response = await fetch(logoUrl)
        const blob = await response.blob()
        const reader = new FileReader()

        await new Promise<void>((resolve) => {
            reader.onload = () => {
                const base64 = reader.result as string
                // Add image (x, y, w, h)
                doc.addImage(base64, 'PNG', 170, 5, 30, 30)
                resolve()
            }
            reader.readAsDataURL(blob)
        })
    } catch (e) {
        console.error('Error loading logo', e)
    }

    // Month Badge (moved to left to avoid logo overlap)
    doc.setFillColor('#FFFFFF')
    doc.roundedRect(150, 15, 30, 0, 2, 2, 'F') // Hide/Remove old badge or move it
    // Actually, let's move the month text to below the title instead of a badge on the right, since logo is now there.

    // Title
    doc.setFontSize(24)
    doc.setFont('helvetica', 'bold')
    doc.text('Dietator', 20, 18)

    doc.setFontSize(14)
    doc.setFont('helvetica', 'normal')
    doc.text(Month.label.toUpperCase(), 20, 28)

    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text('Informe Mensual de Serveis', 20, 35)

    let y = 60

    // -- SUMMARY CARDS --
    const cardWidth = 50
    const cardHeight = 30
    const gap = 10
    const startX = 20

    // Calculate Hours
    const calculateDuration = (start: string, end: string) => {
        const s = new Date(start).getTime()
        const e = new Date(end).getTime()
        if (Number.isNaN(s) || Number.isNaN(e)) return 0
        return Math.max(0, e - s) / (1000 * 60 * 60)
    }

    const totalHours = Records.reduce((sum, r) => sum + calculateDuration(r.startTime, r.endTime), 0)
    const avgHours = Totals.serviceCount > 0 ? totalHours / Totals.serviceCount : 0

    // Card 1: Services
    drawCard(doc, startX, y, cardWidth, cardHeight, 'Serveis', Totals.serviceCount.toString())

    // Card 2: Allowance
    const allowanceStr = new Intl.NumberFormat('ca-ES', { style: 'currency', currency: 'EUR' }).format(Totals.allowance)
    drawCard(doc, startX + cardWidth + gap, y, cardWidth, cardHeight, 'Dietes', allowanceStr)

    // Card 3: Kilometers
    const kmStr = (Totals.kilometers || 0).toLocaleString('ca-ES') + ' km'
    drawCard(doc, startX + (cardWidth + gap) * 2, y, cardWidth, cardHeight, 'Kilòmetres', kmStr)

    y += cardHeight + 30

    // -- DETAILED STATS --
    doc.setDrawColor(200, 200, 200)
    doc.line(20, y, 190, y)
    y += 10

    doc.setTextColor(TEXT_COLOR)
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text('Desglossament', 20, y)
    y += 10

    // Stats Grid
    const stats = [
        { label: 'Dietes Completes', value: Totals.fullDietCount },
        { label: 'Dietes Mitges', value: Totals.halfDietCount },
        { label: 'Total Dinars', value: Totals.lunches },
        { label: 'Total Sopars', value: Totals.dinners },
        { label: 'Mitjana Km/Servei', value: ((Totals.kilometers || 0) / (Totals.serviceCount || 1)).toLocaleString('ca-ES', { maximumFractionDigits: 1 }) + ' km' },
        { label: 'Hores Totals', value: totalHours.toLocaleString('ca-ES', { maximumFractionDigits: 1 }) + ' h' },
        { label: 'Mitjana Hores/Servei', value: avgHours.toLocaleString('ca-ES', { maximumFractionDigits: 1 }) + ' h' },
    ]

    let col = 0
    let rowY = y
    stats.forEach((stat, i) => {
        if (i % 2 === 0) {
            col = 20
            if (i > 0) rowY += 15
        } else {
            col = 110
        }

        doc.setFontSize(10)
        doc.setTextColor(LIGHT_TEXT_COLOR)
        doc.setFont('helvetica', 'normal')
        doc.text(stat.label, col, rowY)

        doc.setFontSize(12)
        doc.setTextColor(TEXT_COLOR)
        doc.setFont('helvetica', 'bold')
        doc.text(stat.value.toString(), col, rowY + 5)
    })

    // -- FOOTER --
    // Price Config & Generated By
    const priceHalf = new Intl.NumberFormat('ca-ES', { style: 'currency', currency: 'EUR' }).format(Settings.halfDietPrice)
    const priceFull = new Intl.NumberFormat('ca-ES', { style: 'currency', currency: 'EUR' }).format(Settings.fullDietPrice)

    doc.setFontSize(8)
    doc.setTextColor(LIGHT_TEXT_COLOR)
    doc.setFont('helvetica', 'normal')

    const footerY = 275
    doc.text(`Preus: Mitja ${priceHalf} | Completa ${priceFull}`, 105, footerY, { align: 'center' })
    doc.text(`Generat automàticament per Dietator el ${new Date().toLocaleDateString('ca-ES')}`, 105, footerY + 5, { align: 'center' })

    return doc.output('blob')
}

function drawCard(doc: jsPDF, x: number, y: number, w: number, h: number, title: string, value: string) {
    // Drop shadow (simulated)
    doc.setFillColor(240, 240, 240)
    doc.roundedRect(x + 1, y + 1, w, h, 2, 2, 'F')

    // Background
    doc.setFillColor('#FFFFFF')
    doc.setDrawColor(220, 220, 220)
    doc.roundedRect(x, y, w, h, 2, 2, 'FD')

    // Title
    doc.setTextColor(LIGHT_TEXT_COLOR)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.text(title.toUpperCase(), x + (w / 2), y + 10, { align: 'center' })

    // Value
    doc.setTextColor(PRIMARY_COLOR) // primary color text
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text(value, x + (w / 2), y + 22, { align: 'center' })
}

export interface WrappedStats {
    year: number
    totalServices: number
    totalHours: number
    totalKm: number
    totalIncome: number
    totalDaysNonStop: number
    avgHoursPerService: number
    avgKmPerService: number
    weeklyAverageHours: number
    weeklyAverageServices: number
    months: { hours: number; services: number; income: number; km: number }[]
    mostActiveDay: { date: string; hours: number }
    mostKmDay: { date: string; km: number; route?: string[] }
    comparisons: { label: string; distance: number; emoji: string; percentage: number; completed: boolean; timesCompleted: number }[]
}

export const generateWrappedPdf = async (stats: WrappedStats): Promise<Blob> => {
    const { year, totalServices, totalHours, totalKm, totalIncome, weeklyAverageHours, weeklyAverageServices, months, mostActiveDay, mostKmDay, totalDaysNonStop, avgHoursPerService, avgKmPerService } = stats
    const doc = new jsPDF()

    // Background
    doc.setFillColor('#0F172A') // Slate 900
    doc.rect(0, 0, 210, 297, 'F')

    // Fonts (Standard)
    doc.setFont('helvetica')

    // -- HEADER --
    doc.setFontSize(40)
    doc.setTextColor('#FACC15') // Yellow
    doc.text(`${year}`, 105, 30, { align: 'center' })

    doc.setFontSize(14)
    doc.setTextColor('#94A3B8')
    doc.text('EL TEU ANY A DIETATOR', 105, 40, { align: 'center' })

    let y = 60

    // -- SUMMARY GRID --
    const drawStatCard = (label: string, value: string, sub: string, x: number, color: string) => {
        doc.setFillColor('#1E293B')
        doc.roundedRect(x, y, 40, 30, 3, 3, 'F')

        doc.setFontSize(8)
        doc.setTextColor('#94A3B8')
        doc.text(label.toUpperCase(), x + 20, y + 8, { align: 'center' })

        doc.setFontSize(14)
        doc.setTextColor(color)
        doc.text(value, x + 20, y + 18, { align: 'center' })

        if (sub) {
            doc.setFontSize(7)
            doc.setTextColor('#64748B')
            doc.text(sub, x + 20, y + 25, { align: 'center' })
        }
    }

    const formatCurrency = new Intl.NumberFormat('ca-ES', { style: 'currency', currency: 'EUR' }).format
    const formatNumber = new Intl.NumberFormat('ca-ES', { maximumFractionDigits: 1 }).format

    drawStatCard('Dietes', formatCurrency(totalIncome), '', 20, '#34D399') // Emerald
    drawStatCard('Hores', formatNumber(totalHours), `~${formatNumber(weeklyAverageHours)} h/setm | ${formatNumber(avgHoursPerService)} h/serv`, 65, '#FACC15') // Yellow
    drawStatCard('Serveis', totalServices.toString(), `~${formatNumber(weeklyAverageServices)} s/setm`, 110, '#A78BFA') // Purple
    drawStatCard('Kilòmetres', formatNumber(totalKm), `~${formatNumber(avgKmPerService)} km/serv`, 155, '#60A5FA') // Blue

    y += 45

    // -- COMBINED CHART --
    doc.setFontSize(16)
    doc.setTextColor('#FFFFFF')
    doc.text('Evolució Anual', 20, y)

    // Legend
    doc.setFontSize(8)
    doc.setFillColor('#FACC15'); doc.circle(130, y - 1, 1.5, 'F'); doc.setTextColor('#CBD5E1'); doc.text('Hores', 133, y)
    doc.setFillColor('#34D399'); doc.circle(150, y - 1, 1.5, 'F'); doc.text('Ingressos', 153, y)
    doc.setFillColor('#60A5FA'); doc.circle(175, y - 1, 1.5, 'F'); doc.text('Km', 178, y)

    y += 10

    const chartH = 60
    const chartW = 170
    const chartX = 20

    // Axis
    doc.setDrawColor('#334155')
    doc.line(chartX, y + chartH, chartX + chartW, y + chartH)

    // Data prep
    const maxHours = Math.max(...months.map(m => m.hours), 1)
    const maxIncome = Math.max(...months.map(m => m.income), 1)
    const maxKm = Math.max(...months.map(m => m.km), 1)

    const barGroupW = (chartW / 12)
    const barW = barGroupW / 4 // 3 bars + spacing

    interface Point { x: number; y: number }

    // Points for lines
    const pointsHours: Point[] = []
    const pointsIncome: Point[] = []
    const pointsKm: Point[] = []

    months.forEach((m, i) => {
        const baseX = chartX + (i * barGroupW) + 2

        // Helper to Draw Bar and collect Point
        const drawMetric = (val: number, max: number, color: string, offsetX: number, points: Point[]) => {
            const h = (val / max) * chartH
            const x = baseX + offsetX
            const barY = y + chartH - h

            if (h > 0) {
                doc.setFillColor(color)
                doc.rect(x, barY, barW, h, 'F')
            }
            // Center of bar top for line
            points.push({ x: x + barW / 2, y: barY })
        }

        drawMetric(m.hours, maxHours, '#FACC15', 0, pointsHours)
        drawMetric(m.income, maxIncome, '#34D399', barW, pointsIncome)
        drawMetric(m.km, maxKm, '#60A5FA', barW * 2, pointsKm)

        // Month Label
        doc.setFontSize(7)
        doc.setTextColor('#64748B')
        const monthName = new Date(2000, i, 1).toLocaleString('ca-ES', { month: 'narrow' }).toUpperCase()
        doc.text(monthName, baseX + barGroupW / 2, y + chartH + 5, { align: 'center' })
    })

    // Draw Combined Trend Line (Average Activity)
    const pointsTrend: Point[] = []

    months.forEach((m, i) => {
        const baseX = chartX + (i * barGroupW) + 2

        // Calculate normalized heights (0 to chartH)
        const hHours = (m.hours / maxHours) * chartH
        const hIncome = (m.income / maxIncome) * chartH
        const hKm = (m.km / maxKm) * chartH

        // Average height
        const avgH = (hHours + hIncome + hKm) / 3

        // Center of the month group
        const x = baseX + (barGroupW / 2)
        const pointY = y + chartH - avgH

        pointsTrend.push({ x, y: pointY })
    })

    doc.setDrawColor('#FFFFFF')
    doc.setLineWidth(1)

    // Draw smooth-ish line
    for (let i = 0; i < pointsTrend.length - 1; i++) {
        const p1 = pointsTrend[i]!
        const p2 = pointsTrend[i + 1]!
        doc.line(p1.x, p1.y, p2.x, p2.y)
    }

    // Draw dots
    doc.setFillColor('#FFFFFF')
    pointsTrend.forEach(p => doc.circle(p.x, p.y, 1, 'F'))

    // Legend for Trend
    doc.setFontSize(8)
    doc.setTextColor('#FFFFFF')
    doc.text('Tendència General', chartX + chartW - 25, y - 5)

    y += chartH + 20

    // -- HIGHLIGHTS & CURIOSITIES --

    // Cards Row
    const cardY = y

    // Most Active Day
    if (mostActiveDay.date) {
        doc.setDrawColor('#BE185D') // Pink border
        doc.setFillColor('#831843') // Dark Pink bg
        doc.roundedRect(20, cardY, 80, 25, 3, 3, 'FD')

        doc.setFontSize(10)
        doc.setTextColor('#FBCFE8')
        doc.text('Dia més actiu', 25, cardY + 8)

        doc.setFontSize(14)
        doc.setTextColor('#FFFFFF')
        const dateStr = new Date(mostActiveDay.date).toLocaleDateString('ca-ES', { day: 'numeric', month: 'long' })
        doc.text(dateStr, 25, cardY + 18)

        doc.setFontSize(10)
        doc.setTextColor('#FBCFE8')
        doc.text(`${formatNumber(mostActiveDay.hours)} hores`, 95, cardY + 18, { align: 'right' })
    }

    // Most Km Day
    if (mostKmDay.date) {
        doc.setDrawColor('#1D4ED8') // Blue border
        doc.setFillColor('#1E3A8A') // Dark Blue bg
        doc.roundedRect(110, cardY, 80, 25, 3, 3, 'FD')

        doc.setFontSize(10)
        doc.setTextColor('#BFDBFE')
        doc.text('Dia més viatger', 115, cardY + 8)

        doc.setFontSize(14)
        doc.setTextColor('#FFFFFF')
        const dateKmStr = new Date(mostKmDay.date).toLocaleDateString('ca-ES', { day: 'numeric', month: 'long' })
        doc.text(dateKmStr, 115, cardY + 18)

        doc.setFontSize(10)
        doc.setTextColor('#BFDBFE')
        doc.text(`${formatNumber(mostKmDay.km)} km`, 185, cardY + 18, { align: 'right' })

        // Add Route if present
        if (mostKmDay.route && mostKmDay.route.length > 0) {
            const routeText = `Ruta: ${mostKmDay.route.join(' -> ')}`
            doc.setFontSize(7)
            doc.setTextColor('#93C5FD') // Light blue
            // Use splitTextToSize to wrap line
            const splitText = doc.splitTextToSize(routeText, 75)
            doc.text(splitText, 115, cardY + 28)
        }
    }

    y += 35

    // Non-stop Days (New Card)
    doc.setDrawColor('#B45309') // Orange border
    doc.setFillColor('#78350F') // Dark Orange bg
    doc.roundedRect(65, y, 80, 20, 3, 3, 'FD') // Centered

    doc.setFontSize(10)
    doc.setTextColor('#FDE68A') // Light Yellow
    doc.text('Marató Laboral', 105, y + 7, { align: 'center' })

    doc.setFontSize(12)
    doc.setTextColor('#FFFFFF')
    doc.text(`Equival a ${formatNumber(totalDaysNonStop)} dies seguits!`, 105, y + 16, { align: 'center' })

    y += 30



    // -- FOOTER --
    doc.setFontSize(8)
    doc.setTextColor('#4B5563') // gray-600
    doc.text(`Generat per Dietator - ${new Date().toLocaleDateString('ca-ES')}`, 105, 285, { align: 'center' })

    return doc.output('blob')
}
