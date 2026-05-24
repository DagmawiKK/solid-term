import { describe, it, expect } from 'vitest'
import { hitTest } from '../../src/solid/hit-test.js'
import type { IRElementNode } from '../../src/core/ir.js'

function makeInteractive(
  tag: string,
  x: number,
  y: number,
  width: number,
  height: number,
  children: IRElementNode[] = [],
  onClick?: () => void,
): IRElementNode {
  return {
    kind: 'element',
    tag,
    children,
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
    layout: { x, y, width, height, clipBox: undefined },
    onClick,
  }
}

describe('hitTest', () => {
  it('returns null for node without layout', () => {
    const node: IRElementNode = {
      kind: 'element', tag: 'div', children: [],
      style: {}, box: {
        paddingTop: 0, paddingRight: 0, paddingBottom: 0, paddingLeft: 0,
        borderTop: 0, borderRight: 0, borderBottom: 0, borderLeft: 0,
        borderStyle: 'single',
      },
      classList: [], flexClasses: [], widthClasses: [], scrollTop: 0,
    }
    expect(hitTest(node, 5, 5)).toBeNull()
  })

  it('returns null for point outside layout bounds', () => {
    const node = makeInteractive('div', 10, 10, 20, 20, [], () => {})
    expect(hitTest(node, 5, 5)).toBeNull()
    expect(hitTest(node, 50, 50)).toBeNull()
  })

  it('returns node when point is inside layout bounds and has onClick', () => {
    const node = makeInteractive('button', 0, 0, 10, 5, [], () => {})
    const result = hitTest(node, 5, 2)
    expect(result).not.toBeNull()
    expect(result!.tag).toBe('button')
  })

  it('returns null inside bounds but onClick is missing', () => {
    const node = makeInteractive('div', 0, 0, 10, 5, [], undefined)
    expect(hitTest(node, 5, 2)).toBeNull()
  })

  it('finds child before parent (depth-first, last child wins)', () => {
    const child = makeInteractive('button', 0, 0, 10, 5, [], () => {})
    const parent = makeInteractive('div', 0, 0, 20, 10, [child], () => {})
    const result = hitTest(parent, 5, 2)
    expect(result).not.toBeNull()
    expect(result!.tag).toBe('button')
  })

  it('returns parent if no interactive child at point', () => {
    const child = makeInteractive('span', 15, 0, 5, 5, [], undefined)
    const parent = makeInteractive('div', 0, 0, 20, 10, [child], () => {})
    // Point is inside parent but not inside child
    const result = hitTest(parent, 5, 2)
    expect(result).not.toBeNull()
    expect(result!.tag).toBe('div')
  })

  it('last child wins (painter order)', () => {
    const first = makeInteractive('first', 0, 0, 10, 10, [], () => {})
    const second = makeInteractive('second', 0, 0, 10, 10, [], () => {})
    const parent = makeInteractive('parent', 0, 0, 20, 20, [first, second], () => {})
    // Both children overlap; second (last) should be found first
    const result = hitTest(parent, 5, 5)
    expect(result!.tag).toBe('second')
  })

  it('returns null outside clipBox even if inside layout', () => {
    const child = makeInteractive('button', 0, 0, 100, 10, [], () => {})
    child.layout!.clipBox = { x: 0, y: 0, width: 50, height: 10 }
    const parent = makeInteractive('div', 0, 0, 100, 20, [child], undefined)
    // Point is inside child's layout but outside child's clipBox
    const result = hitTest(parent, 60, 5)
    expect(result).toBeNull()
  })

  it('handles deeply nested interactive elements', () => {
    const deep = makeInteractive('button', 5, 5, 10, 5, [], () => {})
    const mid = makeInteractive('div', 2, 2, 20, 20, [deep], undefined)
    const outer = makeInteractive('div', 0, 0, 30, 30, [mid], undefined)
    const result = hitTest(outer, 7, 7)
    expect(result).not.toBeNull()
    expect(result!.tag).toBe('button')
  })

  it('ignores text nodes and non-element children', () => {
    const child = makeInteractive('button', 0, 0, 10, 5, [], () => {})
    const parent: IRElementNode = {
      kind: 'element', tag: 'div',
      children: [
        { kind: 'text', text: 'non-element', style: {} },
        child,
      ] as any,
      style: {}, box: {
        paddingTop: 0, paddingRight: 0, paddingBottom: 0, paddingLeft: 0,
        borderTop: 0, borderRight: 0, borderBottom: 0, borderLeft: 0,
        borderStyle: 'single',
      },
      classList: [], flexClasses: [], widthClasses: [], scrollTop: 0,
      layout: { x: 0, y: 0, width: 20, height: 20 },
    }
    const result = hitTest(parent, 5, 2)
    // Should skip text node and find button
    expect(result!.tag).toBe('button')
  })

  it('returns null for empty node tree without handlers', () => {
    const node = makeInteractive('div', 0, 0, 80, 24, [], undefined)
    expect(hitTest(node, 40, 12)).toBeNull()
  })

  it('works at exact boundary edges', () => {
    const node = makeInteractive('button', 0, 0, 10, 5, [], () => {})
    // Inside at top-left corner
    expect(hitTest(node, 0, 0)).not.toBeNull()
    // Outside just past right edge
    expect(hitTest(node, 10, 0)).toBeNull()
    // Outside just past bottom
    expect(hitTest(node, 0, 5)).toBeNull()
  })
})
