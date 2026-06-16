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

// Compress an image blob/file (e.g. a cropped canvas blob) into a data URL.
export async function compressImageToDataUrl(input: Blob, name = 'ticket.jpg'): Promise<ProcessedTicket> {
    const file = input instanceof File
        ? input
        : new File([input], name, { type: input.type || 'image/jpeg' })

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
