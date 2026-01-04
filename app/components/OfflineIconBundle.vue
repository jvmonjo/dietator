<script setup lang="ts">
/* 
 * This component is used to force specific icons to be bundled by the Nuxt Icon scanner.
 * These icons are used internally by Nuxt UI components (Calendar, Select, etc.) but
 * are not automatically detected because they are not explicit in the template source.
 */
</script>

<template>
    <div class="hidden">
        <!-- Calendar Navigation -->
        <UIcon name="i-heroicons-chevron-left-20-solid" />
        <UIcon name="i-heroicons-chevron-right-20-solid" />

        <!-- Select/Dropdowns -->
        <UIcon name="i-heroicons-chevron-down-20-solid" />
        <UIcon name="i-heroicons-chevron-up-20-solid" />

        <!-- Fallback/Generic sizes -->
        <UIcon name="i-heroicons-chevron-left" />
        <UIcon name="i-heroicons-chevron-right" />
        <UIcon name="i-heroicons-chevron-down" />
        <UIcon name="i-heroicons-chevron-up" />
    </div>
</template>
