import type { ServiceRecord } from '~/stores/services'

export interface ServiceWarning {
    message: string
    type: 'warning' | 'error'
}

export const useServiceWarnings = () => {
    const { t } = useI18n()

    const getServiceWarnings = (
        startTime: string,
        endTime: string,
        displacements: ServiceRecord['displacements']
    ): ServiceWarning[] => {
        const warnings: ServiceWarning[] = []

        if (!startTime || !endTime) return warnings

        // 0. CHECK: No diet claimed
        const hasMeals = displacements.some(d => d.hasLunch || d.hasDinner)
        if (!hasMeals) {
            warnings.push({
                message: t('warnings.no_meals_claimed'),
                type: 'warning' // Using warning type to ensure visibility, though it's informational
            })
        }

        const start = new Date(startTime)
        const end = new Date(endTime)

        if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return warnings

        // 1. Duration > 24h
        const DURATION_LIMIT_MS = 24 * 60 * 60 * 1000
        if (end.getTime() - start.getTime() > DURATION_LIMIT_MS) {
            warnings.push({
                message: t('warnings.duration_over_24h'),
                type: 'warning'
            })
        }

        const endHour = end.getHours()
        const endMinutes = end.getMinutes()
        const totalMinutes = endHour * 60 + endMinutes

        const isSameDay = start.toDateString() === end.toDateString()

        if (isSameDay) {
            // 2. End < 15:30 (15,5 * 60 = 930 minutes)
            // "Compte. Assegura't de que has dinat i tens dret a dieta"
            const hasLunch = displacements.some(d => d.hasLunch)
            if (totalMinutes < 930 && hasLunch) {
                warnings.push({
                    message: t('warnings.check_lunch_right'),
                    type: 'warning'
                })
            }

            // 3. End < 23:30 && hasDinner
            // 23:30 = 23 * 60 + 30 = 1380 + 30 = 1410
            // "Compte. Assegura't de que has sopat i tens dret a dieta"
            const hasDinner = displacements.some(d => d.hasDinner)
            if (totalMinutes < 1410 && hasDinner) {
                warnings.push({
                    message: t('warnings.check_dinner_right'),
                    type: 'warning'
                })
            }

        }

        // 3.5. End >= 22:30 OR Next Day && !hasDinner
        // 22:30 = 1350 minutes
        const hasDinner = displacements.some(d => d.hasDinner)
        const isLateFinish = (!isSameDay) || (totalMinutes >= 1350)

        if (isLateFinish && !hasDinner) {
            warnings.push({
                message: t('warnings.late_finish_no_dinner'),
                type: 'warning'
            })
        }

        const startHour = start.getHours()
        const startMinutes = start.getMinutes()
        const startTotalMinutes = startHour * 60 + startMinutes

        // 4. Start > 16:00 && hasLunch
        // 16:00 = 16 * 60 = 960 minutes
        const hasLunch = displacements.some(d => d.hasLunch)
        if (startTotalMinutes > 960 && hasLunch) {
            warnings.push({
                message: t('warnings.start_after_16_lunch'),
                type: 'warning'
            })
        }

        return warnings
    }

    return {
        getServiceWarnings
    }
}
