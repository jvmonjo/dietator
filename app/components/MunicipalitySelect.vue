<script setup lang="ts">
type SelectOption = { label: string, value: string }

const props = withDefaults(defineProps<{
  modelValue: string
  items?: SelectOption[]
  disabled?: boolean
  placeholder?: string
}>(), {
  items: () => [],
  disabled: false,
  placeholder: 'Select municipality'
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const updateValue = (value: string) => {
  emit('update:modelValue', value)
}
</script>

<template>
  <USelectMenu
    :model-value="props.modelValue"
    :items="props.items"
    :disabled="props.disabled"
    searchable
    searchable-placeholder="Search municipality..."
    :placeholder="props.placeholder"
    icon="i-heroicons-map-pin"
    class="w-full"
    value-key="value"
    label-key="label"
    @update:model-value="updateValue"
  />
</template>

<style scoped>
:deep(input) {
  background-color: rgb(255 255 255 / var(--tw-bg-opacity, 1));
}
.dark :deep(input) {
  background-color: rgb(17 24 39 / var(--tw-bg-opacity, 1));
}

/* Force background on the dropdown container */
:deep(.absolute) {
  background-color: rgb(255 255 255 / 1);
  z-index: 100;
}
.dark :deep(.absolute) {
  background-color: rgb(17 24 39 / 1);
  z-index: 100;
}
</style>
