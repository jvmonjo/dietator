import type { CalendarConfig } from '~/stores/settings'

const EVENT_TITLE = 'Dietator: Generar documents'

function getNextDate(day: number, time: string): Date {
    const [hours, minutes] = time.split(':').map(Number)
    const now = new Date()
    let date = new Date(now.getFullYear(), now.getMonth(), day, hours, minutes)

    // If the date is in the past, move to next month
    if (date < now) {
        date = new Date(now.getFullYear(), now.getMonth() + 1, day, hours, minutes)
    }
    return date
}

function formatDateToICS(date: Date): string {
    // Format: YYYYMMDDTHHmmss
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
}

function formatDateToGoogle(date: Date): string {
    // Format: YYYYMMDDTHHmmssZ
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
}

export function generateGoogleCalendarUrl(config: CalendarConfig): string {
    const startDate = getNextDate(config.day, config.time)
    // End date is 30 mins later
    const endDate = new Date(startDate.getTime() + 30 * 60000)

    const description = 'Accedeix a Dietator per generar i enviar els documents de dietes i desplaçaments del mes.'

    const params = new URLSearchParams({
        action: 'TEMPLATE',
        text: EVENT_TITLE,
        details: description,
        dates: `${formatDateToGoogle(startDate)}/${formatDateToGoogle(endDate)}`
    })

    if (config.isRecurring) {
        params.append('recur', 'RRULE:FREQ=MONTHLY')
    }

    return `https://calendar.google.com/calendar/render?${params.toString()}`
}

export function generateIcsFile(config: CalendarConfig): Blob {
    const startDate = getNextDate(config.day, config.time)
    const endDate = new Date(startDate.getTime() + 30 * 60000)
    const now = new Date()

    const description = 'Accedeix a Dietator per generar i enviar els documents de dietes i desplaçaments del mes.'

    const lines = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//Dietator//App//CA',
        'CALSCALE:GREGORIAN',
        'BEGIN:VEVENT',
        `DTSTAMP:${formatDateToICS(now)}`,
        `UID:${crypto.randomUUID()}`,
        `DTSTART:${formatDateToICS(startDate)}`,
        `DTEND:${formatDateToICS(endDate)}`,
        `SUMMARY:${EVENT_TITLE}`,
        `DESCRIPTION:${description}`
    ]

    if (config.isRecurring) {
        lines.push('RRULE:FREQ=MONTHLY')
    }

    lines.push('END:VEVENT')
    lines.push('END:VCALENDAR')

    return new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' })
}
