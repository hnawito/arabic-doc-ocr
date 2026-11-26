import { useRef, useState, type DragEvent } from 'react'
import type { SourceFile } from '../lib/schema'

type Props = {
  disabled: boolean
  /** Phones and tablets get a direct camera button. */
  mobile: boolean
  onFiles: (files: SourceFile[]) => void
}

export function DropZone({ disabled, mobile, onFiles }: Props) {
  const input = useRef<HTMLInputElement>(null)
  const camera = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setDragging(false)
    if (disabled) return
    const files = Array.from(event.dataTransfer.files ?? []).map((file) => ({ file }))
    if (files.length > 0) onFiles(files)
  }

  return (
    <section
      className={`card dropzone${dragging ? ' dropzone--active' : ''}${disabled ? ' dropzone--disabled' : ''}`}
      onDragOver={(event) => {
        event.preventDefault()
        if (!disabled) setDragging(true)
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
    >
      <h2>3 · Add files</h2>
      <p className="hint">
        Choose one or more images or scanned PDFs{mobile ? ', take a photo of the document,' : ''} or drag them here.
        Images and PDFs are processed; other types are skipped.
      </p>

      <div className="dropzone-actions">
        <button type="button" className="primary" onClick={() => input.current?.click()} disabled={disabled}>
          Choose files
        </button>
        {mobile && (
          <button type="button" className="ghost" onClick={() => camera.current?.click()} disabled={disabled}>
            Take a photo
          </button>
        )}
        <span className="muted">or drag &amp; drop files</span>
      </div>

      <input
        ref={input}
        type="file"
        multiple
        hidden
        accept=".pdf,.jpg,.jpeg,.png,.webp,.bmp,application/pdf,image/*"
        onChange={(event) => {
          const files = Array.from(event.target.files ?? []).map((file) => ({ file }))
          if (files.length > 0) onFiles(files)
          event.target.value = ''
        }}
      />

      {mobile && (
        <input
          ref={camera}
          type="file"
          accept="image/*"
          capture="environment"
          hidden
          onChange={(event) => {
            const file = event.target.files?.[0]
            event.target.value = ''
            if (!file) return
            const extension = /\.[a-z0-9]+$/i.exec(file.name)?.[0] ?? '.jpg'
            const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')
            const named = new File([file], `photo-${stamp}${extension}`, { type: file.type || 'image/jpeg' })
            onFiles([{ file: named }])
          }}
        />
      )}
    </section>
  )
}
