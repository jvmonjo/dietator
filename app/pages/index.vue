<template>
  <div class="space-y-8">
    <!-- Hero Section -->
    <section class="text-center space-y-4 py-8">
      <h1 class="text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight">
        Welcome to <span class="text-primary-500">Dietator</span>
      </h1>
      <p class="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
        Track your services, meals, and allowances efficiently. Offline-first and always ready.
      </p>
    </section>

    <!-- Main Action -->
    <section>
      <ServiceForm />
    </section>

    <!-- Quick Stats Preview (Placeholder) -->
    <section class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <UCard>
        <div class="text-center">
          <div class="text-3xl font-bold text-primary-500">0</div>
          <div class="text-sm text-gray-500 dark:text-gray-400">Services This Month</div>
        </div>
      </UCard>
      <UCard>
        <div class="text-center">
          <div class="text-3xl font-bold text-primary-500">€0.00</div>
          <div class="text-sm text-gray-500 dark:text-gray-400">Allowance Earned</div>
        </div>
      </UCard>
      <UCard>
        <div class="text-center">
          <div class="text-3xl font-bold text-primary-500">0</div>
          <div class="text-sm text-gray-500 dark:text-gray-400">Pending Sync</div>
        </div>
      </UCard>
    </section>
  </div>
</template>
