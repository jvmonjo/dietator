<script setup lang="ts">
const settingsStore = useSettingsStore()
const toast = useToast()
const { provinces, getMunicipalities } = useLocations()

const formState = reactive({
  dietPrice: settingsStore.dietPrice || 0,
  originProvince: settingsStore.originProvince || '',
  originMunicipality: settingsStore.originMunicipality || ''
})

const saveSettings = () => {
  const normalizedPrice = Number(formState.dietPrice) || 0
  settingsStore.updateDietPrice(normalizedPrice)
  settingsStore.updateOrigin(formState.originProvince, formState.originMunicipality)
  toast.add({ title: 'Configuracio guardada', color: 'success' })
}
</script>

<template>
  <div class="max-w-2xl mx-auto space-y-6">
    <div class="flex items-start justify-between gap-4">
      <div class="space-y-2">
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>
        <p class="text-gray-600 dark:text-gray-400">
          Marca el preu de la dieta. Les estadistiques usaran: dinar o sopar = 0.5 dieta, dinar i sopar = 1 dieta.
        </p>
      </div>
      <UButton to="/stats" icon="i-heroicons-chart-bar" variant="ghost">Veure estadistiques</UButton>
    </div>

    <UCard>
      <template #header>
        <div class="flex items-center gap-3">
          <div class="p-2 bg-primary-50 dark:bg-primary-900/40 rounded-lg">
            <UIcon name="i-heroicons-cog-6-tooth" class="w-6 h-6 text-primary-500" />
          </div>
          <div>
            <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Preu de la dieta</h2>
            <p class="text-sm text-gray-500 dark:text-gray-400">Usarem aquest import per calcular totals.</p>
          </div>
        </div>
      </template>

      <UForm :state="formState" class="space-y-6" @submit="saveSettings">
        <UFormField label="Preu per dieta" name="dietPrice" hint="Introdueix l'import complet (dinar i sopar).">
          <UInput
            v-model.number="formState.dietPrice"
            type="number"
            step="0.01"
            min="0"
            icon="i-heroicons-currency-euro"
            inputmode="decimal"
          />
        </UFormField>

        <div class="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
          <span>Dinar o sopar: 0.5 dieta</span>
          <span>Dinar i sopar: 1 dieta</span>
        </div>

        <USeparator label="Origen dels desplaçaments" />

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <UFormField label="Província d'origen" name="originProvince">
            <ProvinceSelect
              v-model="formState.originProvince"
              :items="provinces"
              placeholder="Tria província"
              @update:model-value="formState.originMunicipality = ''"
            />
          </UFormField>

          <UFormField label="Municipi d'origen" name="originMunicipality">
            <MunicipalitySelect
              v-model="formState.originMunicipality"
              :items="getMunicipalities(formState.originProvince)"
              :disabled="!formState.originProvince"
              placeholder="Tria municipi"
            />
          </UFormField>
        </div>

        <div class="flex gap-3 pt-2">
          <UButton type="submit" icon="i-heroicons-check-circle">Desar configuracio</UButton>
          <UButton to="/" variant="ghost" icon="i-heroicons-arrow-left">Tornar a l'inici</UButton>
        </div>
      </UForm>
    </UCard>
  </div>
</template>
