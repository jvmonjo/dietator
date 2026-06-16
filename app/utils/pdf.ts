// Render PDF pages to raster images. OCR (tesseract.js) only reads images, so a
// PDF ticket has to be rasterised first. pdfjs-dist and its worker are loaded
// lazily — only when the user asks to scan a PDF ticket.

// Upscale factor: PDFs render at a higher resolution so OCR text stays legible.
const RENDER_SCALE = 2

let workerConfigured = false

const dataUrlToBytes = (dataUrl: string): Uint8Array => {
  const base64 = dataUrl.slice(dataUrl.indexOf(',') + 1)
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

// Render up to `maxPages` pages of a PDF (given as a data URL) to PNG data URLs.
export async function renderPdfToImages(dataUrl: string, maxPages = 3): Promise<string[]> {
  const pdfjs = await import('pdfjs-dist')

  if (!workerConfigured) {
    // Vite resolves the `?url` suffix to the emitted worker asset URL.
    const workerUrl = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default as string
    pdfjs.GlobalWorkerOptions.workerSrc = workerUrl
    workerConfigured = true
  }

  const pdf = await pdfjs.getDocument({ data: dataUrlToBytes(dataUrl) }).promise
  const pageCount = Math.min(pdf.numPages, maxPages)
  const images: string[] = []

  for (let pageNumber = 1; pageNumber <= pageCount; pageNumber++) {
    const page = await pdf.getPage(pageNumber)
    const viewport = page.getViewport({ scale: RENDER_SCALE })
    const canvas = document.createElement('canvas')
    canvas.width = Math.ceil(viewport.width)
    canvas.height = Math.ceil(viewport.height)
    const ctx = canvas.getContext('2d')
    if (!ctx) continue
    await page.render({ canvasContext: ctx, viewport }).promise
    images.push(canvas.toDataURL('image/png'))
  }

  await pdf.cleanup()
  return images
}
