const UPDATE_AVAILABLE_STATE = 'swUpdateAvailable'
const UPDATE_TRIGGER_STATE = 'swUpdateTrigger'

const setWaitingListener = (registration: ServiceWorkerRegistration, onUpdate: () => void) => {
  if (!registration.installing) return
  const worker = registration.installing
  worker.addEventListener('statechange', () => {
    if (worker.state === 'installed' && navigator.serviceWorker.controller) {
      onUpdate()
    }
  })
}

export default defineNuxtPlugin(() => {
  if (!process.client || !('serviceWorker' in navigator)) {
    return
  }

  const updateAvailable = useState<boolean>(UPDATE_AVAILABLE_STATE, () => false)
  const triggerUpdate = useState<(() => void) | null>(UPDATE_TRIGGER_STATE, () => null)

  let currentRegistration: ServiceWorkerRegistration | null = null

  const highlightUpdate = () => {
    updateAvailable.value = true
  }

  const refreshController = () => {
    if (updateAvailable.value) {
      window.location.reload()
    }
  }

  navigator.serviceWorker.addEventListener('controllerchange', refreshController)

  const watchRegistration = (registration: ServiceWorkerRegistration) => {
    currentRegistration = registration
    if (registration.waiting) {
      highlightUpdate()
    }
    registration.addEventListener('updatefound', () => setWaitingListener(registration, highlightUpdate))
    setWaitingListener(registration, highlightUpdate)
  }

  navigator.serviceWorker.ready.then(watchRegistration)

  triggerUpdate.value = () => {
    if (!currentRegistration?.waiting) {
      return
    }
    currentRegistration.waiting.postMessage({ type: 'SKIP_WAITING' })
    updateAvailable.value = false
  }
})
