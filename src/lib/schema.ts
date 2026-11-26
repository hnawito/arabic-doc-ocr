/** Data model, Gemini prompt and response schema for Arabic document OCR. */

import { canonicalizeFields } from './columns'

export type FieldPair = { label: string; value: string }
export type ItemRow = { description: string; quantity: string; notes: string }

/** Raw shape returned by the model (snake_case keys mirror the response schema). */
export type OcrResult = {
  document_type: string
  document_title: string
  document_number: string
  date: string
  sender: string
  receiver: string
  amount: string
  currency: string
  fields: FieldPair[]
  items: ItemRow[]
  summary: string
  full_text: string
  confidence: string
  notes: string
}

export type SourceFile = { file: File }

export type DocRecord = {
  fileName: string
  pageCount: number
  model: string
  tokens: number
  documentType: string
  documentTitle: string
  documentNumber: string
  date: string
  sender: string
  receiver: string
  amount: string
  currency: string
  items: ItemRow[]
  fields: FieldPair[]
  summary: string
  notes: string
  fullText: string
  confidence: string
  thumbs: string[]
}

export type ItemStatus = 'queued' | 'running' | 'done' | 'error'

export type QueueItem = {
  id: string
  source: SourceFile
  /** When the file was added, in ms since the epoch. */
  addedAt: number
  status: ItemStatus
  error?: string
  pages?: number
  record?: DocRecord
}

export const SUPPORTED_EXTENSIONS = /\.(pdf|jpe?g|png|webp|bmp)$/i

export function isSupportedFile(file: File): boolean {
  if (file.type.startsWith('image/')) return true
  if (file.type === 'application/pdf') return true
  return SUPPORTED_EXTENSIONS.test(file.name)
}

export const OCR_PROMPT = `أنت نظام OCR دقيق للمستندات العربية الرسمية.
الصور المرفقة هي صفحات مستند واحد، وقد تحتوي على نص مطبوع ببرنامج (آلي) وعلى كتابة يدوية معاً.

المطلوب:
- استخرج النص والبيانات كما تظهر تماماً، دون ترجمة ودون تلخيص ودون إعادة صياغة.
- اقرأ الكتابة اليدوية العربية بدقة قدر الإمكان، وكذلك الأرقام والتواريخ والأسماء.
- لا تخترع أي قيمة: إذا لم يكن الحقل موجوداً أو كان غير مقروء اتركه نصاً فارغاً "".
- document_type: نوع المستند كما يظهر (مثال: إيصال استلام، نموذج عهد، فاتورة، محضر...).
- document_title: عنوان المستند إن وُجد.
- document_number: رقم المستند أو الإيصال أو العقد إن وُجد.
- amount و currency: أي مبلغ مالي ورمز/اسم العملة إن وُجد.
- fields: كل حقل نموذجي مهم، بحيث يكون label هو تسمية الحقل كما تكتب في المستند، و value قيمته كما قرأتها.
- إذا احتوى المستند على أي حقل من هذه القائمة فاستخدم تسميته التالية حرفياً في label:
  "نوع الجهاز"، "التاريخ"، "الرقم المسلسل"، "الاسم"، "جهة العمل فرع / قطاع"، "البريد الالكتروني"، "رقم المحمول"، "العنوان"، "رقم الملف"، "الدولة"، "نوع تحقيق الشخصية"، "رقم تحقيق الشخصية"، "تاريخ التوقيع"، "الوصف"، "الكمية"، "ملاحظات".
- إذا وُجد الحقل في المستند فلا تترك قيمته فارغة: انقل الأرقام والأسماء كما هي.
- لا تدمج "نوع تحقيق الشخصية" مع "رقم تحقيق الشخصية": النوع وصف الوثيقة (بطاقة، جواز، رخصة) والرقم هو أرقام الوثيقة نفسها.
- items: صفوف الجداول (الوصف، الكمية، ملاحظات) إن وُجدت.
- full_text: النص الكامل بترتيب القراءة الطبيعي من أعلى الصفحة إلى أسفلها، مع أسطر جديدة عند نهاية كل سطر أو بند. اجمع نص كل الصفحات في هذا الحقل.
- confidence: "منخفض" أو "متوسط" أو "عالٍ" بحسب وضوح الكتابة اليدوية.
- notes: أي ملاحظات عن كلمات غير واضحة أو مشطوبة أو أجزاء مفقودة.

أعد JSON مطابقاً للمخطط فقط.`

export const OCR_RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    document_type: { type: 'string' },
    document_title: { type: 'string' },
    document_number: { type: 'string' },
    date: { type: 'string' },
    sender: { type: 'string' },
    receiver: { type: 'string' },
    amount: { type: 'string' },
    currency: { type: 'string' },
    fields: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          label: { type: 'string' },
          value: { type: 'string' },
        },
        required: ['label', 'value'],
      },
    },
    items: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          description: { type: 'string' },
          quantity: { type: 'string' },
          notes: { type: 'string' },
        },
        required: ['description'],
      },
    },
    summary: { type: 'string' },
    full_text: { type: 'string' },
    confidence: { type: 'string' },
    notes: { type: 'string' },
  },
  required: ['document_type', 'fields', 'items', 'full_text', 'confidence'],
} as const

function asString(value: unknown): string {
  if (typeof value === 'string') return value.trim()
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  return ''
}

function normalizeResult(raw: unknown): OcrResult {
  const source = (raw ?? {}) as Record<string, unknown>
  const fields = Array.isArray(source.fields) ? source.fields : []
  const items = Array.isArray(source.items) ? source.items : []
  return {
    document_type: asString(source.document_type),
    document_title: asString(source.document_title),
    document_number: asString(source.document_number),
    date: asString(source.date),
    sender: asString(source.sender),
    receiver: asString(source.receiver),
    amount: asString(source.amount),
    currency: asString(source.currency),
    fields: fields
      .map((entry) => {
        const pair = (entry ?? {}) as Record<string, unknown>
        return { label: asString(pair.label), value: asString(pair.value) }
      })
      .filter((pair) => pair.label.length > 0),
    items: items
      .map((entry) => {
        const row = (entry ?? {}) as Record<string, unknown>
        return {
          description: asString(row.description),
          quantity: asString(row.quantity),
          notes: asString(row.notes),
        }
      })
      .filter((row) => row.description.length > 0 || row.quantity.length > 0),
    summary: asString(source.summary),
    full_text: asString(source.full_text),
    confidence: asString(source.confidence),
    notes: asString(source.notes),
  }
}

/** The model may wrap JSON in a code fence or add a sentence around it. */
export function parseOcrJson(text: string): OcrResult {
  const cleaned = text.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim()
  const start = cleaned.indexOf('{')
  const end = cleaned.lastIndexOf('}')
  if (start === -1 || end === -1 || end <= start) {
    throw new Error('The model did not return a JSON record for this file')
  }
  let parsed: unknown
  try {
    parsed = JSON.parse(cleaned.slice(start, end + 1))
  } catch {
    throw new Error('The model returned JSON that could not be parsed for this file')
  }
  return normalizeResult(parsed)
}

/** Merge per-chunk results for a long PDF into a single record. */
export function mergeResults(parts: OcrResult[]): OcrResult {
  if (parts.length === 0) return normalizeResult({})
  if (parts.length === 1) return parts[0]

  const first = parts[0]
  const merged: OcrResult = { ...first }
  const scalarKeys: (keyof OcrResult)[] = [
    'document_type',
    'document_title',
    'document_number',
    'date',
    'sender',
    'receiver',
    'amount',
    'currency',
    'summary',
    'confidence',
    'notes',
  ]
  for (const key of scalarKeys) {
    const value = parts.map((part) => part[key]).find((entry) => typeof entry === 'string' && entry.length > 0)
    ;(merged[key] as string) = typeof value === 'string' ? value : (first[key] as string)
  }

  const fields = new Map<string, FieldPair>()
  for (const part of parts) {
    for (const field of part.fields) {
      const existing = fields.get(field.label)
      if (!existing) fields.set(field.label, field)
      else if (!existing.value && field.value) fields.set(field.label, field)
    }
  }
  merged.fields = [...fields.values()]
  merged.items = parts.flatMap((part) => part.items)
  merged.full_text = parts
    .map((part) => part.full_text)
    .filter((text) => text.length > 0)
    .join('\n\n')
  return merged
}

export function buildRecord(
  source: SourceFile,
  rendered: { pageCount: number; thumbs: string[] },
  result: OcrResult,
  model: string,
  tokens: number,
): DocRecord {
  return {
    fileName: source.file.name,
    pageCount: rendered.pageCount,
    model,
    tokens,
    documentType: result.document_type,
    documentTitle: result.document_title,
    documentNumber: result.document_number,
    date: result.date,
    sender: result.sender,
    receiver: result.receiver,
    amount: result.amount,
    currency: result.currency,
    items: result.items,
    fields: canonicalizeFields(result.fields),
    summary: result.summary,
    notes: result.notes,
    fullText: result.full_text,
    confidence: result.confidence,
    thumbs: rendered.thumbs,
  }
}

export function blankRecord(source: SourceFile): DocRecord {
  return {
    fileName: source.file.name,
    pageCount: 0,
    model: '',
    tokens: 0,
    documentType: '',
    documentTitle: '',
    documentNumber: '',
    date: '',
    sender: '',
    receiver: '',
    amount: '',
    currency: '',
    items: [],
    fields: [],
    summary: '',
    notes: '',
    fullText: '',
    confidence: '',
    thumbs: [],
  }
}
