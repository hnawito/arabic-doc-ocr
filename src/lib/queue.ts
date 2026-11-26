/** Run async work over a list with a fixed number of parallel workers. */

export async function runPool<T>(
  items: T[],
  limit: number,
  worker: (item: T, index: number) => Promise<void>,
  signal?: AbortSignal,
): Promise<void> {
  let next = 0
  const size = Math.max(1, Math.min(limit, items.length))

  const runners = Array.from({ length: size }, async () => {
    for (;;) {
      if (signal?.aborted) return
      const index = next
      next += 1
      if (index >= items.length) return
      await worker(items[index], index)
    }
  })

  await Promise.all(runners)
}
