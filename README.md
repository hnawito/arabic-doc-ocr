# Arabic Document OCR → Excel

[![CI](https://github.com/hnawito/arabic-doc-ocr/actions/workflows/ci.yml/badge.svg)](https://github.com/hnawito/arabic-doc-ocr/actions/workflows/ci.yml)

A browser-only web app for scanned Arabic documents (printed and handwritten).
Pick as many images and scanned PDFs as you need, and it reads them with Google
Gemini using your own API key, then exports **one row per file** to an `.xlsx`
workbook.

Nothing is uploaded to a server of ours: the files are rendered in the page and
sent straight to `generativelanguage.googleapis.com` with the key you type in.

## Run locally

```sh
npm install
npm run dev      # http://127.0.0.1:5173
npm run typecheck
npm run build
```

## Using it

0. Sign in with the user name and password you were given. The gate compares
   SHA-256 digests in the browser and keeps the session for the tab; it is a
   convenience lock, not real security (anyone with the source can bypass it).
   Signing out unmounts the workspace so its files and records are discarded.
   Change the credentials by replacing the two hashes in `src/lib/auth.ts`.
1. Paste a Google AI Studio key (https://aistudio.google.com/apikey) and press
   **Test key** — the model list is loaded from your key.
2. **Choose files** — one or many images or scanned PDFs, or drag them onto the
   drop area. Images and PDFs are processed and everything else is skipped.
   Selecting more files later adds them to the queue. On a phone or tablet a
   **Take a photo** button opens the rear camera and adds the shot as
   `photo-<timestamp>.jpg`.
3. **Start OCR**. Each file becomes one record: document type, date, sender,
   receiver, amount, form fields, table items, full text.
4. Review and edit any cell — handwriting is never perfect.
5. **Export Excel** writes a single sheet with one row per file and these fixed
   columns: File, TYPE, DATE upload, Sender, Receiver, CURRENCY, Amount, Status,
   Document TYPE, TITLE, Number, DATE, then the extracted fields: Device, Date,
   Device Serial, Name, جهة العمل فرع / قطاع, Email, Mobile, Address, ID Number,
   Country, نوع تحقيق الشخصية, رقم تحقيق الشخصية, تاريخ التوقيع, Description,
   Quantity, Notes.

   Each extracted column is filled by matching the model's field labels (Arabic
   spelling variants are folded), and matched labels are renamed to the column
   names ("نوع الجهاز" becomes "Device") so the review list and the sheet agree.
   There is an obvious fallback such as the document date or the first table row.
   Editing a cell in the table writes the value back into that record's fields.
6. **Send…** opens a small menu. Where the browser can share files (phones, and
   Chrome on Windows) the first choice hands the `.xlsx` to the system share
   sheet. **WhatsApp** and **Email** are always listed as fallbacks: each
   downloads the workbook and opens a message saying the file must be attached.

## Notes

- PDFs are rasterised with `pdf.js` (bundled, no CDN); pages are sent six at a
  time and merged into a single record for the file.
- Requests run two at a time and retry `429`/`5xx` responses with backoff.
- The key is kept in memory unless you tick "Remember this key on this device",
  which stores it in `localStorage`. It is never written to a project file.
- Publishing: `deploy.json` + `worker/index.js` serve `dist/` on Freebuff Sites.
