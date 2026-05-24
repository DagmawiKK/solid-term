import stringWidth from 'string-width'
import type { IRNode, IRElementNode } from '../core/ir.js'
import { isTextNode, isElementNode } from '../core/ir.js'
import type { LayoutContext } from './index.js'

export function measureMinWidth(node: IRElementNode, ctx: LayoutContext): number {
  switch (node.tag) {
    case 'text':
      return 0

    case 'code':
    case 'pre': {
      const text = extractText(node)
      if (!text) return 0
      return Math.max(...text.split('\n').map(l => stringWidth(l)))
    }

    case 'table': {
      const rows = extractAllRows(node)
      if (rows.length === 0) return 10
      const colCount = Math.max(...rows.map(r => r.children.filter(isElementNode).length))
      return colCount * 5 + (colCount + 1)
    }

    case 'div':
    case 'section':
    case 'article':
    case 'main':
    case 'aside':
    case 'header':
    case 'footer':
    case 'nav':
    case 'p':
    case 'span':
    case 'h1': case 'h2': case 'h3':
    case 'h4': case 'h5': case 'h6':
    case 'button':
    case 'label': {
      const elementChildren = node.children.filter(isElementNode)
      if (elementChildren.length > 0) {
        return Math.max(0, ...elementChildren.map(c => measureMinWidth(c, ctx)))
      }
      const text = extractText(node)
      if (text) {
        const words = text.split(/\s+/).filter(Boolean)
        return Math.max(0, ...words.map(w => stringWidth(w)))
      }
      return 0
    }

    default:
      return Math.max(0, ...node.children.filter(isElementNode).map(c => measureMinWidth(c, ctx)))
  }
}

export function wrapText(text: string, width: number): string[] {
  if (width <= 0) return ['']
  if (!text) return ['']

  const lines: string[] = []
  let currentLine = ''
  let currentWidth = 0

  const words = text.split(/(\s+)/)

  for (const word of words) {
    const wordWidth = stringWidth(word)

    if (currentWidth + wordWidth <= width) {
      currentLine += word
      currentWidth += wordWidth
    } else {
      if (currentLine.trim()) {
        lines.push(currentLine.trimEnd())
        currentLine = ''
        currentWidth = 0
      }

      if (wordWidth > width) {
        currentLine = truncateToWidth(word, width - 1) + '…'
        currentWidth = width
      } else {
        const trimmed = word.trimStart()
        currentLine = trimmed
        currentWidth = stringWidth(trimmed)
      }
    }
  }

  if (currentLine.trim()) lines.push(currentLine.trimEnd())
  return lines.length > 0 ? lines : ['']
}

function truncateToWidth(str: string, maxWidth: number): string {
  let result = ''
  let used = 0

  const seg = typeof Intl !== 'undefined' && (Intl as any).Segmenter
    ? new (Intl as any).Segmenter(undefined, { granularity: 'grapheme' })
    : null
  const graphemes: string[] = seg
    ? Array.from(seg.segment(str), (s: any) => s.segment)
    : Array.from(str)

  for (const g of graphemes) {
    const w = stringWidth(g)
    if (used + w > maxWidth) break
    result += g
    used += w
  }

  return result
}

export function extractText(node: IRNode): string {
  if (isTextNode(node)) return node.text
  return node.children.map(extractText).join('')
}

function extractAllRows(table: IRElementNode): IRElementNode[] {
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
