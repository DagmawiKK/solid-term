import { describe, it, expect } from 'vitest'
import {
  resolveFlex,
  splitResponsive,
  extractWidthClasses,
  extractFlexClasses,
  allocateFlexWidths,
} from '../../src/layout/flex.js'
import { layout } from '../../src/layout/index.js'
import { createRootNode, defaultComputedStyle } from '../../src/core/ir.js'
import type { IRElementNode } from '../../src/core/ir.js'

function makeChild(widthClasses: string[] = [], minWidth = 10): IRElementNode {
  return {
    kind: 'element',
    tag: 'div',
    children: [],
    style: {},
    box: {
      paddingTop: 0, paddingRight: 0, paddingBottom: 0, paddingLeft: 0,
      borderTop: 0, borderRight: 0, borderBottom: 0, borderLeft: 0,
      borderStyle: 'single',
    },
    classList: [...widthClasses],
    flexClasses: extractFlexClasses(widthClasses),
    widthClasses: extractWidthClasses(widthClasses),
    scrollTop: 0,
    minWidth,
  } as IRElementNode & { minWidth: number }
}

describe('splitResponsive', () => {
  it('returns [null, cls] for unprefixed class', () => {
    expect(splitResponsive('flex')).toEqual([null, 'flex'])
  })

  it('splits responsive prefix', () => {
    expect(splitResponsive('md:flex')).toEqual(['md', 'flex'])
    expect(splitResponsive('lg:w-1/2')).toEqual(['lg', 'w-1/2'])
    expect(splitResponsive('xl:p-4')).toEqual(['xl', 'p-4'])
    expect(splitResponsive('2xl:flex-col')).toEqual(['2xl', 'flex-col'])
  })

  it('handles sm prefix', () => {
    expect(splitResponsive('sm:flex-row')).toEqual(['sm', 'flex-row'])
  })

  it('returns correct prefix for multi-level prefixes', () => {
    const [prefix, base] = splitResponsive('md:gap-4')
    expect(prefix).toBe('md')
    expect(base).toBe('gap-4')
  })
})

describe('resolveFlex', () => {
  it('returns null for no flex classes', () => {
    expect(resolveFlex([], 80)).toBeNull()
  })

  it('detects flex-row at active breakpoint', () => {
    const result = resolveFlex(['flex', 'gap-2'], 80)
    expect(result).not.toBeNull()
    expect(result!.active).toBe(true)
    expect(result!.direction).toBe('row')
    expect(result!.gap).toBe(2)
  })

  it('detects flex-col', () => {
    const result = resolveFlex(['flex-col'], 80)
    expect(result).not.toBeNull()
    expect(result!.direction).toBe('col')
    expect(result!.active).toBe(true)
  })

  it('flex at narrow width is active by default', () => {
    const result = resolveFlex(['flex'], 30)
    expect(result).not.toBeNull()
    expect(result!.active).toBe(true)
  })

  it('responsive flex disabled below breakpoint', () => {
    const result = resolveFlex(['md:flex'], 60)
    expect(result).not.toBeNull()
    // md breakpoint is 80, width 60 < 80
    expect(result!.active).toBe(false)
  })

  it('responsive flex active at or above breakpoint', () => {
    const result = resolveFlex(['md:flex'], 80)
    expect(result).not.toBeNull()
    expect(result!.active).toBe(true)
  })

  it('responsive flex active above breakpoint', () => {
    expect(resolveFlex(['md:flex'], 100)!.active).toBe(true)
    expect(resolveFlex(['lg:flex'], 100)!.active).toBe(true)
    expect(resolveFlex(['xl:flex'], 120)!.active).toBe(true)
  })

  it('detects flex-wrap', () => {
    const result = resolveFlex(['flex', 'flex-wrap'], 80)
    expect(result!.wrap).toBe(true)
  })

  it('gap defaults to 0', () => {
    const result = resolveFlex(['flex'], 80)
    expect(result!.gap).toBe(0)
  })

  it('parses gap-N', () => {
    expect(resolveFlex(['flex', 'gap-4'], 80)!.gap).toBe(4)
    expect(resolveFlex(['flex', 'gap-0'], 80)!.gap).toBe(0)
    expect(resolveFlex(['flex', 'gap-12'], 80)!.gap).toBe(12)
  })
})

describe('extractWidthClasses', () => {
  it('extracts w-1/2', () => {
    expect(extractWidthClasses(['w-1/2'])).toEqual(['w-1/2'])
  })

  it('extracts w-1/3, w-2/3, w-1/4, w-3/4', () => {
    expect(extractWidthClasses(['w-1/3'])).toEqual(['w-1/3'])
    expect(extractWidthClasses(['w-2/3'])).toEqual(['w-2/3'])
    expect(extractWidthClasses(['w-1/4'])).toEqual(['w-1/4'])
    expect(extractWidthClasses(['w-3/4'])).toEqual(['w-3/4'])
  })

  it('extracts flex-1', () => {
    expect(extractWidthClasses(['flex-1'])).toEqual(['flex-1'])
  })

  it('extracts w-full and w-auto', () => {
    expect(extractWidthClasses(['w-full'])).toEqual(['w-full'])
    expect(extractWidthClasses(['w-auto'])).toEqual(['w-auto'])
  })

  it('ignores non-width classes', () => {
    expect(extractWidthClasses(['flex', 'p-4', 'text-red-500'])).toEqual([])
  })

  it('extracts responsive width classes', () => {
    expect(extractWidthClasses(['md:w-1/2'])).toEqual(['md:w-1/2'])
  })
})

describe('extractFlexClasses', () => {
  it('extracts flex, flex-row, flex-col', () => {
    expect(extractFlexClasses(['flex'])).toEqual(['flex'])
    expect(extractFlexClasses(['flex-row'])).toEqual(['flex-row'])
    expect(extractFlexClasses(['flex-col'])).toEqual(['flex-col'])
  })

  it('extracts flex-1', () => {
    expect(extractFlexClasses(['flex-1'])).toEqual(['flex-1'])
  })

  it('extracts flex-wrap', () => {
    expect(extractFlexClasses(['flex-wrap'])).toEqual(['flex-wrap'])
  })

  it('extracts gap-N', () => {
    expect(extractFlexClasses(['gap-2'])).toEqual(['gap-2'])
    expect(extractFlexClasses(['gap-8'])).toEqual(['gap-8'])
  })

  it('ignores non-flex classes', () => {
    expect(extractFlexClasses(['p-4', 'text-red-500', 'border'])).toEqual([])
  })

  it('extracts responsive flex classes', () => {
    expect(extractFlexClasses(['md:flex-row'])).toEqual(['md:flex-row'])
  })
})

describe('allocateFlexWidths', () => {
  const measureMin = (node: IRElementNode) =>
    (node as IRElementNode & { minWidth?: number }).minWidth ?? 10

  it('returns empty array for no children', () => {
    expect(allocateFlexWidths([], 100, 0, measureMin)).toEqual([])
  })

  it('allocates full width to intrinsic children', () => {
    const children = [makeChild([], 10), makeChild([], 20)]
    const widths = allocateFlexWidths(children, 100, 0, measureMin)
    expect(widths).not.toBeNull()
    expect(widths!.length).toBe(2)
    expect(widths![0]).toBe(10)
    expect(widths![1]).toBe(20)
  })

  it('allocates proportional widths for w-1/2', () => {
    const children = [makeChild(['w-1/2'], 10), makeChild(['w-1/2'], 10)]
    const widths = allocateFlexWidths(children, 100, 0, measureMin)
    expect(widths).not.toBeNull()
    // Each gets ~50, but may have remainder correction
    expect(widths![0]).toBeGreaterThanOrEqual(45)
    expect(widths![1]).toBeGreaterThanOrEqual(45)
    expect(widths![0] + widths![1]).toBeLessThanOrEqual(100)
  })

  it('allocates proportional widths w-1/3 and w-2/3', () => {
    const children = [makeChild(['w-1/3'], 10), makeChild(['w-2/3'], 10)]
    const widths = allocateFlexWidths(children, 90, 0, measureMin)
    expect(widths).not.toBeNull()
    // w-1/3 gets ~30, w-2/3 gets ~60
    expect(widths![0]).toBeGreaterThanOrEqual(25)
    expect(widths![1]).toBeGreaterThanOrEqual(55)
    expect(widths![0] + widths![1]).toBeLessThanOrEqual(90)
  })

  it('allocates fill widths for flex-1', () => {
    const children = [makeChild(['flex-1'], 5), makeChild(['flex-1'], 5)]
    const widths = allocateFlexWidths(children, 100, 0, measureMin)
    expect(widths).not.toBeNull()
    // Fill slots share remaining space evenly
    expect(widths![0]).toBe(widths![1])
    expect(widths![0] + widths![1]).toBeLessThanOrEqual(100)
  })

  it('accounts for gap between children', () => {
    const children = [makeChild(['w-1/2'], 10), makeChild(['w-1/2'], 10)]
    const widths = allocateFlexWidths(children, 100, 4, measureMin)
    expect(widths).not.toBeNull()
    // 4px gap means only 96px available for content
    const total = widths![0] + widths![1]
    expect(total).toBeLessThanOrEqual(96)
  })

  it('returns null when minimums + gaps exceed available', () => {
    const children = [
      makeChild([], 60),
      makeChild([], 60),
    ]
    const widths = allocateFlexWidths(children, 100, 0, measureMin)
    expect(widths).toBeNull()
  })

  it('returns null when mins barely exceed available', () => {
    const children = [
      makeChild([], 55),
      makeChild([], 50),
    ]
    const widths = allocateFlexWidths(children, 100, 0, measureMin)
    expect(widths).toBeNull()
  })

  it('applies remainder correction (drift distribution)', () => {
    // w-1/3 of 100 = 33.333..., floored to 33, drift = 0.333...
    // But total sum should equal exactly 100
    const children = [
      makeChild(['w-1/3'], 10),
      makeChild(['w-1/3'], 10),
      makeChild(['w-1/3'], 10),
    ]
    const widths = allocateFlexWidths(children, 100, 0, measureMin)
    expect(widths).not.toBeNull()
    const total = widths!.reduce((s, w) => s + w, 0)
    expect(total).toBe(100)
  })

  it('handles mix of proportional, fill, and intrinsic', () => {
    const children = [
      makeChild(['w-1/2'], 10),  // proportional
      makeChild(['flex-1'], 10), // fill
      makeChild([], 15),         // intrinsic
    ]
    const widths = allocateFlexWidths(children, 100, 0, measureMin)
    expect(widths).not.toBeNull()
    expect(widths!.length).toBe(3)
  })

  it('handles w-full as proportion of 1', () => {
    const children = [makeChild(['w-full'], 10)]
    const widths = allocateFlexWidths(children, 100, 0, measureMin)
    expect(widths).not.toBeNull()
    expect(widths![0]).toBe(100)
  })

  it('enforces minimum column width of 10', () => {
    const children = [makeChild(['flex-1'], 3), makeChild(['flex-1'], 3)]
    const widths = allocateFlexWidths(children, 20, 0, () => 3)
    expect(widths).not.toBeNull()
    expect(widths![0]).toBeGreaterThanOrEqual(10)
    expect(widths![1]).toBeGreaterThanOrEqual(10)
  })

  it('handles single child', () => {
    const children = [makeChild(['w-full'], 10)]
    const widths = allocateFlexWidths(children, 50, 0, measureMin)
    expect(widths).toEqual([50])
  })

  it('handles single intrinsic child', () => {
    const children = [makeChild([], 25)]
    const widths = allocateFlexWidths(children, 100, 0, measureMin)
    expect(widths).toEqual([25])
  })
})

describe('flex-wrap layout', () => {
  it('wraps row flex children to next line when they exceed width', () => {
    const child = (text: string): IRElementNode => ({
      kind: 'element',
      tag: 'div',
      children: [{ kind: 'text', text, style: {} }],
      style: {},
      box: {
        paddingTop: 0, paddingRight: 0, paddingBottom: 0, paddingLeft: 0,
        borderTop: 0, borderRight: 0, borderBottom: 0, borderLeft: 0,
        borderStyle: 'single',
      },
      classList: [],
      flexClasses: [],
      widthClasses: [],
      scrollTop: 0,
    })

    const root = createRootNode()
    root.computed = { ...defaultComputedStyle(), display: 'flex', flexDirection: 'row', flexWrap: true, gap: 0 }
    root.children = [child('aaaaa'), child('bbbbb')]
    layout(root, 8, { width: 8, height: 10, colors: 'truecolor', mouse: false, hyperlinks: false, images: [], theme: 'dark', unicode: true })

    const c0 = root.children[0] as IRElementNode
    const c1 = root.children[1] as IRElementNode
    expect(c0.layout!.y).toBeLessThan(c1.layout!.y)
  })
})
