import { Fragment, useState } from 'react'
import { COLUMNS, extractedValue, fileKind, setFieldValue, type DocKey } from '../lib/columns'
import type { DocRecord, QueueItem } from '../lib/schema'

type Props = {
  items: QueueItem[]
  onPatch: (id: string, patch: Partial<DocRecord>) => void
  onRemove: (id: string) => void
}

function patchDoc(key: DocKey, value: string): Partial<DocRecord> {
  return { [key]: value } as Partial<DocRecord>
}

function Cell({
  value,
  onChange,
  placeholder,
}: {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}) {
  return (
    <input
      className="cell-input"
      dir="auto"
      value={value}
      placeholder={placeholder}
      onChange={(event) => onChange(event.target.value)}
    />
  )
}

function Detail({ record, onPatch }: { record: DocRecord; onPatch: (patch: Partial<DocRecord>) => void }) {
  return (
    <div className="detail">
      <div className="detail-grid">
        <label className="detail-field">
          <span>Document type</span>
          <Cell value={record.documentType} onChange={(value) => onPatch({ documentType: value })} />
        </label>
        <label className="detail-field">
          <span>Title</span>
          <Cell value={record.documentTitle} onChange={(value) => onPatch({ documentTitle: value })} />
        </label>
        <label className="detail-field">
          <span>Number</span>
          <Cell value={record.documentNumber} onChange={(value) => onPatch({ documentNumber: value })} />
        </label>
        <label className="detail-field">
          <span>Date</span>
          <Cell value={record.date} onChange={(value) => onPatch({ date: value })} />
        </label>
        <label className="detail-field">
          <span>Sender</span>
          <Cell value={record.sender} onChange={(value) => onPatch({ sender: value })} />
        </label>
        <label className="detail-field">
          <span>Receiver</span>
          <Cell value={record.receiver} onChange={(value) => onPatch({ receiver: value })} />
        </label>
        <label className="detail-field">
          <span>Amount</span>
          <Cell value={record.amount} onChange={(value) => onPatch({ amount: value })} />
        </label>
        <label className="detail-field">
          <span>Currency</span>
          <Cell value={record.currency} onChange={(value) => onPatch({ currency: value })} />
        </label>
      </div>

      {record.fields.length > 0 && (
        <div className="detail-block">
          <h4>Extracted fields</h4>
          <div className="fields">
            {record.fields.map((field, index) => (
              <div className="field-row" key={`${field.label}-${index}`}>
                <input
                  className="cell-input"
                  dir="auto"
                  value={field.label}
                  onChange={(event) => {
                    const next = record.fields.map((entry, i) =>
                      i === index ? { ...entry, label: event.target.value } : entry,
                    )
                    onPatch({ fields: next })
                  }}
                />
                <input
                  className="cell-input"
                  dir="auto"
                  value={field.value}
                  onChange={(event) => {
                    const next = record.fields.map((entry, i) =>
                      i === index ? { ...entry, value: event.target.value } : entry,
                    )
                    onPatch({ fields: next })
                  }}
                />
                <button
                  type="button"
                  className="icon"
                  title="Remove field"
                  onClick={() => onPatch({ fields: record.fields.filter((_, i) => i !== index) })}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {record.items.length > 0 && (
        <div className="detail-block">
          <h4>Items</h4>
          <table className="items-table">
            <thead>
              <tr>
                <th>Description</th>
                <th>Quantity</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {record.items.map((item, index) => (
                <tr key={index}>
                  <td>
                    <Cell
                      value={item.description}
                      onChange={(value) =>
                        onPatch({ items: record.items.map((row, i) => (i === index ? { ...row, description: value } : row)) })
                      }
                    />
                  </td>
                  <td>
                    <Cell
                      value={item.quantity}
                      onChange={(value) =>
                        onPatch({ items: record.items.map((row, i) => (i === index ? { ...row, quantity: value } : row)) })
                      }
                    />
                  </td>
                  <td>
                    <Cell
                      value={item.notes}
                      onChange={(value) =>
                        onPatch({ items: record.items.map((row, i) => (i === index ? { ...row, notes: value } : row)) })
                      }
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {record.thumbs.length > 0 && (
        <div className="detail-block">
          <h4>Pages</h4>
          <div className="thumbs">
            {record.thumbs.map((thumb, index) => (
              <figure key={index}>
                <img src={thumb} alt={`Page ${index + 1}`} loading="lazy" />
                <figcaption>{index + 1}</figcaption>
              </figure>
            ))}
          </div>
        </div>
      )}

      <div className="detail-block">
        <h4>Full text (editable)</h4>
        <textarea
          className="textarea"
          dir="auto"
          rows={10}
          value={record.fullText}
          onChange={(event) => onPatch({ fullText: event.target.value })}
          placeholder="The recognised text will appear here."
        />
      </div>

      <div className="detail-grid">
        <label className="detail-field">
          <span>Confidence</span>
          <Cell value={record.confidence} onChange={(value) => onPatch({ confidence: value })} />
        </label>
        <label className="detail-field">
          <span>Notes</span>
          <Cell value={record.notes} onChange={(value) => onPatch({ notes: value })} />
        </label>
      </div>
    </div>
  )
}

export function ResultsTable({ items, onPatch, onRemove }: Props) {
  const [open, setOpen] = useState<Set<string>>(new Set())
  const rows = items.filter((item) => item.record || item.error)
  if (rows.length === 0) return null

  const toggle = (id: string) => {
    setOpen((previous) => {
      const next = new Set(previous)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <section className="card">
      <div className="card-head">
        <h2>Results</h2>
        <span className="muted">One record per file · click a row to review and edit</span>
      </div>

      <div className="table-wrap">
        <table className="results">
          <thead>
            <tr>
              {COLUMNS.map((column, index) => (
                <th
                  key={index}
                  className={`col-${column.kind}${column.kind === 'computed' && column.header === 'Status' ? ' col-status' : ''}`}
                >
                  {column.header}
                </th>
              ))}
              <th className="col-actions" />
            </tr>
          </thead>
          <tbody>
            {rows.map((item) => {
              const record = item.record
              const expanded = open.has(item.id)
              return (
                <Fragment key={item.id}>
                  <tr className={expanded ? 'row-open' : undefined}>
                    {COLUMNS.map((column, index) => {
                      if (column.kind === 'file') {
                        return (
                          <td key={index} className="col-file">
                            <span className="file-name" dir="auto">
                              {item.source.file.name}
                            </span>
                            <span className="file-meta">
                              {fileKind(item.source.file)}
                              {record ? ` · ${record.pageCount} page(s)` : ''}
                            </span>
                          </td>
                        )
                      }
                      if (column.header === 'Status') {
                        return (
                          <td key={index} className="col-status">
                            {item.error ? (
                              <span className="badge badge--error">Error</span>
                            ) : (
                              <span className="badge badge--ok">Done</span>
                            )}
                          </td>
                        )
                      }
                      if (column.kind === 'computed') {
                        return (
                          <td key={index} className="col-computed">
                            {column.value(item)}
                          </td>
                        )
                      }
                      if (!record) return <td key={index}>—</td>
                      if (column.kind === 'doc') {
                        return (
                          <td key={index}>
                            <Cell
                              value={record[column.key]}
                              onChange={(value) => onPatch(item.id, patchDoc(column.key, value))}
                            />
                          </td>
                        )
                      }
                      return (
                        <td key={index}>
                          <Cell
                            value={extractedValue(record, column.column)}
                            onChange={(value) =>
                              onPatch(item.id, { fields: setFieldValue(record.fields, column.column, value) })
                            }
                          />
                        </td>
                      )
                    })}
                    <td className="col-actions">
                      <button type="button" className="ghost small" onClick={() => toggle(item.id)}>
                        {expanded ? 'Close' : 'Review'}
                      </button>
                      <button type="button" className="icon" title="Remove row" onClick={() => onRemove(item.id)}>
                        ×
                      </button>
                    </td>
                  </tr>
                  {expanded && (
                    <tr className="detail-row">
                      <td colSpan={COLUMNS.length + 1}>
                        {item.error && <p className="note note--error">{item.error}</p>}
                        {record ? (
                          <Detail record={record} onPatch={(patch) => onPatch(item.id, patch)} />
                        ) : (
                          <p className="muted">
                            This file failed, so it has no extracted record. It will still export as a row with the error.
                          </p>
                        )}
                      </td>
                    </tr>
                  )}
                </Fragment>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}
