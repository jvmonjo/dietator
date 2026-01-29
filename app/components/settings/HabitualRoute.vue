<script setup lang="ts">
// Define local type since useLocations does not export it
type Province = { label: string; value: string }

interface RoutePoint {
    id: string
    province: string
    municipality: string
    hasLunch: boolean
    hasDinner: boolean
    observations?: string
}

const props = defineProps<{
    modelValue: RoutePoint[]
    provinces: Province[]
}>()

const emit = defineEmits<{
    (e: 'update:modelValue', value: RoutePoint[]): void
}>()

const isHabitualRouteOpen = ref(false)

const habitualRouteSummary = computed(() => {
    if (!props.modelValue || props.modelValue.length === 0) return ''
    const cities = props.modelValue
        .map(d => d.municipality)
        .filter(m => m && m.trim().length > 0)

    if (cities.length === 0) return ''
    return cities.join(' → ')
})

// Proxy for v-model working with props
const route = computed({
    get: () => props.modelValue,
    set: (val) => emit('update:modelValue', val)
})
</script>

<template>
    <UCard>
        <template #header>
            <button
type="button" class="flex items-center justify-between w-full text-left"
                @click="isHabitualRouteOpen = !isHabitualRouteOpen">
                <div class="flex-1 min-w-0 flex items-center gap-3">
                    <div class="p-2 bg-primary-50 dark:bg-primary-900/40 rounded-lg">
                        <UIcon name="i-heroicons-map" class="w-6 h-6 text-primary-500" />
                    </div>
                    <div class="min-w-0 flex-1">
                        <h2 class="text-xl font-semibold text-gray-900 dark:text-white">{{
                            $t('settings.habitual_route.title') }}
                        </h2>
                        <p class="text-sm text-gray-500 dark:text-gray-400">{{ $t('settings.habitual_route.description')
                            }}</p>
                        <div
v-if="habitualRouteSummary"
                            class="mt-2 text-sm text-primary-600 dark:text-primary-400 font-medium break-words">
                            {{ habitualRouteSummary }}
                        </div>
                    </div>
                </div>
                <UIcon
name="i-heroicons-chevron-down" class="w-5 h-5 text-gray-500 transition-transform duration-200"
                    :class="{ 'rotate-180': isHabitualRouteOpen }" />
            </button>
        </template>

        <div v-show="isHabitualRouteOpen" class="space-y-4">
            <DisplacementListEditor v-model="route" :provinces="provinces" />
            <p class="text-xs text-gray-500 dark:text-gray-400">
                Nota: Aquests desplaçaments es guardaran quan facis clic a "Desar configuració".
                Les dades s'utilitzaran com a plantilla per als nous serveis.
            </p>
        </div>
    </UCard>
</template>
