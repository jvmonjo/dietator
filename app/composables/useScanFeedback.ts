export const useScanFeedback = () => {
    // Shared state for AudioContext to persist across component mounts if needed,
    // though usually we just need it available globally or singleton-ish.
    // Putting it outside the function might be better for a singleton pattern,
    // but inside a composable with a ref/state outside is tighter for Nuxt.
    // For simplicity, let's keep a module-level variable for the context.

    const initAudio = async () => {
        try {
            const AudioContextClass = window.AudioContext || window.webkitAudioContext
            if (!AudioContextClass) return

            if (!window.scanAudioContext) {
                window.scanAudioContext = new AudioContextClass()
            }

            if (window.scanAudioContext.state === 'suspended') {
                await window.scanAudioContext.resume()
            }

            // Optional: Play a silent sound to really force the wake up if needed, 
            // but resume() inside a click handler is usually sufficient for iOS.
        } catch (e) {
            console.error('Failed to initialize audio context:', e)
        }
    }

    const triggerFeedback = () => {
        // Haptic Feedback
        if (navigator.vibrate) {
            navigator.vibrate(200)
        }

        // Audio Feedback
        try {
            if (!window.scanAudioContext) {
                // Fallback attempt to create it, though typically won't work on iOS without gesture
                const AudioContextClass = window.AudioContext || window.webkitAudioContext
                if (AudioContextClass) window.scanAudioContext = new AudioContextClass()
            }

            if (window.scanAudioContext) {
                const ctx = window.scanAudioContext
                const oscillator = ctx.createOscillator()
                const gainNode = ctx.createGain()

                oscillator.type = 'sine'
                oscillator.frequency.setValueAtTime(880, ctx.currentTime) // A5

                // Beep envelope
                gainNode.gain.setValueAtTime(0.1, ctx.currentTime)
                gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1)

                oscillator.connect(gainNode)
                gainNode.connect(ctx.destination)

                oscillator.start()
                oscillator.stop(ctx.currentTime + 0.1)
            }
        } catch (e) {
            console.error('Error playing scan sound:', e)
        }
    }

    return {
        initAudio,
        triggerFeedback
    }
}

// Add type augmentation for the global window object to store the context
declare global {
    interface Window {
        scanAudioContext?: AudioContext
        webkitAudioContext?: typeof AudioContext
    }
}
