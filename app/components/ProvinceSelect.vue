<script setup lang="ts">
const props = withDefaults(defineProps<{
  modelValue: string
  items?: string[]
  disabled?: boolean
  placeholder?: string
}>(), {
  items: () => [],
  disabled: false,
  placeholder: 'Select province'
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
    searchable-placeholder="Search province..."
    :placeholder="props.placeholder"
    icon="i-heroicons-map"
    class="w-full"
    @update:model-value="updateValue"
  />
</template>
