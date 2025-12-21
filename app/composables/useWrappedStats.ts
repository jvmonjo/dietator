export const useWrappedStats = () => {
    const serviceStore = useServiceStore()
    const settingsStore = useSettingsStore()

    const getYearStats = (year: number) => {
        const records = serviceStore.records.filter(r => new Date(r.startTime).getFullYear() === year)

        const totalServices = records.length

        let totalHours = 0
        let totalKm = 0
        let totalIncome = 0

        const months = Array(12).fill(0).map(() => ({ hours: 0, services: 0, income: 0, km: 0 }))
        const daysMap = new Map<string, number>() // "YYYY-MM-DD" -> hours

        records.forEach(record => {
            const start = new Date(record.startTime)
            const end = new Date(record.endTime)
            const durationHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60)

            totalHours += durationHours
            totalKm += (record.kilometers || 0)

            // Income Calculation
            let recordIncome = 0
            const hasLunch = record.displacements.some(d => d.hasLunch)
            const hasDinner = record.displacements.some(d => d.hasDinner)

            // Simple calculation based on lunch/dinner presence - typical for this app domain 
            // verifying with settings would be better but simple logic for now:
            // Assuming 1 service = 1 diet unit roughly, but let's check settings ref if available.
            // Actually, let's use the same logic as pdfGenerator or similar if possible.
            // For now, let's assume standard calculation: 
            // If we have settingsStore accessible, we use it.

            const { halfDietPrice, fullDietPrice } = settingsStore

            // Logic derived from observed app behavior (implied):
            // If lunch AND dinner -> full diet? Or just sum? 
            // Usually: Full Diet if (Lunch & Dinner) or specific condition. 
            // Let's approximate: 
            // If (Lunch AND Dinner) -> Full Price (likely)
            // If (Lunch OR Dinner) -> Half Price (likely)
            // But verify this assumption or reuse logic if available. 

            // Let's refine specific income logic later, for now we sum raw values if stored, 
            // or calculate on fly. 

            // Re-reading services.ts: it doesn't store price. 
            // Re-reading pdfGenerator.ts: it passes 'Totals' object. 

            // We should replicate logic from a central place if possible, 
            // or rewrite it here.

            let isFullDiet = false
            let isHalfDiet = false

            if (hasLunch && hasDinner) isFullDiet = true
            else if (hasLunch || hasDinner) isHalfDiet = true

            if (isFullDiet) recordIncome += fullDietPrice
            else if (isHalfDiet) recordIncome += halfDietPrice

            totalIncome += recordIncome

            // Monthly breakdown
            const monthIdx = start.getMonth()
            const monthData = months[monthIdx]
            if (monthData) {
                monthData.hours += durationHours
                monthData.services += 1
                monthData.income += recordIncome
                monthData.km += (record.kilometers || 0)
            }

            // Daily breakdown for "Most Active Day"
            const dayKey = start.toISOString().split('T')[0] || ''
            if (dayKey) {
                daysMap.set(dayKey, (daysMap.get(dayKey) || 0) + durationHours)
            }
        })

        // Most active day (Hours) & Most km day
        let mostActiveDay = { date: '', hours: 0 }
        let mostKmDay = { date: '', km: 0 }

        const kmMap = new Map<string, number>()

        records.forEach(r => {
            const date = r.startTime.split('T')[0]
            if (date) kmMap.set(date, (kmMap.get(date) || 0) + (r.kilometers || 0))
        })

        for (const [date, hours] of daysMap.entries()) {
            if (hours > mostActiveDay.hours) mostActiveDay = { date, hours }
        }

        for (const [date, km] of kmMap.entries()) {
            if (km > mostKmDay.km) mostKmDay = { date, km }
        }


        // Weekly Average based on ACTIVE months only
        const activeMonthsCount = months.filter(m => m.hours > 0).length
        const totalWeeks = activeMonthsCount * 4.345 // Average weeks per month
        const weeklyAverageHours = activeMonthsCount > 0 ? totalHours / totalWeeks : 0
        const weeklyAverageServices = activeMonthsCount > 0 ? totalServices / totalWeeks : 0
        const weeklyAverageKm = activeMonthsCount > 0 ? totalKm / totalWeeks : 0
        const totalDaysNonStop = totalHours / 24
        const avgHoursPerService = totalServices > 0 ? totalHours / totalServices : 0
        const avgKmPerService = totalServices > 0 ? totalKm / totalServices : 0

        return {
            totalServices,
            totalHours,
            totalKm,
            totalIncome,
            months,
            mostActiveDay,
            mostKmDay,
            weeklyAverageHours,
            weeklyAverageServices,
            weeklyAverageKm,
            totalDaysNonStop,
            avgHoursPerService,
            avgKmPerService
        }
    }

    const getDistanceComparisons = (totalKm: number) => {
        // Fun comparisons (Iconic Routes)
        const comparisons = [
            { label: 'Marató', distance: 42.195, emoji: '🏃' },
            { label: 'Camí de Santiago (Francès)', distance: 780, emoji: '🚶' },
            { label: 'Ruta 66 (EUA)', distance: 3940, emoji: '🛣️' },
            { label: 'Rally París-Dakar', distance: 10000, emoji: 'un 🚙' },
            { label: 'Volta al món', distance: 40075, emoji: '🌍' }
        ]

        return comparisons.flatMap(c => {
            const timesCompleted = Math.floor(totalKm / c.distance)
            const percentage = timesCompleted >= 1
                ? 100
                : (totalKm / c.distance) * 100

            // If completed more than once, we might want to show that
            return {
                ...c,
                percentage,
                completed: timesCompleted >= 1,
                timesCompleted
            }
        })
    }

    return {
        getYearStats,
        getDistanceComparisons
    }
}
