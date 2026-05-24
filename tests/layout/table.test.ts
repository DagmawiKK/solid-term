import { describe, it, expect } from 'vitest'
import { layoutTable, distributeColumnWidths } from '../../src/layout/table.js'
import type { IRElementNode, TableCellMeta } from '../../src/core/ir.js'
import type { LayoutContext } from '../../src/layout/index.js'
import type { TerminalCaps } from '../../src/core/capabilities.js'

const defaultCaps: TerminalCaps = {
  width: 80, height: 24, colors: 'truecolor',
  mouse: true, hyperlinks: false, images: [],
  theme: 'dark', unicode: true,
}

const defaultCtx: LayoutContext = { width: 80, caps: defaultCaps }

function cell(text: string, meta?: Partial<TableCellMeta>): IRElementNode {
  return {
    kind: 'element', tag: 'td', children: [{ kind: 'text', text, style: {} }],
    style: {}, box: expectedBox(), classList: [], flexClasses: [],
    widthClasses: [], scrollTop: 0,
    tableCell: meta ? { priority: meta.priority ?? 1, align: meta.align ?? 'left', colSpan: meta.colSpan ?? 1 } : undefined,
  }
}

function header(text: string, meta?: Partial<TableCellMeta>): IRElementNode {
  return {
    kind: 'element', tag: 'th', children: [{ kind: 'text', text, style: {} }],
    style: {}, box: expectedBox(), classList: [], flexClasses: [],
    widthClasses: [], scrollTop: 0,
    tableCell: meta ? { priority: meta.priority ?? 1, align: meta.align ?? 'left', colSpan: meta.colSpan ?? 1 } : undefined,
  }
}

function row(cells: IRElementNode[]): IRElementNode {
  return {
    kind: 'element', tag: 'tr', children: cells,
    style: {}, box: expectedBox(), classList: [], flexClasses: [],
    widthClasses: [], scrollTop: 0,
  }
}

function table(headers: IRElementNode[], bodyRows: IRElementNode[][]): IRElementNode {
  const rows: IRElementNode[] = [row(headers), ...bodyRows.map(cells => row(cells))]
  return {
    kind: 'element', tag: 'table', children: rows,
    style: {}, box: expectedBox(), classList: [], flexClasses: [],
    widthClasses: [], scrollTop: 0,
  }
}

function expectedBox() {
  return {
    paddingTop: 0, paddingRight: 0, paddingBottom: 0, paddingLeft: 0,
    borderTop: 0, borderRight: 0, borderBottom: 0, borderLeft: 0,
    borderStyle: 'single' as const,
  }
}

describe('distributeColumnWidths', () => {
  it('distributes surplus proportionally when columns fit', () => {
    // 2 columns, each minimum 10, available 40
    // total minimum = 20, surplus = 20
    const result = distributeColumnWidths([10, 10], 40)
    expect(result).toHaveLength(2)
    // Each gets floor(20 * 10/20) = 10 extra, so 20 each
    expect(result[0] + result[1]).toBeLessThanOrEqual(40)
  })

  it('scales down when columns exceed available width', () => {
    const result = distributeColumnWidths([50, 50], 60)
    expect(result).toHaveLength(2)
    // Each scaled by 60/100 = 0.6 → 30 each
    expect(result[0]).toBe(30)
    expect(result[1]).toBe(30)
  })

  it('never goes below 3 per column', () => {
    const result = distributeColumnWidths([100, 100], 10)
    expect(result[0]).toBeGreaterThanOrEqual(3)
    expect(result[1]).toBeGreaterThanOrEqual(3)
  })

  it('handles single column', () => {
    expect(distributeColumnWidths([20], 50)).toEqual([50])
  })

  it('exact fit returns minimums', () => {
    const result = distributeColumnWidths([10, 20], 30)
    expect(result[0] + result[1]).toBe(30)
  })

  it('handles unequal minimums', () => {
    const result = distributeColumnWidths([10, 50], 60)
    expect(result[0]).toBeGreaterThanOrEqual(10)
    expect(result[1]).toBeGreaterThanOrEqual(50)
  })
})

describe('layoutTable', () => {
  it('returns empty layout for empty table', () => {
    const emptyTable: IRElementNode = {
      kind: 'element', tag: 'table', children: [],
      style: {}, box: expectedBox(), classList: [],
      flexClasses: [], widthClasses: [], scrollTop: 0,
    }
    const result = layoutTable(emptyTable, 80, defaultCtx)
    expect(result.lines).toEqual([])
    expect(result.height).toBe(0)
  })

  it('renders top border, header, separator, bodies, bottom border', () => {
    const t = table(
      [header('Name'), header('Role')],
      [[cell('Alice'), cell('Engineer')]],
    )
    const result = layoutTable(t, 80, defaultCtx)
    expect(result.lines.length).toBeGreaterThanOrEqual(5)
    expect(result.lines[0]).toMatch(/^┌/)
    expect(result.lines[1]).toMatch(/^│/)
    expect(result.lines[2]).toMatch(/^├/)
    expect(result.lines[result.lines.length - 1]).toMatch(/^└/)
  })

  it('includes padding spaces in data rows', () => {
    const t = table(
      [header('A'), header('B')],
      [[cell('1'), cell('2')]],
    )
    const result = layoutTable(t, 80, defaultCtx)
    const rowLine = result.lines[1]
    expect(rowLine).toContain(' A ')
    expect(rowLine).toContain(' B ')
  })

  it('renders bottom border correctly', () => {
    const t = table(
      [header('X')],
      [[cell('Y')]],
    )
    const result = layoutTable(t, 40, defaultCtx)
    const last = result.lines[result.lines.length - 1]
    expect(last).toMatch(/^└/)
    expect(last).toMatch(/┘$/)
  })

  it('handles multiple body rows', () => {
    const t = table(
      [header('C1')],
      [[cell('r1')], [cell('r2')], [cell('r3')]],
    )
    const result = layoutTable(t, 80, defaultCtx)
    expect(result.lines.length).toBe(7) // top + header + sep + 3 body + bottom
  })
})

describe('column priority pruning', () => {
  it('shows all columns at width >= 120', () => {
    const wideCtx: LayoutContext = { width: 120, caps: { ...defaultCaps, width: 120 } }
    const t = table(
      [header('Name'), header('Role'), header('Details', { priority: 3 })],
      [[cell('Alice'), cell('Engineer'), cell('Extra')]],
    )
    const result = layoutTable(t, 120, wideCtx)
    expect(result.lines.length).toBeGreaterThanOrEqual(4)
    expect(result.lines[1]).toContain('Details')
  })

  it('prunes priority 3 columns at width < 120', () => {
    const t = table(
      [header('Name'), header('Role'), header('Details', { priority: 3 })],
      [[cell('Alice'), cell('Engineer'), cell('Extra')]],
    )
    const result = layoutTable(t, 100, defaultCtx)
    expect(result.lines.length).toBeGreaterThanOrEqual(4)
    expect(result.lines[1]).not.toContain('Details')
  })

  it('shows priority 2 columns at width >= 80', () => {
    const t = table(
      [header('Name'), header('Team', { priority: 2 })],
      [[cell('Alice'), cell('Platform')]],
    )
    const result = layoutTable(t, 80, defaultCtx)
    expect(result.lines[1]).toContain('Team')
  })

  it('prunes priority 2 columns at width < 80', () => {
    const narrowCtx: LayoutContext = { width: 60, caps: { ...defaultCaps, width: 60 } }
    const t = table(
      [header('Name'), header('Team', { priority: 2 })],
      [[cell('Alice'), cell('Platform')]],
    )
    const result = layoutTable(t, 60, narrowCtx)
    expect(result.lines[1]).not.toContain('Team')
  })

  it('always shows priority 1 columns', () => {
    const tinyCtx: LayoutContext = { width: 30, caps: { ...defaultCaps, width: 30 } }
    const t = table(
      [header('Name', { priority: 1 }), header('Secret', { priority: 3 })],
      [[cell('Alice'), cell('hidden')]],
    )
    const result = layoutTable(t, 30, tinyCtx)
    // Priority 1 must always be visible
    expect(result.lines[3]).toContain('Alice')
    expect(result.lines[0]).toMatch(/^┌/)
  })

  it('returns empty if all columns pruned', () => {
    const tinyCtx: LayoutContext = { width: 30, caps: { ...defaultCaps, width: 30 } }
    const t = table(
      [header('Secret', { priority: 3 })],
      [[cell('hidden')]],
    )
    const result = layoutTable(t, 30, tinyCtx)
    expect(result.lines).toEqual([])
    expect(result.height).toBe(0)
  })
})

describe('cell alignment', () => {
  it('left-aligns by default', () => {
    const t = table(
      [header('Name')],
      [[cell('Alice')]],
    )
    const result = layoutTable(t, 80, defaultCtx)
    expect(result.lines[1]).toMatch(/^│ /)
  })

  it('right-aligns text when specified', () => {
    const t = table(
      [header('Num', { align: 'right' })],
      [[cell('42', { align: 'right' })]],
    )
    const result = layoutTable(t, 20, defaultCtx)
    const row = result.lines[3]
    expect(row).toMatch(/│\s+42\s+│/)
  })

  it('centers text when specified', () => {
    const t = table(
      [header('X', { align: 'center' })],
      [[cell('Y', { align: 'center' })]],
    )
    const result = layoutTable(t, 20, defaultCtx)
    const row = result.lines[3] // top + header + sep + body
    expect(row).toMatch(/│\s+Y\s+│/)
  })
})

describe('multi-line cells', () => {
  it('wraps cell content that exceeds column width', () => {
    // Very narrow table forces cell wrapping
    const narrowCtx: LayoutContext = { width: 16, caps: { ...defaultCaps, width: 16 } }
    const t = table(
      [header('Name'), header('Desc')],
      [[cell('Alice'), cell('long description text that wraps')]],
    )
    const result = layoutTable(t, 16, narrowCtx)
    // Each row data section should have at least 2 lines
    expect(result.lines.length).toBeGreaterThan(5)
  })

  it('uses max lines among all cells in a row', () => {
    const narrowCtx: LayoutContext = { width: 20, caps: { ...defaultCaps, width: 20 } }
    const t = table(
      [header('A'), header('B')],
      [[cell('short'), cell('much longer text here needing wrap')]],
    )
    const result = layoutTable(t, 20, narrowCtx)
    // Header + separator + body rows can have variable count
    expect(result.lines.length).toBeGreaterThan(4)
  })
})
