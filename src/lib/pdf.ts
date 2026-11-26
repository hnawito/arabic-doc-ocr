/** Rasterise scanned PDF pages to JPEG images with pdf.js (runs entirely in the browser). */

import * as pdfjs from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import { makeThumb, toJpeg, type RenderedDoc } from './image'

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl

const TARGET_WIDTH = 1500
const MIN_SCALE = 0.6
const MAX_SCALE = 2.5

export async function pdfToPages(file: File): Promise<RenderedDoc> {
  const data = new Uint8Array(await file.arrayBuffer())
  const pdf = await pdfjs.getDocument({ data }).promise
  const images: string[] = []
  const thumbs: string[] = []

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber)
    const base = page.getViewport({ scale: 1 })
    const scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, TARGET_WIDTH / base.width))
    const viewport = page.getViewport({ scale })

    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.ceil(viewport.width))
    canvas.height = Math.max(1, Math.ceil(viewport.height))
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas 2D is not available in this browser')
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    await page.render({ canvasContext: ctx, viewport }).promise
    images.push(toJpeg(canvas, 0.85))
    thumbs.push(makeThumb(canvas))
    canvas.width = 0
    canvas.height = 0
  }

  return { images, thumbs, pageCount: pdf.numPages }
}
