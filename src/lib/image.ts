/** Image decoding, downscaling and the per-file dispatch to the PDF renderer. */

export type RenderedDoc = { images: string[]; thumbs: string[]; pageCount: number }

export const THUMB_WIDTH = 260
const MAX_EDGE = 2000

export function toJpeg(canvas: HTMLCanvasElement, quality = 0.85): string {
  return canvas.toDataURL('image/jpeg', quality)
}

export function makeThumb(source: HTMLCanvasElement, width = THUMB_WIDTH): string {
  const scale = Math.min(1, width / Math.max(1, source.width))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(source.width * scale))
  canvas.height = Math.max(1, Math.round(source.height * scale))
  const ctx = canvas.getContext('2d')
  if (!ctx) return source.toDataURL('image/jpeg', 0.6)
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height)
  return canvas.toDataURL('image/jpeg', 0.6)
}

function fit(width: number, height: number, maxEdge: number): { width: number; height: number } {
  const longest = Math.max(width, height)
  if (longest <= maxEdge) return { width, height }
  const scale = maxEdge / longest
  return { width: Math.round(width * scale), height: Math.round(height * scale) }
}

type Decoded = { source: CanvasImageSource; width: number; height: number; dispose: () => void }

async function decodeImage(file: File): Promise<Decoded> {
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
      return {
        source: bitmap,
        width: bitmap.width,
        height: bitmap.height,
        dispose: () => bitmap.close(),
      }
    } catch {
      // Some formats (BMP on older engines) need the <img> path below.
    }
  }

  const url = URL.createObjectURL(file)
  const image = new Image()
  image.src = url
  try {
    await image.decode()
  } catch {
    URL.revokeObjectURL(url)
    throw new Error('This image could not be read. Try JPEG, PNG or WebP.')
  }
  return {
    source: image,
    width: image.naturalWidth,
    height: image.naturalHeight,
    dispose: () => URL.revokeObjectURL(url),
  }
}

export async function imageFileToPage(file: File): Promise<{ image: string; thumb: string }> {
  const decoded = await decodeImage(file)
  try {
    const size = fit(decoded.width, decoded.height, MAX_EDGE)
    if (!size.width || !size.height) throw new Error('This image has no readable pixels')
    const canvas = document.createElement('canvas')
    canvas.width = size.width
    canvas.height = size.height
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas 2D is not available in this browser')
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(decoded.source, 0, 0, canvas.width, canvas.height)
    return { image: toJpeg(canvas, 0.85), thumb: makeThumb(canvas) }
  } finally {
    decoded.dispose()
  }
}

/** Images render to one "page"; PDFs are rasterised page by page in pdf.ts. */
export async function renderDocument(file: File): Promise<RenderedDoc> {
  if (file.type === 'application/pdf' || /\.pdf$/i.test(file.name)) {
    const { pdfToPages } = await import('./pdf')
    return pdfToPages(file)
  }
  const page = await imageFileToPage(file)
  return { images: [page.image], thumbs: [page.thumb], pageCount: 1 }
}
