import type { ComputedStyle, StyleTokens, BoxModel, IRElementNode, IRTextNode } from '../core/ir.js'

export function resolvePaintStyle(node: { computed?: ComputedStyle; style: StyleTokens }): StyleTokens {
  const c = node.computed
  const s = node.style
  if (!c) return { ...s }

  return {
    fg: s.fg ?? c.fg,
    bg: s.bg ?? c.bg,
    bold: s.bold !== undefined ? s.bold : c.bold,
    italic: s.italic !== undefined ? s.italic : c.italic,
    underline: s.underline !== undefined ? s.underline : c.underline,
    strikethrough: s.strikethrough !== undefined ? s.strikethrough : c.strikethrough,
  }
}

export function syncBoxFromComputed(node: IRElementNode): void {
  const c = node.computed
  if (!c) return

  node.box = {
    paddingTop: c.paddingTop,
    paddingRight: c.paddingRight,
    paddingBottom: c.paddingBottom,
    paddingLeft: c.paddingLeft,
    borderTop: c.borderTop,
    borderRight: c.borderRight,
    borderBottom: c.borderBottom,
    borderLeft: c.borderLeft,
    borderStyle: c.borderStyle,
    borderColor: c.borderColor,
  }
}

export function applyTableCellDataAttr(node: IRElementNode, name: string, value: string): void {
  if (node.tag !== 'th' && node.tag !== 'td') return

  const prev = node.tableCell ?? { priority: 1 as const, align: 'left' as const, colSpan: 1 }

  if (name === 'data-priority') {
    const p = parseInt(value, 10)
    const priority = (p === 2 || p === 3 ? p : 1) as 1 | 2 | 3
    node.tableCell = { ...prev, priority }
    return
  }

  if (name === 'data-align') {
    const align = value === 'center' || value === 'right' ? value : 'left'
    node.tableCell = { ...prev, align }
  }
}

export function formatInputDisplay(node: IRElementNode): string {
  const value = node.inputValue ?? ''
  return value.length > 0 ? value : ' '
}
