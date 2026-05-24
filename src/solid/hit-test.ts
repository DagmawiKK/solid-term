import type { IRNode, IRElementNode } from '../core/ir.js'
import { isElementNode } from '../core/ir.js'

export function hitTest(node: IRElementNode, col: number, row: number): IRElementNode | null {
  if (!node.layout) return null

  const { x, y, width, height, clipBox } = node.layout

  if (col < x || col >= x + width || row < y || row >= y + height) return null

  if (clipBox) {
    const { x: cx, y: cy, width: cw, height: ch } = clipBox
    if (col < cx || col >= cx + cw || row < cy || row >= cy + ch) return null
  }

  for (let i = node.children.length - 1; i >= 0; i--) {
    const child = node.children[i]
    if (!isElementNode(child)) continue
    const hit = hitTest(child, col, row)
    if (hit) return hit
  }

  return node.onClick ? node : null
}
