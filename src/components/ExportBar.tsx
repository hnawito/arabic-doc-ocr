import { useState } from 'react'
import type { QueueItem } from '../lib/schema'

/** One delivery choice: the native share sheet, or the WhatsApp / email fallback. */
export type SendAction = { label: string; title: string; run: () => void }

type Props = {
  items: QueueItem[]
  running: boolean
  canStart: boolean
  sends: SendAction[]
  onStart: () => void
  onCancel: () => void
  onExport: () => void
  onClear: () => void
}

export function ExportBar({ items, running, canStart, sends, onStart, onCancel, onExport, onClear }: Props) {
  const [menuOpen, setMenuOpen] = useState(false)
  const done = items.filter((item) => item.status === 'done').length
  const failed = items.filter((item) => item.status === 'error').length
  const pages = items.reduce((sum, item) => sum + (item.record?.pageCount ?? 0), 0)
  const tokens = items.reduce((sum, item) => sum + (item.record?.tokens ?? 0), 0)
  const exportable = done + failed

  return (
    <div className="actionbar">
      <div className="stats">
        <span>
          <strong>{items.length}</strong> files
        </span>
        <span>
          <strong>{done}</strong> done
        </span>
        <span>
          <strong>{failed}</strong> failed
        </span>
        <span>
          <strong>{pages}</strong> pages
        </span>
        <span>
          <strong>{tokens.toLocaleString('en-US')}</strong> tokens
        </span>
      </div>

      <div className="actions">
        {running ? (
          <button type="button" className="ghost" onClick={onCancel}>
            Cancel
          </button>
        ) : (
          <button type="button" className="primary" onClick={onStart} disabled={!canStart}>
            Start OCR
          </button>
        )}
        <button type="button" className="primary" onClick={onExport} disabled={exportable === 0 || running}>
          Export Excel
        </button>

        <div className="send">
          <button
            type="button"
            className="ghost"
            aria-expanded={menuOpen}
            title="Send the workbook: share sheet, WhatsApp or email"
            onClick={() => setMenuOpen((open) => !open)}
            disabled={exportable === 0 || running}
          >
            Send…
          </button>
          {menuOpen && (
            <>
              <div className="send-backdrop" onClick={() => setMenuOpen(false)} />
              <div className="send-menu" role="menu">
                {sends.map((send) => (
                  <button
                    key={send.label}
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setMenuOpen(false)
                      send.run()
                    }}
                  >
                    <strong>{send.label}</strong>
                    <span>{send.title}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        <button type="button" className="ghost" onClick={onClear} disabled={running || items.length === 0}>
          Clear
        </button>
      </div>
    </div>
  )
}
