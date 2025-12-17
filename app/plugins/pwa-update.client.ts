import { watch } from 'vue'
import { useRegisterSW } from 'virtual:pwa-register/vue'

const UPDATE_AVAILABLE_STATE = 'swUpdateAvailable'
const UPDATE_TRIGGER_STATE = 'swUpdateTrigger'

export default defineNuxtPlugin(() => {
  if (!process.client) {
    return
  }

  const updateAvailable = useState<boolean>(UPDATE_AVAILABLE_STATE, () => false)
  const triggerUpdate = useState<(() => void) | null>(UPDATE_TRIGGER_STATE, () => null)

  const { needRefresh, updateServiceWorker } = useRegisterSW({
    onNeedRefresh() {
      updateAvailable.value = true
    }
  })

  triggerUpdate.value = () => {
    updateServiceWorker(true)
    updateAvailable.value = false
  }

  watch(needRefresh, (value) => {
    if (value) {
      updateAvailable.value = true
    }
  })
})
