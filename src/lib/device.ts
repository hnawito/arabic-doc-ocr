/** Whether this browser runs on a phone or tablet, where a camera button makes sense. */

const MOBILE_UA = /Android|iPhone|iPad|iPod|Windows Phone|Mobile|Tablet|Silk/i

export function isMobileDevice(
  userAgent: string = typeof navigator === 'undefined' ? '' : navigator.userAgent,
  coarsePointer: boolean =
    typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches,
  width: number = typeof window === 'undefined' ? 1280 : window.innerWidth,
): boolean {
  if (MOBILE_UA.test(userAgent)) return true
  // iPads report a desktop Macintosh user agent but expose touch points.
  if (/Macintosh/i.test(userAgent) && typeof navigator !== 'undefined' && navigator.maxTouchPoints > 1) return true
  return coarsePointer && width <= 900
}
