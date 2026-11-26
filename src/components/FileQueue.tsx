import { fileKind, formatStamp } from '../lib/columns'
import type { QueueItem } from '../lib/schema'

type Props = {
  items: QueueItem[]
  onRemove: (id: string) => void
}

const LABELS: Record<QueueItem['status'], string> = {
  queued: 'Queued',
  running: 'Reading…',
  done: 'Done',
  error: 'Failed',
}

export function FileQueue({ items, onRemove }: Props) {
  if (items.length === 0) return null

  return (
    <section className="card">
      <div className="card-head">
        <h2>Queue</h2>
        <span className="muted">{items.length} file(s)</span>
      </div>
      <ul className="queue">
        {items.map((item) => (
          <li key={item.id} className={`queue-item queue-item--${item.status}`}>
            <span className={`dot dot--${item.status}`} aria-hidden="true" />
            <div className="queue-text">
              <span className="queue-name" dir="auto">
                {item.source.file.name}
              </span>
              <span className="queue-path">
                {fileKind(item.source.file)} · {formatStamp(item.addedAt)}
                {item.pages ? ` · ${item.pages} page(s)` : ''}
                {item.record?.tokens ? ` · ${item.record.tokens} tokens` : ''}
              </span>
              {item.error && (
                <span className="queue-error" dir="auto">
                  {item.error}
                </span>
              )}
            </div>
            <span className="badge">{LABELS[item.status]}</span>
            {item.status !== 'running' && (
              <button type="button" className="icon" title="Remove" onClick={() => onRemove(item.id)}>
                ×
              </button>
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}
