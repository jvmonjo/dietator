<template>
  <UApp>
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
    <ClientOnly>
      <PwaUpdateNotification />
    </ClientOnly>
  </UApp>
</template>
