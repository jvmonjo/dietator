// Helpers to turn an uploaded/captured receipt ("ticket") into a data URL that
// can be persisted locally alongside the expense. Images are downscaled and
// re-encoded to keep localStorage usage reasonable; other files (e.g. PDFs) are
// stored as-is but capped in size.

export const MAX_TICKET_BYTES = 3 * 1024 * 1024 // 3 MB after processing
const MAX_IMAGE_DIMENSION = 1600 // px, longest side
const IMAGE_QUALITY = 0.7

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

const readFileAsDataUrl = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = () => reject(new TicketProcessingError('error'))
        reader.readAsDataURL(file)
    })

// Approximate decoded byte size of a base64 data URL without allocating a Blob.
const dataUrlByteSize = (dataUrl: string): number => {
    const base64 = dataUrl.slice(dataUrl.indexOf(',') + 1)
    const padding = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0
    return Math.floor((base64.length * 3) / 4) - padding
}

const compressImage = (dataUrl: string, type: string): Promise<string> =>
    new Promise((resolve, reject) => {
        const img = new Image()
        img.onload = () => {
            const scale = Math.min(1, MAX_IMAGE_DIMENSION / Math.max(img.width, img.height))
            const width = Math.round(img.width * scale)
            const height = Math.round(img.height * scale)

            const canvas = document.createElement('canvas')
            canvas.width = width
            canvas.height = height
            const ctx = canvas.getContext('2d')
            if (!ctx) {
                // Canvas unsupported: fall back to the original data URL.
                resolve(dataUrl)
                return
            }
            ctx.drawImage(img, 0, 0, width, height)
            // PNG screenshots compress far better as JPEG; keep transparency-free output.
            const outputType = type === 'image/png' ? 'image/jpeg' : type
            resolve(canvas.toDataURL(outputType, IMAGE_QUALITY))
        }
        img.onerror = () => reject(new TicketProcessingError('error'))
        img.src = dataUrl
    })

export async function processTicketFile(file: File): Promise<ProcessedTicket> {
    const isImage = file.type.startsWith('image/')
    const isPdf = file.type === 'application/pdf'
    if (!isImage && !isPdf) {
        throw new TicketProcessingError('invalid')
    }

    const original = await readFileAsDataUrl(file)
    let dataUrl = original

    if (isImage) {
        try {
            dataUrl = await compressImage(original, file.type)
            // Keep whichever encoding is smaller (compression can grow tiny images).
            if (dataUrlByteSize(dataUrl) > dataUrlByteSize(original)) {
                dataUrl = original
            }
        } catch {
            dataUrl = original
        }
    }

    if (dataUrlByteSize(dataUrl) > MAX_TICKET_BYTES) {
        throw new TicketProcessingError('too_large')
    }

    return {
        dataUrl,
        name: file.name || 'ticket',
        type: isImage ? (file.type === 'image/png' ? 'image/jpeg' : file.type) : file.type
    }
}
