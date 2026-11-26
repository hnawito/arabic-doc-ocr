/** Google Gemini REST client. The key stays in this browser tab and goes only to Google. */

import { OCR_PROMPT, OCR_RESPONSE_SCHEMA, parseOcrJson, type OcrResult } from './schema'

const API_BASE = 'https://generativelanguage.googleapis.com/v1beta'
export const DEFAULT_MODEL = 'gemini-3.5-flash'
export const FALLBACK_MODELS = ['gemini-3.5-flash', 'gemini-3.8-flash', 'gemini-2.5-pro']

export type ModelOption = { id: string; label: string }

const EXCLUDED_MODEL = /(tts|image|embedding|embed|computer-use|robotics|deep-research|antigravity|transcribe|omni|nano-banana|lyria|gemma|imagen|veo|aqa)/i

type ModelsResponse = {
  models?: { name?: string; displayName?: string; supportedGenerationMethods?: string[] }[]
}

type GeminiErrorPayload = {
  error?: { message?: string; status?: string; details?: { '@type'?: string; retryDelay?: string }[] }
}

type GenerateResponse = {
  candidates?: { content?: { parts?: { text?: string }[] }; finishReason?: string }[]
  promptFeedback?: { blockReason?: string }
  usageMetadata?: { totalTokenCount?: number }
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Aborted', 'AbortError'))
      return
    }
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort)
      resolve()
    }, ms)
    const onAbort = () => {
      clearTimeout(timer)
      reject(new DOMException('Aborted', 'AbortError'))
    }
    signal?.addEventListener('abort', onAbort, { once: true })
  })
}

function retryDelayMs(payload: GeminiErrorPayload | null): number | null {
  const details = payload?.error?.details ?? []
  for (const detail of details) {
    if (detail.retryDelay && /^\d+(\.\d+)?s$/.test(detail.retryDelay)) {
      return Math.min(30000, Math.ceil(parseFloat(detail.retryDelay) * 1000))
    }
  }
  return null
}

function friendlyError(status: number, message: string): string {
  if (status === 400 && /api key not valid/i.test(message)) {
    return 'Google says this API key is not valid. Create a new key in Google AI Studio.'
  }
  if (status === 401 || status === 403) {
    return `Google rejected this API key (${status}). Check that the key is complete and unrestricted for the Gemini API. ${message}`
  }
  if (status === 404) {
    return `This model or endpoint is not available to your key (404). ${message}`
  }
  if (status === 429) {
    return `Google rate/quota limit reached (429). Wait a moment, lower the batch size, or check your plan. ${message}`
  }
  if (status >= 500) {
    return `Google returned a server error (${status}). Try again shortly. ${message}`
  }
  return `Google rejected the request (${status}). ${message}`
}

async function request<T>(url: string, apiKey: string, init: RequestInit, signal?: AbortSignal): Promise<T> {
  let attempt = 0
  for (;;) {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')
    let response: Response
    try {
      const headers = new Headers(init.headers)
      headers.set('x-goog-api-key', apiKey)
      response = await fetch(url, { ...init, headers, signal })
    } catch (error) {
      if (signal?.aborted || (error instanceof DOMException && error.name === 'AbortError')) {
        throw new DOMException('Aborted', 'AbortError')
      }
      if (attempt >= 3) throw new Error('Could not reach Google. Check the network connection and try again.')
      await sleep(1200 * 2 ** attempt, signal)
      attempt += 1
      continue
    }

    if (response.ok) {
      return (await response.json()) as T
    }

    const payload = (await response.json().catch(() => null)) as GeminiErrorPayload | null
    const message = payload?.error?.message ?? response.statusText
    const canRetry = response.status === 429 || response.status >= 500
    if (canRetry && attempt < 4) {
      const wait = retryDelayMs(payload) ?? Math.min(30000, 2000 * 2 ** attempt)
      await sleep(wait + Math.floor(Math.random() * 400), signal)
      attempt += 1
      continue
    }
    throw new Error(friendlyError(response.status, message))
  }
}

function rank(id: string): number {
  const index = FALLBACK_MODELS.indexOf(id)
  if (index >= 0) return index
  if (/flash-lite/i.test(id)) return 40
  if (/flash/i.test(id)) return 20
  if (/pro/i.test(id)) return 30
  return 50
}

export async function listModels(apiKey: string, signal?: AbortSignal): Promise<ModelOption[]> {
  const data = await request<ModelsResponse>(`${API_BASE}/models`, apiKey, { method: 'GET' }, signal)
  const models = (data.models ?? [])
    .filter((model) => {
      const id = (model.name ?? '').replace('models/', '')
      if (!id || EXCLUDED_MODEL.test(id)) return false
      const methods = model.supportedGenerationMethods ?? []
      return methods.includes('generateContent')
    })
    .map((model) => ({
      id: (model.name ?? '').replace('models/', ''),
      label: model.displayName?.trim() || (model.name ?? '').replace('models/', ''),
    }))

  const unique = new Map<string, ModelOption>()
  for (const model of models) if (!unique.has(model.id)) unique.set(model.id, model)
  return [...unique.values()].sort((a, b) => rank(a.id) - rank(b.id) || a.id.localeCompare(b.id))
}

export type OcrChunk = { result: OcrResult; tokens: number }

/** One request = up to 6 pages of the same document. */
export async function ocrImages(options: {
  apiKey: string
  model: string
  images: string[]
  signal?: AbortSignal
}): Promise<OcrChunk> {
  const { apiKey, model, images, signal } = options
  const parts: unknown[] = [{ text: OCR_PROMPT }]
  for (const dataUrl of images) {
    const base64 = dataUrl.slice(dataUrl.indexOf(',') + 1)
    parts.push({ inline_data: { mime_type: 'image/jpeg', data: base64 } })
  }

  const body = {
    contents: [{ role: 'user', parts }],
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: 8192,
      responseMimeType: 'application/json',
      responseSchema: OCR_RESPONSE_SCHEMA,
    },
  }

  const data = await request<GenerateResponse>(
    `${API_BASE}/models/${encodeURIComponent(model)}:generateContent`,
    apiKey,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    },
    signal,
  )

  const blockReason = data.promptFeedback?.blockReason
  if (blockReason) {
    throw new Error(`Google blocked this request (${blockReason}). Try a different file or model.`)
  }

  const candidate = data.candidates?.[0]
  const text = (candidate?.content?.parts ?? [])
    .map((part) => part.text ?? '')
    .join('')
    .trim()
  if (!text) {
    const reason = candidate?.finishReason ? ` (finish reason: ${candidate.finishReason})` : ''
    throw new Error(`The model returned no text for this document${reason}.`)
  }

  return {
    result: parseOcrJson(text),
    tokens: data.usageMetadata?.totalTokenCount ?? 0,
  }
}
