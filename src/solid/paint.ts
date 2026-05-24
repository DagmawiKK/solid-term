import type { IRNode, IRElementNode, IRTextNode, StyleTokens } from '../core/ir.js'
import type { TerminalCanvas } from '../canvas/index.js'
import { isTextNode, isElementNode } from '../core/ir.js'
import { resolvePaintStyle, formatInputDisplay } from './style-utils.js'

export function paintNode(node: IRNode, canvas: TerminalCanvas, scrollOffset = 0): void {
  if (isTextNode(node)) {
    paintTextNode(node, canvas, scrollOffset)
    return
  }
  paintElementNode(node, canvas, scrollOffset)
}

function paintTextNode(node: IRTextNode, canvas: TerminalCanvas, scrollOffset: number): void {
  if (!node.layout) return
  const { x, y, clipBox } = node.layout
  const style = resolvePaintStyle(node)
  const allLines: string[] = node.wrappedLines ?? [node.text]
  const lines = scrollOffset > 0 ? allLines.slice(scrollOffset) : allLines

  for (let i = 0; i < lines.length; i++) {
    canvas.drawText(x, y + i, lines[i], style, clipBox)
  }
}

function paintElementNode(node: IRElementNode, canvas: TerminalCanvas, parentScroll: number): void {
  if (!node.layout) return

  const style = resolvePaintStyle(node)
  const childScroll = parentScroll + (node.scrollTop ?? 0)

  if (node.tag === 'table') {
    const lines: string[] = node.renderedLines ?? []
    const { x, y, clipBox } = node.layout
    const visible = childScroll > 0 ? lines.slice(childScroll) : lines
    for (let i = 0; i < visible.length; i++) {
      canvas.drawText(x, y + i, visible[i], style, clipBox)
    }
    return
  }

  const { x, y, width, height, clipBox } = node.layout

  if (style.bg) {
    canvas.fillRect(x, y, width, height, { bg: style.bg }, clipBox)
  }

  paintBorder(node, canvas, style)

  if (node.tag === 'input') {
    const text = formatInputDisplay(node)
    canvas.drawText(x + 1, y, text, style, clipBox)
    return
  }

  for (const child of node.children) {
    paintNode(child, canvas, childScroll)
  }
}

function paintBorder(node: IRElementNode, canvas: TerminalCanvas, style: StyleTokens): void {
  const { x, y, width, height, clipBox } = node.layout!
  const box = node.box
  if (!box || (box.borderTop === 0 && box.borderLeft === 0 && box.borderRight === 0 && box.borderBottom === 0)) return

  const borderStyle = box.borderColor ? { ...style, fg: box.borderColor } : style
  const chars = getBorderChars(box.borderStyle)

  if (box.borderTop > 0) {
    canvas.setCell(x, y, chars.topLeft, borderStyle, clipBox)
    for (let i = 1; i < width - 1; i++) canvas.setCell(x + i, y, chars.horizontal, borderStyle, clipBox)
    canvas.setCell(x + width - 1, y, chars.topRight, borderStyle, clipBox)
  }

  if (box.borderBottom > 0) {
    canvas.setCell(x, y + height - 1, chars.bottomLeft, borderStyle, clipBox)
    for (let i = 1; i < width - 1; i++) canvas.setCell(x + i, y + height - 1, chars.horizontal, borderStyle, clipBox)
    canvas.setCell(x + width - 1, y + height - 1, chars.bottomRight, borderStyle, clipBox)
  }

  if (box.borderLeft > 0) {
    for (let i = 1; i < height - 1; i++) canvas.setCell(x, y + i, chars.vertical, borderStyle, clipBox)
  }

  if (box.borderRight > 0) {
    for (let i = 1; i < height - 1; i++) canvas.setCell(x + width - 1, y + i, chars.vertical, borderStyle, clipBox)
  }
}

interface BorderChars {
  horizontal: string; vertical: string
  topLeft: string; topRight: string; bottomLeft: string; bottomRight: string
}

function getBorderChars(borderStyle: string): BorderChars {
  switch (borderStyle) {
    case 'double':
      return { horizontal: '═', vertical: '║', topLeft: '╔', topRight: '╗', bottomLeft: '╚', bottomRight: '╝' }
    case 'round':
      return { horizontal: '─', vertical: '│', topLeft: '╭', topRight: '╮', bottomLeft: '╰', bottomRight: '╯' }
    default:
      return { horizontal: '─', vertical: '│', topLeft: '┌', topRight: '┐', bottomLeft: '└', bottomRight: '┘' }
  }
}
