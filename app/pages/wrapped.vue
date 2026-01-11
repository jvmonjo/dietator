<script setup lang="ts">
import { useWrappedStats } from '~/composables/useWrappedStats'
import { generateWrappedPdf } from '~/utils/pdfGenerator'
import { saveAs } from 'file-saver'


const { getYearStats, getDistanceComparisons } = useWrappedStats()

// State
const currentYear = new Date().getFullYear()
const selectedYear = ref(currentYear)
const loading = ref(false)
const chartMetric = ref<'income' | 'hours' | 'km'>('hours')

const stats = computed(() => getYearStats(selectedYear.value))

const maxMonthlyIncome = computed(() => {
    const max = Math.max(...stats.value.months.map(m => m.income))
    return max > 0 ? max : 1
})
const maxMonthlyHours = computed(() => {
    const max = Math.max(...stats.value.months.map(m => m.hours))
    return max > 0 ? max : 1
})
const maxMonthlyKm = computed(() => {
    const max = Math.max(...stats.value.months.map(m => m.km))
    return max > 0 ? max : 1
})

const getBarHeight = (monthData: { hours: number, income: number, km: number }) => {
    const metric = chartMetric.value
    let pct = 0
    // Access computed value safely
    const maxInc = unref(maxMonthlyIncome)
    const maxHrs = unref(maxMonthlyHours)
    const maxKm = unref(maxMonthlyKm)

    if (metric === 'income') {
        const ratio = monthData.income / maxInc
        // Exponential scaling to accentuate differences (power of 2)
        pct = Math.pow(ratio, 2) * 100
    } else if (metric === 'km') {
        pct = (monthData.km / maxKm) * 100
    } else {
        pct = (monthData.hours / maxHrs) * 100
    }

    if (Number.isNaN(pct)) return 0
    if (pct > 0 && pct < 2) return 2
    return pct
}

const comparisons = computed(() => getDistanceComparisons(stats.value.totalKm))

// Formatters
const currencyFormatter = new Intl.NumberFormat('ca-ES', { style: 'currency', currency: 'EUR' })
const numberFormatter = new Intl.NumberFormat('ca-ES', { maximumFractionDigits: 1 })

const formatCurrency = (val: number) => currencyFormatter.format(val)
const formatNumber = (val: number) => numberFormatter.format(val)
const moneyFormatter = new Intl.NumberFormat('ca-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const formatMoney = (val: number) => moneyFormatter.format(val)

const years = computed(() => {
    const list = []
    for (let y = currentYear; y >= 2023; y--) {
        list.push(y)
    }
    return list
})

// Visual Helpers
const getMonthName = (idx: number) => {
    const dates = new Date(2000, idx, 1) // Any year
    return dates.toLocaleString('ca-ES', { month: 'short' })
}

// Actions
const toast = useToast()

const handlePdf = async () => {
    try {
        loading.value = true
        const blob = await generateWrappedPdf({
            year: selectedYear.value,
            ...stats.value,
            comparisons: comparisons.value
        })
        const filename = `dietator-wrapped-${selectedYear.value}.pdf`

        const file = new File([blob], filename, { type: 'application/pdf' })

        if (navigator.canShare && navigator.canShare({ files: [file] })) {
            try {
                await navigator.share({
                    files: [file]
                })
                toast.add({ title: 'PDF compartit correctament', color: 'success' })
            } catch (err: unknown) {
                const errorName = (err as Error).name
                if (errorName === 'NotAllowedError' || errorName === 'TypeError') {
                    // Fallback to download if share failed (e.g. not allowed context)
                    saveAs(blob, filename)
                    toast.add({ title: 'PDF descarregat correctament', color: 'success' })
                } else if (errorName !== 'AbortError') {
                    // Unknown error
                    console.error(err)
                    toast.add({ title: 'Error compartint el PDF', color: 'error' })
                }
            }
        } else {
            // Fallback for devices not supporting file share
            saveAs(blob, filename)
            toast.add({ title: 'PDF descarregat correctament', color: 'success' })
        }
    } catch (e) {
        console.error(e)
        toast.add({ title: 'Error generant el PDF', color: 'error' })
    } finally {
        loading.value = false
    }
}
</script>

<template>
    <div
        class="min-h-screen bg-gray-900 text-white -mx-4 -my-6 p-6 sm:p-8 font-sans transition-colors duration-500 overflow-x-hidden">
        <!-- Background Gradients -->
        <div class="fixed inset-0 z-0 overflow-hidden pointer-events-none">
            <div
                class="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-purple-600/30 rounded-full blur-[120px] mix-blend-screen animate-pulse" />
            <div
                class="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-yellow-500/20 rounded-full blur-[100px] mix-blend-screen" />
        </div>

        <div class="relative z-10 max-w-4xl mx-auto space-y-12">

            <!-- Header -->
            <header class="flex flex-col sm:flex-row justify-between items-center gap-4">
                <div class="text-center sm:text-left max-w-full">
                    <h1
                        class="text-5xl md:text-7xl font-black bg-gradient-to-r from-yellow-400 to-purple-400 bg-clip-text text-transparent break-words">
                        El teu {{ selectedYear }}
                    </h1>
                    <p class="text-xl text-gray-400 mt-2">Resum de l'any a Dietator</p>
                </div>

                <div
                    class="flex items-center gap-3 bg-gray-800/50 p-2 rounded-xl backdrop-blur-sm border border-gray-700/50 shrink-0">
                    <USelect v-model="selectedYear" :items="years" class="w-32 text-white" variant="none" />
                </div>
            </header>

            <!-- Key Stats Grid -->
            <section class="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div
                    class="col-span-2 sm:col-span-1 bg-gray-800/40 p-6 rounded-3xl border border-gray-700/50 backdrop-blur-md hover:scale-105 transition-transform duration-300">
                    <div class="text-gray-400 text-sm font-medium uppercase tracking-wider mb-2">Total dietes</div>
                    <div class="flex items-baseline gap-1 flex-wrap">
                        <span class="text-2xl lg:text-4xl font-black text-emerald-400">{{
                            formatMoney(stats.totalIncome) }}</span>
                        <span class="text-lg lg:text-xl text-emerald-500 font-bold">€</span>
                    </div>
                </div>
                <div
                    class="bg-gray-800/40 p-6 rounded-3xl border border-gray-700/50 backdrop-blur-md hover:scale-105 transition-transform duration-300 delay-75">
                    <div class="text-gray-400 text-sm font-medium uppercase tracking-wider mb-2">Hores</div>
                    <div class="text-2xl lg:text-4xl font-black text-yellow-400">{{ formatNumber(stats.totalHours)
                        }}<span class="text-lg text-gray-500 ml-1">h</span></div>
                    <div class="text-xs text-yellow-500/80 mt-1 font-medium">
                        ~{{ formatNumber(stats.weeklyAverageHours) }} h/setm · {{ formatNumber(stats.avgHoursPerService)
                        }} h/serv
                    </div>
                </div>
                <div
                    class="bg-gray-800/40 p-6 rounded-3xl border border-gray-700/50 backdrop-blur-md hover:scale-105 transition-transform duration-300 delay-100">
                    <div class="text-gray-400 text-sm font-medium uppercase tracking-wider mb-2">Serveis</div>
                    <div class="text-2xl lg:text-4xl font-black text-purple-400">{{ stats.totalServices }}</div>
                    <div class="text-xs text-purple-500/80 mt-1 font-medium">~{{
                        formatNumber(stats.weeklyAverageServices) }} serveis/setmana</div>
                </div>
                <div
                    class="col-span-2 sm:col-span-1 bg-gray-800/40 p-6 rounded-3xl border border-gray-700/50 backdrop-blur-md hover:scale-105 transition-transform duration-300 delay-150">
                    <div class="text-gray-400 text-sm font-medium uppercase tracking-wider mb-2">Kilòmetres</div>
                    <div class="flex items-baseline gap-1 flex-wrap">
                        <span class="text-2xl lg:text-4xl font-black text-blue-400 break-words">{{
                            formatNumber(stats.totalKm) }}</span>
                        <span class="text-lg text-gray-500">km</span>
                    </div>
                    <div class="text-xs text-blue-500/80 mt-1 font-medium">
                        ~{{ formatNumber(stats.weeklyAverageKm) }} km/setm · {{ formatNumber(stats.avgKmPerService) }}
                        km/serv
                    </div>
                </div>
            </section>

            <!-- Monthly Breakdown (Bar Chart visual) -->
            <section class="bg-gray-800/30 p-4 sm:p-8 rounded-3xl border border-gray-700/50 backdrop-blur-sm">
                <div class="flex flex-col sm:flex-row items-center justify-between mb-6 gap-4">
                    <h3 class="text-2xl font-bold flex items-center gap-2">
                        <UIcon name="i-heroicons-chart-bar" class="w-6 h-6 text-yellow-500" />
                        Activitat Mensual
                    </h3>
                    <div class="flex bg-gray-700/50 rounded-lg p-1 gap-1 self-stretch sm:self-auto justify-center">
                        <button class="px-3 py-1 text-sm rounded-md transition-all flex-1 sm:flex-none"
                            :class="chartMetric === 'income' ? 'bg-gray-600 text-white shadow' : 'text-gray-400 hover:text-gray-200'"
                            @click="chartMetric = 'income'">
                            Dietes
                        </button>
                        <button class="px-3 py-1 text-sm rounded-md transition-all flex-1 sm:flex-none"
                            :class="chartMetric === 'hours' ? 'bg-gray-600 text-white shadow' : 'text-gray-400 hover:text-gray-200'"
                            @click="chartMetric = 'hours'">
                            Hores
                        </button>
                        <button class="px-3 py-1 text-sm rounded-md transition-all flex-1 sm:flex-none"
                            :class="chartMetric === 'km' ? 'bg-gray-600 text-white shadow' : 'text-gray-400 hover:text-gray-200'"
                            @click="chartMetric = 'km'">
                            Km
                        </button>
                    </div>
                </div>

                <div class="h-64 sm:h-80 flex justify-between gap-1 md:gap-4 items-end">
                    <!-- DEBUG INFO (Temporary) -->
                    <!-- <div class="absolute top-0 left-0 bg-red-500 text-white text-xs p-1">Metric: {{ chartMetric }} | MaxH: {{ maxMonthlyHours }}</div> -->
                    <div v-for="(m, i) in stats.months" :key="i"
                        class="relative flex-1 flex flex-col items-center justify-end h-full min-w-0 group">
                        <!-- Tooltip -->
                        <div
                            class="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all duration-200 transform translate-y-2 group-hover:translate-y-0 bg-gray-900/95 backdrop-blur border border-gray-700 p-3 rounded-xl shadow-2xl pointer-events-none z-30 w-max max-w-[200px] sm:max-w-none">
                            <div class="font-bold text-gray-100 mb-1 text-center border-b border-gray-800 pb-1">{{
                                getMonthName(i) }}</div>
                            <div class="grid grid-cols-2 gap-x-4 gap-y-1 text-xs mt-1">
                                <span class="text-gray-400 text-left">Ingressos</span>
                                <span class="font-mono text-emerald-400 text-right">{{ formatCurrency(m.income)
                                    }}</span>
                                <span class="text-gray-400 text-left">Hores</span>
                                <span class="font-mono text-yellow-400 text-right">{{ formatNumber(m.hours) }}h</span>
                                <span class="text-gray-400 text-left">Km</span>
                                <span class="font-mono text-blue-400 text-right">{{ formatNumber(m.km) }}</span>
                            </div>
                        </div>

                        <!-- Bar -->
                        <div class="w-full rounded-t-lg relative overflow-hidden transition-all duration-500 ease-out group-hover:brightness-110"
                            :class="{
                                'bg-emerald-500/80': chartMetric === 'income',
                                'bg-yellow-500/80': chartMetric === 'hours',
                                'bg-blue-500/80': chartMetric === 'km'
                            }" :style="{ height: `${getBarHeight(m)}%` }">
                            <!-- Gradient overlay for depth -->
                            <div
                                class="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent pointer-events-none" />
                            <!-- Top Highlight Line -->
                            <div class="absolute top-0 left-0 right-0 h-[2px] bg-white/40" />
                        </div>

                        <!-- Label -->
                        <div
                            class="mt-3 text-[10px] sm:text-xs text-gray-400 font-medium uppercase truncate w-full text-center tracking-wider">
                            {{ getMonthName(i).substring(0, 3) }}</div>
                    </div>
                </div>
            </section>

            <!-- Comparisons -->
            <section class="grid md:grid-cols-2 gap-8">
                <!-- Distances -->
                <div class="bg-gray-800/30 p-8 rounded-3xl border border-gray-700/50 backdrop-blur-sm">
                    <h3 class="text-2xl font-bold mb-6 flex items-center gap-2">
                        <UIcon name="i-heroicons-map" class="w-6 h-6 text-blue-500" />
                        On has arribat?
                    </h3>
                    <div class="space-y-6">
                        <div v-for="comp in comparisons" :key="comp.label" class="space-y-2">
                            <div class="flex justify-between text-sm">
                                <span class="font-medium text-gray-300">{{ comp.emoji }} {{ comp.label }}</span>
                                <span class="text-gray-500 text-xs">{{ formatNumber(comp.distance) }} km</span>
                            </div>
                            <div class="h-3 bg-gray-700 rounded-full overflow-hidden relative">
                                <div class="h-full bg-gradient-to-r from-blue-600 to-cyan-400 rounded-full transition-all duration-1000 ease-out"
                                    :style="{ width: `${comp.percentage}%` }" />
                            </div>
                            <div v-if="comp.completed"
                                class="text-xs text-green-400 font-bold text-right flex justify-end items-center gap-1">
                                <span>Completat! 🚀</span>
                                <span v-if="comp.timesCompleted > 1"
                                    class="bg-green-500/20 px-1.5 py-0.5 rounded text-green-300">x{{ comp.timesCompleted
                                    }}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Fun Stats / Highlights -->
                <div class="space-y-6">
                    <div
                        class="bg-gradient-to-br from-yellow-900/40 to-orange-900/40 p-8 rounded-3xl border border-yellow-700/30">
                        <h4 class="text-yellow-300 text-lg font-bold mb-2">Marató Laboral ⏱️</h4>
                        <div class="text-3xl font-black text-white mb-1">
                            {{ formatNumber(stats.totalDaysNonStop) }} dies
                        </div>
                        <div class="text-yellow-200/80">
                            És el temps que hauries passat treballant si no haguessis parat ni per dormir!
                        </div>
                    </div>

                    <div v-if="stats.mostActiveDay.date"
                        class="bg-gradient-to-br from-pink-900/40 to-purple-900/40 p-8 rounded-3xl border border-pink-700/30">
                        <h4 class="text-pink-300 text-lg font-bold mb-2">Dia més actiu 🔥</h4>
                        <div class="text-3xl font-black text-white mb-1">
                            {{ new Date(stats.mostActiveDay.date).toLocaleDateString('ca-ES', {
                                day: 'numeric', month:
                                    'long'
                            }) }}
                        </div>
                        <div class="text-pink-200/80">
                            Vas treballar <span class="font-bold text-white">{{ formatNumber(stats.mostActiveDay.hours)
                                }} hores</span> aquest dia.
                        </div>
                    </div>

                    <div v-if="stats.mostKmDay.date"
                        class="bg-gradient-to-br from-blue-900/40 to-cyan-900/40 p-8 rounded-3xl border border-blue-700/30">
                        <h4 class="text-blue-300 text-lg font-bold mb-2">Dia més viatger 🚗</h4>
                        <div class="text-3xl font-black text-white mb-1">
                            {{ new Date(stats.mostKmDay.date).toLocaleDateString('ca-ES', {
                                day: 'numeric', month:
                                    'long'
                            }) }}
                        </div>
                        <div class="text-blue-200/80">
                            Vas recórrer <span class="font-bold text-white">{{ formatNumber(stats.mostKmDay.km) }}
                                km</span>.
                        </div>
                        <div v-if="stats.mostKmDay.route && stats.mostKmDay.route.length > 0"
                            class="mt-3 pt-3 border-t border-blue-500/30 text-xs text-blue-100 font-mono leading-relaxed break-words">
                            <span class="opacity-70">Ruta:</span> {{ stats.mostKmDay.route.join(' → ') }}
                        </div>
                    </div>

                    <div
                        class="bg-gray-800/30 p-8 rounded-3xl border border-gray-700/50 flex flex-col justify-center items-center text-center space-y-4">
                        <h4 class="text-gray-400 font-medium">Descarrega el teu report</h4>
                        <div class="flex flex-col w-full gap-3">
                            <UButton block :loading="loading" color="primary" size="xl" variant="solid"
                                icon="i-heroicons-share" @click="handlePdf">
                                Compartir PDF
                            </UButton>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    </div>
</template>

<style scoped>
/* Additional animations if needed */
</style>
