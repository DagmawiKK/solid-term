import type { IRNode, IRElementNode, LayoutBox } from '../core/ir.js'
import type { TerminalCaps } from '../core/capabilities.js'
import { isTextNode, isElementNode, defaultComputedStyle } from '../core/ir.js'
import { measureMinWidth, wrapText } from './measure.js'
import { resolveFlex, allocateFlexWidths } from './flex.js'
import { layoutTable } from './table.js'

export interface LayoutContext {
  width: number
  caps: TerminalCaps
}

export function layout(root: IRElementNode, width: number, caps: TerminalCaps): void {
  const ctx: LayoutContext = { width, caps }
  layoutNode(root, { x: 0, y: 0, width, height: caps.height }, ctx)
}

function layoutNode(node: IRElementNode, parentBox: LayoutBox, ctx: LayoutContext): number {
  const cs = node.computed ?? defaultComputedStyle()

  const contentX = parentBox.x + cs.paddingLeft + cs.borderLeft
  const contentWidth = parentBox.width
    - cs.paddingLeft - cs.paddingRight
    - cs.borderLeft - cs.borderRight

  const flex = cs.display === 'flex'
    ? { active: true, direction: cs.flexDirection, gap: cs.gap, wrap: cs.flexWrap }
    : null
  const isTable = node.tag === 'table'

  let currentY = parentBox.y + cs.paddingTop + cs.borderTop
  let totalHeight = 0

  if (isTable) {
    const tableLines = layoutTable(node, contentWidth, ctx)
    node.layout = {
      x: parentBox.x,
      y: parentBox.y,
      width: parentBox.width,
      height: tableLines.height + cs.paddingTop + cs.paddingBottom + cs.borderTop + cs.borderBottom,
      clipBox: parentBox.clipBox,
    }
    node.renderedLines = tableLines.lines
    node.isDirty = true
    return node.layout.height
  }

  if (flex && flex.active && flex.direction === 'row') {
    const elementChildren = node.children.filter(isElementNode)
    if (flex.wrap) {
      totalHeight = layoutFlexRowWrap(
        node, elementChildren, parentBox, cs, contentX, contentWidth, currentY, flex.gap, ctx,
      )
    } else {
      const widths = allocateFlexWidths(
        elementChildren,
        contentWidth,
        flex.gap,
        child => measureMinWidth(child, ctx)
      )

      if (widths === null) {
        return layoutVertical(node, parentBox, cs, contentX, contentWidth, currentY, ctx)
      }

      let childX = contentX
      let maxChildHeight = 0
      elementChildren.forEach((child, i) => {
        const childHeight = layoutNode(child, {
          x: childX,
          y: currentY,
          width: widths[i],
          height: parentBox.height,
          clipBox: parentBox,
        }, ctx)
        childX += widths[i] + flex.gap
        maxChildHeight = Math.max(maxChildHeight, childHeight)
      })

      totalHeight = maxChildHeight + cs.paddingTop + cs.paddingBottom + cs.borderTop + cs.borderBottom
    }
  } else {
    totalHeight = layoutVertical(node, parentBox, cs, contentX, contentWidth, currentY, ctx)
  }

  node.layout = {
    x: parentBox.x,
    y: parentBox.y,
    width: parentBox.width,
    height: totalHeight,
    clipBox: parentBox.clipBox,
  }

  return totalHeight
}

function layoutFlexRowWrap(
  _node: IRElementNode,
  elementChildren: IRElementNode[],
  parentBox: LayoutBox,
  cs: ReturnType<typeof defaultComputedStyle>,
  contentX: number,
  contentWidth: number,
  startY: number,
  gap: number,
  ctx: LayoutContext,
): number {
  let rowX = contentX
  let rowY = startY
  let rowMaxHeight = 0
  let totalRowsHeight = 0

  for (const child of elementChildren) {
    const childWidth = Math.min(measureMinWidth(child, ctx), contentWidth)
    if (rowX > contentX && rowX + childWidth > contentX + contentWidth) {
      totalRowsHeight += rowMaxHeight + gap
      rowY = startY + totalRowsHeight
      rowX = contentX
      rowMaxHeight = 0
    }

    const childHeight = layoutNode(child, {
      x: rowX,
      y: rowY,
      width: childWidth,
      height: parentBox.height,
      clipBox: parentBox,
    }, ctx)

    rowX += childWidth + gap
    rowMaxHeight = Math.max(rowMaxHeight, childHeight)
  }

  totalRowsHeight += rowMaxHeight
  return totalRowsHeight + cs.paddingTop + cs.paddingBottom + cs.borderTop + cs.borderBottom
}

function layoutVertical(
  node: IRElementNode,
  parentBox: LayoutBox,
  cs: any,
  contentX: number,
  contentWidth: number,
  startY: number,
  ctx: LayoutContext,
): number {
  let currentY = startY
  let gap = 0
  const scrollTop = node.scrollTop ?? 0
  let skippedLines = 0

  if ((node.computed?.display ?? 'block') === 'flex' && (node.computed?.flexDirection ?? 'col') === 'col') {
    gap = node.computed?.gap ?? 0
  }

  const scrollClip: LayoutBox = {
    x: contentX,
    y: startY,
    width: contentWidth,
    height: Math.max(0, parentBox.y + parentBox.height - startY - cs.paddingBottom - cs.borderBottom),
    clipBox: parentBox.clipBox,
  }

  for (const child of node.children) {
    if (isTextNode(child)) {
      const lines = wrapText(child.text, contentWidth)
      if (skippedLines + lines.length <= scrollTop) {
        skippedLines += lines.length
        continue
      }
      const lineSkip = Math.max(0, scrollTop - skippedLines)
      skippedLines += lines.length
      const visibleLines = lines.slice(lineSkip)
      if (visibleLines.length === 0) continue

      child.layout = {
        x: contentX,
        y: currentY,
        width: contentWidth,
        height: visibleLines.length,
        clipBox: scrollClip,
      }
      child.wrappedLines = visibleLines
      child.isDirty = true
      currentY += visibleLines.length + gap
    } else if (isElementNode(child)) {
      const childHeight = layoutNode(child, {
        x: contentX,
        y: currentY,
        width: contentWidth,
        height: parentBox.height - (currentY - parentBox.y),
        clipBox: scrollClip,
      }, ctx)
      currentY += childHeight + gap
    }
  }

  const totalHeight = (currentY - startY)
    + cs.paddingBottom + cs.borderBottom

  return Math.max(totalHeight, 1)
}

export { measureMinWidth, wrapText } from './measure.js'
export { resolveFlex, allocateFlexWidths, extractWidthClasses, extractFlexClasses, splitResponsive } from './flex.js'
export { layoutTable } from './table.js'
export { parseBoxClasses } from './box.js'
