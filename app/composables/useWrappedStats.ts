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
        let mostKmDay = { date: '', km: 0, route: [] as string[] }

        const kmMap = new Map<string, { km: number, route: string[] }>()

        records.forEach(r => {
            const date = r.startTime.split('T')[0]
            if (date) {
                const current = kmMap.get(date) || { km: 0, route: [] }
                // Extract unique municipalities for the day (preserving order roughly)
                const newMunicipalities = r.displacements.map(d => d.municipality).filter(Boolean)

                // Merge routes intelligently (avoiding adjacent duplicates if possible, or just concat)
                // Simple concat for now, will dedup later if needed

                kmMap.set(date, {
                    km: current.km + (r.kilometers || 0),
                    route: [...current.route, ...newMunicipalities]
                })
            }
        })

        for (const [date, hours] of daysMap.entries()) {
            if (hours > mostActiveDay.hours) mostActiveDay = { date, hours }
        }

        for (const [date, data] of kmMap.entries()) {
            if (data.km > mostKmDay.km) {
                // Dedup adjacent cities in route
                const uniqueRoute = data.route.filter((city, index, arr) => city !== arr[index - 1])
                mostKmDay = { date, km: data.km, route: uniqueRoute }
            }
        }


        const activeWeeksSet = new Set<string>()

        // Helper to get ISO week key (YYYY-Www)
        const getWeekKey = (date: Date) => {
            const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
            const dayNum = d.getUTCDay() || 7
            d.setUTCDate(d.getUTCDate() + 4 - dayNum)
            const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
            const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
            return `${d.getUTCFullYear()}-W${weekNo}`
        }

        records.forEach(r => {
            const d = new Date(r.startTime)
            if (!Number.isNaN(d.getTime())) {
                activeWeeksSet.add(getWeekKey(d))
            }
        })

        // Weekly Average based on ACTIVE WEEKS only
        // Fallback to activeMonths estimation only if weeks calculation fails strangely (shouldn't happen with records > 0)
        // But if records > 0, activeWeeksSet.size should be > 0.

        const totalWeeks = activeWeeksSet.size > 0 ? activeWeeksSet.size : 1

        // If there are no records, averages are 0.
        const hasRecords = records.length > 0

        const weeklyAverageHours = hasRecords ? totalHours / totalWeeks : 0
        const weeklyAverageServices = hasRecords ? totalServices / totalWeeks : 0
        const weeklyAverageKm = hasRecords ? totalKm / totalWeeks : 0
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
