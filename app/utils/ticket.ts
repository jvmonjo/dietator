// Helpers to turn an uploaded/captured/cropped receipt ("ticket") into a data
// URL that can be persisted locally alongside the expense. Images are
// aggressively compressed with browser-image-compression (web worker, JPEG,
// size-targeted) to keep localStorage usage low; PDFs are stored as-is but
// capped in size.
import imageCompression from 'browser-image-compression'

export const MAX_TICKET_BYTES = 3 * 1024 * 1024 // 3 MB hard cap after processing

// Receipts are mostly text, so we target a small file while keeping enough
// resolution to stay legible. browser-image-compression iterates quality/scale
// until it reaches maxSizeMB (or gives its best effort).
const IMAGE_COMPRESSION_OPTIONS = {
    maxSizeMB: 0.3,
    maxWidthOrHeight: 1600,
    useWebWorker: true,
    fileType: 'image/jpeg',
    initialQuality: 0.6
}

export interface ProcessedTicket {
    dataUrl: string
    name: string
    type: string
}

export type TicketError = 'invalid' | 'too_large' | 'error'

export class TicketProcessingError extends Error {
    reason: TicketError
    constructor(reason: TicketError) {
        super(`Ticket processing failed: ${reason}`)
        this.reason = reason
    }
}

export const isImageFile = (file: File | Blob): boolean => file.type.startsWith('image/')

// Approximate decoded byte size of a base64 data URL without allocating a Blob.
const dataUrlByteSize = (dataUrl: string): number => {
    const base64 = dataUrl.slice(dataUrl.indexOf(',') + 1)
    const padding = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0
    return Math.floor((base64.length * 3) / 4) - padding
}

const readFileAsDataUrl = (file: Blob): Promise<string> =>
    new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = () => reject(new TicketProcessingError('error'))
        reader.readAsDataURL(file)
    })

// Read any selected file as a data URL so it can be shown in the cropper.
export const fileToDataUrl = (file: Blob): Promise<string> => readFileAsDataUrl(file)

const withJpgExtension = (name: string): string => {
    const base = name.replace(/\.[^.]+$/, '')
    return `${base || 'ticket'}.jpg`
}

// Convert an image blob to a grayscale, contrast-boosted "document scan" look.
// Grayscale JPEGs are both cleaner and noticeably smaller than colour photos.
const applyGrayscale = (input: Blob): Promise<Blob> =>
    new Promise((resolve, reject) => {
        const url = URL.createObjectURL(input)
        const img = new Image()
        img.onload = () => {
            const canvas = document.createElement('canvas')
            canvas.width = img.naturalWidth
            canvas.height = img.naturalHeight
            const ctx = canvas.getContext('2d')
            if (!ctx) {
                URL.revokeObjectURL(url)
                resolve(input)
                return
            }
            ctx.drawImage(img, 0, 0)
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
            const data = imageData.data
            // Luminance + mild contrast so text pops, mimicking a scanner.
            const contrast = 1.2
            const intercept = 128 * (1 - contrast)
            for (let i = 0; i < data.length; i += 4) {
                const lum = 0.299 * data[i]! + 0.587 * data[i + 1]! + 0.114 * data[i + 2]!
                const v = Math.max(0, Math.min(255, contrast * lum + intercept))
                data[i] = data[i + 1] = data[i + 2] = v
            }
            ctx.putImageData(imageData, 0, 0)
            URL.revokeObjectURL(url)
            canvas.toBlob(out => resolve(out || input), 'image/jpeg', 0.9)
        }
        img.onerror = () => {
            URL.revokeObjectURL(url)
            reject(new TicketProcessingError('error'))
        }
        img.src = url
    })

interface CompressOptions {
    grayscale?: boolean
}

// Compress an image blob/file (e.g. a cropped canvas blob) into a data URL.
export async function compressImageToDataUrl(
    input: Blob, name = 'ticket.jpg', options: CompressOptions = {}
): Promise<ProcessedTicket> {
    let source = input
    if (options.grayscale) {
        try {
            source = await applyGrayscale(input)
        } catch {
            source = input // Fall back to the original on any canvas failure.
        }
    }

    const file = source instanceof File
        ? source
        : new File([source], name, { type: source.type || 'image/jpeg' })

    let dataUrl: string
    try {
        const compressed = await imageCompression(file, IMAGE_COMPRESSION_OPTIONS)
        dataUrl = await imageCompression.getDataUrlFromFile(compressed)
    } catch {
        throw new TicketProcessingError('error')
    }

    if (dataUrlByteSize(dataUrl) > MAX_TICKET_BYTES) {
        throw new TicketProcessingError('too_large')
    }

    return { dataUrl, name: withJpgExtension(name), type: 'image/jpeg' }
}

// Non-image tickets (currently PDFs) are stored as-is, capped in size.
export async function processDocumentFile(file: File): Promise<ProcessedTicket> {
    if (file.type !== 'application/pdf') {
        throw new TicketProcessingError('invalid')
    }
    const dataUrl = await readFileAsDataUrl(file)
    if (dataUrlByteSize(dataUrl) > MAX_TICKET_BYTES) {
        throw new TicketProcessingError('too_large')
    }
    return { dataUrl, name: file.name || 'ticket.pdf', type: file.type }
}

// Process a selected file without an explicit crop step: images are compressed,
// other supported files (PDF) are stored as-is.
export async function processTicketFile(file: File): Promise<ProcessedTicket> {
    if (isImageFile(file)) return compressImageToDataUrl(file, file.name)
    return processDocumentFile(file)
}
