/** Build the one-row-per-file workbook and deliver it: download, native share, or a message link. */

import * as XLSX from 'xlsx'
import { COLUMNS, cellValue } from './columns'
import type { QueueItem } from './schema'

const MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

export type SendTarget = 'whatsapp' | 'email'

function workbookName(): string {
  return `arabic-ocr-${new Date().toISOString().slice(0, 10)}.xlsx`
}

function buildWorkbook(items: QueueItem[]): XLSX.WorkBook | null {
  if (items.length === 0) return null

  const headers = COLUMNS.map((column) => column.header)
  const rows = items.map((item) => COLUMNS.map((column) => cellValue(item, column)))

  const sheet = XLSX.utils.aoa_to_sheet([headers, ...rows])
  sheet['!cols'] = COLUMNS.map((column) => ({ wch: column.width }))
  sheet['!autofilter'] = {
    ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: rows.length, c: headers.length - 1 } }),
  }
  sheet['!rows'] = [{ hpx: 22 }]

  const workbook = XLSX.utils.book_new()
  workbook.Workbook = { Views: [{ RTL: true }] }
  XLSX.utils.book_append_sheet(workbook, sheet, 'Documents')
  return workbook
}

/** Save the .xlsx; returns the file name so callers can mention it. */
export function downloadWorkbook(items: QueueItem[]): string | null {
  const workbook = buildWorkbook(items)
  if (!workbook) return null
  const name = workbookName()
  XLSX.writeFile(workbook, name, { compression: true })
  return name
}

/** True when this browser can hand files to the OS share sheet (WhatsApp, Mail…). */
export function canShareFiles(): boolean {
  if (typeof navigator === 'undefined' || typeof navigator.canShare !== 'function') return false
  try {
    return navigator.canShare({ files: [new File([''], 'probe.xlsx', { type: MIME })] })
  } catch {
    return false
  }
}

/** Share the workbook itself; a dismissed sheet is not an error. */
export async function shareWorkbook(items: QueueItem[]): Promise<void> {
  const workbook = buildWorkbook(items)
  if (!workbook || typeof navigator === 'undefined' || typeof navigator.share !== 'function') return
  const bytes = XLSX.write(workbook, { bookType: 'xlsx', type: 'array', compression: true })
  const file = new File([bytes], workbookName(), { type: MIME })
  if (typeof navigator.canShare === 'function' && !navigator.canShare({ files: [file] })) return
  try {
    await navigator.share({ files: [file], title: 'Arabic document OCR' })
  } catch (error) {
    if (!(error instanceof DOMException && error.name === 'AbortError')) throw error
  }
}

/**
 * For browsers without file sharing: download the workbook, then open WhatsApp or an email
 * draft with a message asking the user to attach the downloaded file.
 */
export function sendFallback(items: QueueItem[], target: SendTarget): boolean {
  const file = downloadWorkbook(items)
  if (!file) return false
  const message = encodeURIComponent(
    `Arabic document OCR — ${items.length} file(s). The workbook ${file} was just downloaded, so attach it to this message.`,
  )
  const link = document.createElement('a')
  link.href =
    target === 'whatsapp'
      ? `https://wa.me/?text=${message}`
      : `mailto:?subject=${encodeURIComponent('Arabic document OCR')}&body=${message}`
  link.rel = 'noopener'
  link.target = '_blank'
  link.click()
  return true
}
