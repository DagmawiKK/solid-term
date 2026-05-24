import stringWidth from 'string-width'
import type { IRElementNode } from '../core/ir.js'
import { isElementNode } from '../core/ir.js'
import { wrapText, extractText } from './measure.js'
import type { LayoutContext } from './index.js'

export interface TableLayout {
  lines: string[]
  height: number
}

interface ColDef {
  headerText: string
  priority: 1 | 2 | 3
  align: 'left' | 'center' | 'right'
  index: number
}

export function layoutTable(node: IRElementNode, availableWidth: number, ctx: LayoutContext): TableLayout {
  const allRows = extractTableRows(node)
  if (allRows.length === 0) return { lines: [], height: 0 }

  const headerRow = allRows[0]
  const bodyRows = allRows.slice(1)

  const cols: ColDef[] = headerRow.children
    .filter(isElementNode)
    .map((cell, i) => ({
      headerText: extractText(cell),
      priority: cell.tableCell?.priority ?? 1,
      align: cell.tableCell?.align ?? 'left',
      index: i,
    }))

  const visibleCols = cols.filter(col => {
    if (col.priority >= 3) return ctx.width >= 120
    if (col.priority === 2) return ctx.width >= 80
    return true
  })

  if (visibleCols.length === 0) return { lines: [], height: 0 }

  const colMins = visibleCols.map(col => {
    const headerWidth = stringWidth(col.headerText)
    const cellWidths = bodyRows.map(row => {
      const cell = row.children.filter(isElementNode)[col.index]
      return cell ? stringWidth(extractText(cell)) : 0
    })
    return Math.max(headerWidth, ...cellWidths, 3)
  })

  const borderChars = visibleCols.length + 1
  const contentWidth = Math.max(availableWidth - borderChars, visibleCols.length * 3)
  const colWidths = distributeColumnWidths(colMins, contentWidth)

  const lines: string[] = []

  lines.push(buildHorizontalBorder(colWidths, 'top'))

  lines.push(buildDataRow(
    visibleCols.map((col, i) => ({ text: col.headerText, width: colWidths[i], align: col.align }))
  ))

  lines.push(buildHorizontalBorder(colWidths, 'middle'))

  for (const row of bodyRows) {
    const cellContents = visibleCols.map((col, i) => {
      const cell = row.children.filter(isElementNode)[col.index]
      const text = cell ? extractText(cell) : ''
      const align = cell?.tableCell?.align ?? col.align
      return { text, width: colWidths[i], align }
    })

    const wrappedCells = cellContents.map(c => wrapText(c.text, c.width))
    const maxLines = Math.max(...wrappedCells.map(c => c.length))

    for (let lineIdx = 0; lineIdx < maxLines; lineIdx++) {
      const rowCells = cellContents.map((c, colIdx) => ({
        text: wrappedCells[colIdx][lineIdx] ?? '',
        width: c.width,
        align: c.align,
      }))
      lines.push(buildDataRow(rowCells))
    }
  }

  lines.push(buildHorizontalBorder(colWidths, 'bottom'))

  return { lines, height: lines.length }
}

export function distributeColumnWidths(minimums: number[], available: number): number[] {
  const total = minimums.reduce((s, m) => s + m, 0)
  if (total <= available) {
    const surplus = available - total
    return minimums.map((m, i) => {
      const share = Math.floor(surplus * (m / total))
      return m + share
    })
  }
  const scale = available / total
  return minimums.map(m => Math.max(3, Math.floor(m * scale)))
}

function buildHorizontalBorder(colWidths: number[], position: 'top' | 'middle' | 'bottom'): string {
  const [left, mid, right, fill] = position === 'top'
    ? ['┌', '┬', '┐', '─']
    : position === 'middle'
    ? ['├', '┼', '┤', '─']
    : ['└', '┴', '┘', '─']

  const segments = colWidths.map(w => fill.repeat(w + 2))
  return left + segments.join(mid) + right
}

function buildDataRow(cells: { text: string; width: number; align: 'left' | 'center' | 'right' }[]): string {
  const parts = cells.map(({ text, width, align }) => {
    const textWidth = stringWidth(text)
    const pad = Math.max(0, width - textWidth)

    let padded: string
    if (align === 'right') {
      padded = ' '.repeat(pad) + text
    } else if (align === 'center') {
      const left = Math.floor(pad / 2)
      const right = pad - left
      padded = ' '.repeat(left) + text + ' '.repeat(right)
    } else {
      padded = text + ' '.repeat(pad)
    }

    return ' ' + padded + ' '
  })
  return '│' + parts.join('│') + '│'
}

function extractTableRows(table: IRElementNode): IRElementNode[] {
  const rows: IRElementNode[] = []
  function walk(node: IRElementNode) {
    for (const child of node.children.filter(isElementNode)) {
      if (child.tag === 'tr') rows.push(child)
      else walk(child)
    }
  }
  walk(table)
  return rows
}
