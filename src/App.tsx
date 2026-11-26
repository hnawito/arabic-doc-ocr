import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { DropZone } from './components/DropZone'
import { ExportBar, type SendAction } from './components/ExportBar'
import { FileQueue } from './components/FileQueue'
import { KeyPanel } from './components/KeyPanel'
import { ModelPicker } from './components/ModelPicker'
import { ResultsTable } from './components/ResultsTable'
import { isMobileDevice } from './lib/device'
import { canShareFiles, downloadWorkbook, sendFallback, shareWorkbook, type SendTarget } from './lib/excel'
import { DEFAULT_MODEL, listModels, ocrImages, type ModelOption } from './lib/gemini'
import { renderDocument } from './lib/image'
import { runPool } from './lib/queue'
import { buildRecord, isSupportedFile, mergeResults } from './lib/schema'
import type { DocRecord, QueueItem, SourceFile } from './lib/schema'

const KEY_STORAGE = 'arabic-ocr:gemini-key'
const MODEL_STORAGE = 'arabic-ocr:model'
const PAGES_PER_REQUEST = 6
const CONCURRENCY = 2

function errorText(error: unknown): string {
  if (error instanceof DOMException && error.name === 'AbortError') return 'Cancelled'
  if (error instanceof Error) return error.message
  return 'Something went wrong'
}

function isAbort(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError'
}

function readStorage(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function writeStorage(key: string, value: string | null): void {
  try {
    if (value === null) localStorage.removeItem(key)
    else localStorage.setItem(key, value)
  } catch {
    // Storage can be unavailable in private mode; the app still works.
  }
}

export default function App({ onSignOut }: { onSignOut: () => void }) {
  const [items, setItems] = useState<QueueItem[]>([])
  const [apiKey, setApiKey] = useState(() => readStorage(KEY_STORAGE) ?? '')
  const [remember, setRemember] = useState(() => readStorage(KEY_STORAGE) !== null)
  const [models, setModels] = useState<ModelOption[]>([])
  const [model, setModel] = useState(() => readStorage(MODEL_STORAGE) || DEFAULT_MODEL)
  const [testing, setTesting] = useState(false)
  const [testMessage, setTestMessage] = useState<string | null>(null)
  const [testError, setTestError] = useState<string | null>(null)
  const [running, setRunning] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const mobile = useMemo(isMobileDevice, [])
  const canShare = useMemo(canShareFiles, [])

  useEffect(() => {
    writeStorage(KEY_STORAGE, remember && apiKey.trim() ? apiKey : null)
  }, [apiKey, remember])

  useEffect(() => {
    writeStorage(MODEL_STORAGE, model)
  }, [model])

  const patchItem = useCallback((id: string, patch: Partial<QueueItem>) => {
    setItems((previous) => previous.map((item) => (item.id === id ? { ...item, ...patch } : item)))
  }, [])

  const patchRecord = useCallback((id: string, patch: Partial<DocRecord>) => {
    setItems((previous) =>
      previous.map((item) => {
        if (item.id !== id || !item.record) return item
        return { ...item, record: { ...item.record, ...patch } }
      }),
    )
  }, [])

  const addFiles = useCallback((files: SourceFile[]) => {
    const supported = files.filter((entry) => isSupportedFile(entry.file))
    const skipped = files.length - supported.length
    if (supported.length === 0) {
      setNotice('No images or PDFs were selected.')
      return
    }
    setItems((previous) => [
      ...previous,
      ...supported.map((source) => ({
        id: crypto.randomUUID(),
        source,
        addedAt: Date.now(),
        status: 'queued' as const,
      })),
    ])
    setNotice(skipped > 0 ? `${skipped} unsupported file(s) skipped — images and PDFs only.` : null)
  }, [])

  const testKey = useCallback(async () => {
    setTesting(true)
    setTestError(null)
    setTestMessage(null)
    try {
      const list = await listModels(apiKey.trim())
      setModels(list)
      if (list.length > 0 && !list.some((option) => option.id === model)) setModel(list[0].id)
      setTestMessage(`Key works — ${list.length} text/vision models available.`)
    } catch (error) {
      setTestError(errorText(error))
    } finally {
      setTesting(false)
    }
  }, [apiKey, model])

  const pending = useMemo(() => items.filter((item) => item.status === 'queued' || item.status === 'error'), [items])
  const canStart = !running && apiKey.trim().length > 8 && pending.length > 0

  const start = useCallback(async () => {
    if (running || apiKey.trim().length < 8) return
    const queue = items.filter((item) => item.status === 'queued' || item.status === 'error')
    if (queue.length === 0) return

    const controller = new AbortController()
    abortRef.current = controller
    setRunning(true)
    setNotice(null)

    try {
      await runPool(
        queue,
        CONCURRENCY,
        async (item) => {
          patchItem(item.id, { status: 'running', error: undefined })
          try {
            const rendered = await renderDocument(item.source.file)
            if (rendered.images.length === 0) throw new Error('No pages could be read from this file')

            const parts = []
            let tokens = 0
            for (let index = 0; index < rendered.images.length; index += PAGES_PER_REQUEST) {
              if (controller.signal.aborted) throw new DOMException('Aborted', 'AbortError')
              const chunk = await ocrImages({
                apiKey: apiKey.trim(),
                model,
                images: rendered.images.slice(index, index + PAGES_PER_REQUEST),
                signal: controller.signal,
              })
              parts.push(chunk.result)
              tokens += chunk.tokens
            }

            patchItem(item.id, {
              status: 'done',
              pages: rendered.pageCount,
              record: buildRecord(item.source, rendered, mergeResults(parts), model, tokens),
            })
          } catch (error) {
            if (isAbort(error)) {
              patchItem(item.id, { status: 'queued', error: undefined })
              return
            }
            patchItem(item.id, { status: 'error', error: errorText(error) })
          }
        },
        controller.signal,
      )
    } finally {
      setItems((previous) =>
        previous.map((item) => (item.status === 'running' ? { ...item, status: 'queued', error: undefined } : item)),
      )
      setRunning(false)
      abortRef.current = null
    }
  }, [apiKey, items, model, patchItem, running])

  const cancel = useCallback(() => {
    abortRef.current?.abort()
  }, [])

  const exportable = useMemo(() => items.filter((item) => item.status === 'done' || item.status === 'error'), [items])

  const exportRows = useCallback(() => {
    downloadWorkbook(exportable)
  }, [exportable])

  const shareRows = useCallback(async () => {
    setNotice(null)
    try {
      await shareWorkbook(exportable)
    } catch (error) {
      setNotice(errorText(error))
    }
  }, [exportable])

  const sendElsewhere = useCallback(
    (target: SendTarget) => {
      if (!sendFallback(exportable, target)) return
      setNotice(
        `The workbook was downloaded — attach it to the ${target === 'whatsapp' ? 'WhatsApp chat' : 'email'} that just opened.`,
      )
    },
    [exportable],
  )

  const sends = useMemo<SendAction[]>(() => {
    const list: SendAction[] = []
    if (canShare) {
      list.push({ label: 'Share sheet', title: 'Attach the workbook in WhatsApp, Mail or another app', run: shareRows })
    }
    list.push(
      {
        label: 'WhatsApp',
        title: 'Downloads the workbook, then opens WhatsApp — attach the file to the message',
        run: () => sendElsewhere('whatsapp'),
      },
      {
        label: 'Email',
        title: 'Downloads the workbook, then opens an email draft — attach the file',
        run: () => sendElsewhere('email'),
      },
    )
    return list
  }, [canShare, sendElsewhere, shareRows])

  const clear = useCallback(() => {
    setItems([])
    setNotice(null)
  }, [])

  const removeItem = useCallback((id: string) => {
    setItems((previous) => previous.filter((item) => item.id !== id))
  }, [])

  return (
    <div className="app">
      <div className="topbar">
        <span className="topbar-brand">Arabic Document OCR</span>
        <button type="button" className="ghost small" onClick={onSignOut}>
          Sign out
        </button>
      </div>

      <header className="hero">
        <p className="eyebrow">Google Gemini · Arabic OCR</p>
        <h1>Every file you add, one row in Excel</h1>
        <p className="lede">
          Select the scanned Arabic documents you need — printed or handwritten. The page reads each file with your own
          Google AI Studio key, shows the extracted fields and text, and exports a single record per file to an Excel
          sheet.
        </p>
      </header>

      <main className="stack">
        <div className="grid-two">
          <KeyPanel
            apiKey={apiKey}
            onKeyChange={setApiKey}
            remember={remember}
            onRememberChange={setRemember}
            onTest={testKey}
            testing={testing}
            message={testMessage}
            error={testError}
          />
          <ModelPicker models={models} value={model} onChange={setModel} disabled={running} />
        </div>

        <DropZone disabled={running} mobile={mobile} onFiles={addFiles} />

        {notice && <p className="note">{notice}</p>}

        <FileQueue items={items} onRemove={removeItem} />
        <ResultsTable items={items} onPatch={patchRecord} onRemove={removeItem} />

        {!apiKey.trim() && items.length > 0 && <p className="note">Enter your Google AI Studio key to start the OCR.</p>}
      </main>

      <ExportBar
        items={items}
        running={running}
        canStart={canStart}
        onStart={start}
        onCancel={cancel}
        onExport={exportRows}
        sends={sends}
        onClear={clear}
      />
    </div>
  )
}
