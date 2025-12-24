<script setup lang="ts">
import { useSortable } from '@vueuse/integrations/useSortable'
import type { Displacement } from '~/stores/services'

// Local helper to avoid importing uuid library if not absolutely needed or to keep it simple
const uuidv4 = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

// Define the shape of a displacement in the form/editor
// It extends the store Displacement but enforces an 'id' for list management
export type FormDisplacement = Displacement & { id: string }

const props = defineProps<{
    modelValue: FormDisplacement[]
    provinces: { label: string; value: string }[]
}>()

const emit = defineEmits<{
    (e: 'update:modelValue', value: FormDisplacement[]): void
}>()

const { getMunicipalities } = useLocations()

// Sortable setup
const displacementListRef = ref<HTMLElement | null>(null)
// We need a writable computed or similar to bridge v-model and useSortable if we want drag & drop to update the parent
// flexible way:
const localDisplacements = computed({
    get: () => props.modelValue,
    set: (val) => emit('update:modelValue', val)
})

useSortable(displacementListRef, localDisplacements, {
    handle: '.drag-handle',
    animation: 150
})

const createEmptyDisplacement = (): FormDisplacement => ({
    id: uuidv4(),
    province: '',
    municipality: '',
    hasLunch: false,
    hasDinner: false,
    observations: ''
})

const addDisplacement = () => {
    const newList = [...props.modelValue, createEmptyDisplacement()]
    emit('update:modelValue', newList)
}

const removeDisplacement = (index: number) => {
    const newList = [...props.modelValue]
    newList.splice(index, 1)
    emit('update:modelValue', newList)
}

const duplicateDisplacement = (index: number) => {
    const original = props.modelValue[index]
    if (!original) return

    const copy: FormDisplacement = {
        ...original,
        id: uuidv4(),
        hasLunch: false,
        hasDinner: false,
        province: original.province || '',
        municipality: original.municipality || ''
    }
    const newList = [...props.modelValue]
    newList.splice(index + 1, 0, copy)
    emit('update:modelValue', newList)
    useToast().add({ title: 'Desplaçament duplicat', color: 'success' })
}
</script>

<template>
    <div ref="displacementListRef" class="space-y-4">
        <div
v-for="(displacement, index) in modelValue" :key="displacement.id"
            class="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 relative group transition-all hover:border-primary-200 dark:hover:border-primary-800">
            <div class="absolute top-4 right-4 flex items-center gap-2">
                <UIcon
name="i-heroicons-bars-3"
                    class="w-5 h-5 text-gray-400 cursor-move drag-handle hover:text-gray-600 dark:hover:text-gray-300" />

                <UTooltip text="Duplicar desplaçament">
                    <UButton
icon="i-heroicons-document-duplicate" color="neutral" variant="ghost" size="xs"
                        @click="duplicateDisplacement(index)" />
                </UTooltip>

                <UButton
v-if="modelValue.length > 1" icon="i-heroicons-trash" color="error" variant="ghost" size="xs"
                    @click="removeDisplacement(index)" />
            </div>

            <div class="grid grid-cols-1 gap-4 pr-8">
                <UFormField label="Província" :name="`displacements.${index}.province`" required>
                    <ProvinceSelect
v-model="displacement.province" :items="provinces"
                        placeholder="Selecciona província" @update:model-value="displacement.municipality = ''" />
                </UFormField>

                <UFormField label="Municipi" :name="`displacements.${index}.municipality`" required>
                    <MunicipalitySelect
v-model="displacement.municipality"
                        :items="getMunicipalities(displacement.province)" :disabled="!displacement.province"
                        placeholder="Selecciona municipi" />
                </UFormField>

                <div class="flex flex-wrap gap-4">
                    <UCheckbox
v-model="displacement.hasLunch" label="Dinar inclòs"
                        :disabled="modelValue.some((d, idx) => idx !== index && d.hasLunch)"
                        :ui="{ base: 'w-5 h-5', container: 'flex items-center' }" />
                    <UCheckbox
v-model="displacement.hasDinner" label="Sopar inclòs"
                        :disabled="modelValue.some((d, idx) => idx !== index && d.hasDinner)"
                        :ui="{ base: 'w-5 h-5', container: 'flex items-center' }" />
                </div>

                <UFormField label="Observacions" :name="`displacements.${index}.observations`">
                    <UTextarea
v-model="displacement.observations"
                        placeholder="Detalls addicionals d'aquest desplaçament..." icon="i-heroicons-pencil-square"
                        class="w-full" />
                </UFormField>
            </div>
        </div>

        <UButton
icon="i-heroicons-plus-circle" variant="soft" block
            class="border-dashed border-2 border-gray-300 dark:border-gray-700 hover:border-primary-500 dark:hover:border-primary-500"
            @click="addDisplacement">
            Afegir un altre desplaçament
        </UButton>
    </div>
</template>
