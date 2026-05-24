import type { IRElementNode } from '../core/ir.js'

export interface FlexConfig {
  direction: 'row' | 'col'
  gap: number
  active: boolean
  wrap: boolean
}

const BREAKPOINTS: Record<string, number> = {
  sm: 60, md: 80, lg: 100, xl: 120, '2xl': 140,
}

export function resolveFlex(classList: string[], terminalWidth: number): FlexConfig | null {
  let direction: 'row' | 'col' = 'col'
  let gap = 0
  let active = false
  let isFlex = false
  let wrap = false

  for (const cls of classList) {
    const [prefix, base] = splitResponsive(cls)
    const breakpointActive = !prefix || terminalWidth >= (BREAKPOINTS[prefix] ?? 80)

    if (base === 'flex' || base === 'flex-row') {
      isFlex = true
      direction = 'row'
      if (breakpointActive) active = true
    }
    if (base === 'flex-col') {
      isFlex = true
      direction = 'col'
      if (breakpointActive) active = true
    }
    if (base === 'flex-wrap') wrap = true

    const gapMatch = base.match(/^gap-(\d+)$/)
    if (gapMatch) gap = parseInt(gapMatch[1])
  }

  return isFlex ? { direction, gap, active, wrap } : null
}

export function splitResponsive(cls: string): [string | null, string] {
  for (const p of ['2xl:', 'xl:', 'lg:', 'md:', 'sm:']) {
    if (cls.startsWith(p)) return [p.slice(0, -1), cls.slice(p.length)]
  }
  return [null, cls]
}

export function extractWidthClasses(classList: string[]): string[] {
  return classList.filter(cls => {
    const base = splitResponsive(cls)[1]
    return /^w-\d+\/\d+$/.test(base) || base === 'flex-1' || base === 'w-full' || base === 'w-auto'
  })
}

export function extractFlexClasses(classList: string[]): string[] {
  return classList.filter(cls => {
    const base = splitResponsive(cls)[1]
    return base === 'flex' || base === 'flex-row' || base === 'flex-col'
      || base === 'flex-1' || base === 'flex-wrap'
      || /^gap-\d+$/.test(base)
  })
}

const MIN_COLUMN_WIDTH = 10

interface FlexSlot {
  node: IRElementNode
  kind: 'proportional' | 'fill' | 'intrinsic'
  proportion: number
  minWidth: number
  allocatedWidth: number
}

export function allocateFlexWidths(
  children: IRElementNode[],
  availableWidth: number,
  gap: number,
  measureMin: (node: IRElementNode) => number,
): number[] | null {
  if (children.length === 0) return []

  const gapTotal = gap * Math.max(0, children.length - 1)
  const remaining = Math.max(0, availableWidth - gapTotal)

  const slots: FlexSlot[] = children.map(child => {
    const wc = child.widthClasses
    const prop = findProportion(wc)
    const isFill = wc.some(c => splitResponsive(c)[1] === 'flex-1')
    const min = Math.max(MIN_COLUMN_WIDTH, measureMin(child))

    if (prop !== null) return { node: child, kind: 'proportional', proportion: prop, minWidth: min, allocatedWidth: 0 }
    if (isFill) return { node: child, kind: 'fill', proportion: 0, minWidth: MIN_COLUMN_WIDTH, allocatedWidth: 0 }
    return { node: child, kind: 'intrinsic', proportion: 0, minWidth: min, allocatedWidth: 0 }
  })

  const totalMin = slots.reduce((s, slot) => s + slot.minWidth, 0)
  if (totalMin + gapTotal > availableWidth) return null

  let allocated = 0
  const driftItems: { index: number; drift: number }[] = []

  slots.forEach((slot, i) => {
    if (slot.kind === 'proportional') {
      const exact = remaining * slot.proportion
      const floored = Math.max(Math.floor(exact), slot.minWidth)
      slot.allocatedWidth = floored
      allocated += floored
      driftItems.push({ index: i, drift: exact - floored })
    } else if (slot.kind === 'intrinsic') {
      slot.allocatedWidth = slot.minWidth
      allocated += slot.minWidth
    }
  })

  let leftover = remaining - allocated
  driftItems.sort((a, b) => b.drift - a.drift)
  for (const item of driftItems) {
    if (leftover <= 0) break
    slots[item.index].allocatedWidth++
    leftover--
  }

  const fillSlots = slots.filter(s => s.kind === 'fill')
  if (fillSlots.length > 0) {
    const used = slots.filter(s => s.kind !== 'fill').reduce((s, sl) => s + sl.allocatedWidth, 0)
    const perFill = Math.max(Math.floor((remaining - used) / fillSlots.length), MIN_COLUMN_WIDTH)
    fillSlots.forEach(s => { s.allocatedWidth = perFill })
  }

  return slots.map(s => s.allocatedWidth)
}

function findProportion(widthClasses: string[]): number | null {
  for (const cls of widthClasses) {
    const base = splitResponsive(cls)[1]
    const m = base.match(/^w-(\d+)\/(\d+)$/)
    if (m) return parseInt(m[1]) / parseInt(m[2])
    if (base === 'w-full') return 1
  }
  return null
}
