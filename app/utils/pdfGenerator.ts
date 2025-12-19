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
    drawCard(doc, startX + cardWidth + gap, y, cardWidth, cardHeight, 'Import Total', allowanceStr)

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
        { label: 'Unitats de Dieta', value: Totals.dietUnits },
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
