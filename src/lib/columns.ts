/** The fixed results/export schema: one row per file, English headers, values untouched. */

import type { DocRecord, FieldPair, QueueItem } from './schema'

const DIACRITICS = /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED\u0640]/g

/** Folds Arabic spelling variants so "البريد الإلكتروني" matches "بريد الكتروني". */
export function normalizeLabel(label: string): string {
  return label
    .replace(DIACRITICS, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/[ىي]/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .toLowerCase()
    .replace(/(^|\s)ال/g, '$1')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Columns that map straight onto a record property. */
export type DocKey =
  | 'sender'
  | 'receiver'
  | 'amount'
  | 'currency'
  | 'documentType'
  | 'documentTitle'
  | 'documentNumber'
  | 'date'

/**
 * A fixed form field. `labels` are the labels the model may return for it, in order of
 * preference — the first one is used when the field is created by editing an empty cell.
 */
export type ExtractedColumn = {
  header: string
  width: number
  labels: string[]
  fallback?: (record: DocRecord) => string
}

export type Column =
  | { kind: 'file'; header: string; width: number }
  | { kind: 'computed'; header: string; width: number; value: (item: QueueItem) => string }
  | { kind: 'doc'; header: string; width: number; key: DocKey }
  | { kind: 'extracted'; header: string; width: number; column: ExtractedColumn }

export const EXTRACTED_COLUMNS: ExtractedColumn[] = [
  { header: 'Device', width: 22, labels: ['نوع الجهاز', 'الجهاز', 'Device type', 'Device'] },
  { header: 'Date', width: 18, labels: ['التاريخ', 'تاريخ المستند', 'Date'], fallback: (record) => record.date },
  {
    header: 'Device Serial',
    width: 20,
    labels: ['الرقم المسلسل', 'الرقم التسلسلي', 'Device Serial', 'Serial number', 'Serial'],
  },
  { header: 'Name', width: 26, labels: ['الاسم', 'اسم المستلم', 'اسم العميل', 'Name'], fallback: (record) => record.receiver },
  {
    header: 'جهة العمل فرع / قطاع',
    width: 26,
    labels: ['جهة العمل فرع / قطاع', 'جهة العمل', 'الفرع', 'القطاع', 'Work place'],
  },
  {
    header: 'Email',
    width: 24,
    labels: [
      'البريد الالكتروني',
      'البريد الإلكتروني',
      'بريد الكتروني',
      'بريد إلكتروني',
      'الايميل',
      'Email',
      'E-mail',
    ],
  },
  {
    header: 'Mobile',
    width: 18,
    labels: ['رقم المحمول', 'المحمول', 'رقم الهاتف', 'الهاتف', 'موبايل', 'Mobile', 'Phone'],
  },
  { header: 'Address', width: 30, labels: ['العنوان', 'Address'] },
  { header: 'ID Number', width: 18, labels: ['رقم الملف', 'ID Number', 'File number'] },
  { header: 'Country', width: 16, labels: ['الدولة', 'Country'] },
  {
    header: 'نوع تحقيق الشخصية',
    width: 22,
    labels: ['نوع تحقيق الشخصية', 'نوع إثبات الشخصية', 'نوع الهوية', 'نوع البطاقة', 'ID type'],
  },
  {
    header: 'رقم تحقيق الشخصية',
    width: 22,
    labels: [
      'رقم تحقيق الشخصية',
      'رقم إثبات الشخصية',
      'رقم الهوية',
      'رقم البطاقة',
      'الرقم القومي',
      'National ID',
      'ID number',
    ],
  },
  { header: 'تاريخ التوقيع', width: 18, labels: ['تاريخ التوقيع', 'التوقيع', 'Signature date'] },
  {
    header: 'Description',
    width: 32,
    labels: ['الوصف', 'Description'],
    fallback: (record) => record.items.map((item) => item.description).filter(Boolean).join(' | '),
  },
  {
    header: 'Quantity',
    width: 12,
    labels: ['الكمية', 'Quantity'],
    fallback: (record) => record.items.map((item) => item.quantity).filter(Boolean).join(' | '),
  },
  {
    header: 'Notes',
    width: 30,
    labels: ['ملاحظات', 'الملاحظات', 'Notes'],
    fallback: (record) =>
      record.notes || record.items.map((item) => item.notes).filter(Boolean).join(' | '),
  },
]

/** Shown on screen: the fixed document fields, then the standard form fields. */
export const COLUMNS: Column[] = [
  { kind: 'file', header: 'File', width: 34 },
  { kind: 'computed', header: 'TYPE', width: 10, value: (item) => fileKind(item.source.file) },
  { kind: 'computed', header: 'DATE upload', width: 18, value: (item) => formatStamp(item.addedAt) },
  { kind: 'doc', header: 'Sender', width: 24, key: 'sender' },
  { kind: 'doc', header: 'Receiver', width: 24, key: 'receiver' },
  { kind: 'doc', header: 'CURRENCY', width: 12, key: 'currency' },
  { kind: 'doc', header: 'Amount', width: 14, key: 'amount' },
  { kind: 'computed', header: 'Status', width: 10, value: (item) => statusLabel(item) },
  { kind: 'doc', header: 'Document TYPE', width: 22, key: 'documentType' },
  { kind: 'doc', header: 'TITLE', width: 28, key: 'documentTitle' },
  { kind: 'doc', header: 'Number', width: 16, key: 'documentNumber' },
  { kind: 'doc', header: 'DATE', width: 16, key: 'date' },
  ...EXTRACTED_COLUMNS.map<Column>((column) => ({
    kind: 'extracted',
    header: column.header,
    width: column.width,
    column,
  })),
]

export function fileKind(file: File): string {
  const name = file.name.toLowerCase()
  if (file.type === 'application/pdf' || name.endsWith('.pdf')) return 'PDF'
  const extension = name.includes('.') ? name.split('.').pop() ?? '' : ''
  if (extension === 'jpeg' || extension === 'jpg') return 'JPG'
  if (extension) return extension.toUpperCase()
  return file.type.replace('image/', '').toUpperCase() || 'File'
}

export function statusLabel(item: QueueItem): string {
  if (item.status === 'error') return 'Error'
  if (item.status === 'done') return 'Done'
  return 'Pending'
}

export function formatStamp(timestamp: number): string {
  const date = new Date(timestamp)
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function labelScore(column: ExtractedColumn, folded: string): number {
  let best = 0
  for (const label of column.labels) {
    const target = normalizeLabel(label)
    if (!target) continue
    if (folded === target) return 1000 + target.length
    if (` ${folded} `.includes(` ${target} `)) best = Math.max(best, target.length)
  }
  return best
}

/**
 * The schema column a model label belongs to. Exact labels win; otherwise the longest label the
 * text contains, so "رقم تحقيق الشخصية / الرقم القومي" still lands on the right column.
 */
export function matchColumn(label: string): ExtractedColumn | undefined {
  const folded = normalizeLabel(label)
  if (!folded) return undefined
  let match: ExtractedColumn | undefined
  let top = 0
  for (const column of EXTRACTED_COLUMNS) {
    const score = labelScore(column, folded)
    if (score > top) {
      top = score
      match = column
    }
  }
  return match
}

export function findFieldValue(fields: FieldPair[], column: ExtractedColumn): string {
  const hit = fields.find((field) => matchColumn(field.label) === column)
  return hit ? hit.value : ''
}

/**
 * Rename recognised labels to the schema names ("نوع الجهاز" becomes "Device") and merge
 * duplicates, so the review list and the sheet speak the same names.
 */
export function canonicalizeFields(fields: FieldPair[]): FieldPair[] {
  const out: FieldPair[] = []
  const positions = new Map<string, number>()
  for (const field of fields) {
    const column = matchColumn(field.label)
    const label = column ? column.header : field.label.trim()
    if (!label) continue
    const key = normalizeLabel(label)
    const position = positions.get(key)
    if (position === undefined) {
      positions.set(key, out.length)
      out.push({ label, value: field.value })
    } else if (!out[position].value && field.value) {
      out[position] = { label: out[position].label, value: field.value }
    }
  }
  return out
}

/** Update the field behind this column, or append it under the column name. */
export function setFieldValue(fields: FieldPair[], column: ExtractedColumn, value: string): FieldPair[] {
  const index = fields.findIndex((field) => matchColumn(field.label) === column)
  if (index >= 0) return fields.map((field, i) => (i === index ? { ...field, value } : field))
  if (!value.trim()) return fields
  return [...fields, { label: column.header, value }]
}

export function extractedValue(record: DocRecord, column: ExtractedColumn): string {
  const direct = findFieldValue(record.fields, column)
  if (direct) return direct
  return column.fallback ? column.fallback(record) : ''
}

export function cellValue(item: QueueItem, column: Column): string {
  switch (column.kind) {
    case 'file':
      return item.source.file.name
    case 'computed':
      return column.value(item)
    case 'doc':
      return item.record?.[column.key] ?? ''
    case 'extracted':
      return item.record ? extractedValue(item.record, column.column) : ''
  }
}
