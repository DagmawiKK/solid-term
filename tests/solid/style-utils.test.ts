import { describe, it, expect } from 'vitest'
import {
  resolvePaintStyle,
  syncBoxFromComputed,
  applyTableCellDataAttr,
} from '../../src/solid/style-utils.js'
import { defaultBoxModel, defaultComputedStyle } from '../../src/core/ir.js'
import type { IRElementNode } from '../../src/core/ir.js'

function elem(tag = 'motion'): IRElementNode {
  return {
    kind: 'element',
    tag,
    children: [],
    style: {},
    box: defaultBoxModel(),
    classList: [],
    flexClasses: [],
    widthClasses: [],
    scrollTop: 0,
  }
}

describe('resolvePaintStyle', () => {
  it('inherits fg from computed when style has no fg', () => {
    const node = elem()
    node.computed = { ...defaultComputedStyle(), fg: { hex: '#22c55e' } }
    expect(resolvePaintStyle(node).fg).toEqual({ hex: '#22c55e' })
  })

  it('inline style overrides computed', () => {
    const node = elem()
    node.computed = { ...defaultComputedStyle(), fg: { hex: '#22c55e' } }
    node.style = { fg: { hex: '#ef4444' } }
    expect(resolvePaintStyle(node).fg).toEqual({ hex: '#ef4444' })
  })
})

describe('syncBoxFromComputed', () => {
  it('copies border fields from computed to box', () => {
    const node = elem()
    node.computed = {
      ...defaultComputedStyle(),
      borderTop: 1,
      borderRight: 1,
      borderBottom: 1,
      borderLeft: 1,
      borderStyle: 'double',
    }
    syncBoxFromComputed(node)
    expect(node.box.borderTop).toBe(1)
    expect(node.box.borderStyle).toBe('double')
  })
})

describe('applyTableCellDataAttr', () => {
  it('maps data-priority to tableCell', () => {
    const th = elem('th')
    applyTableCellDataAttr(th, 'data-priority', '2')
    expect(th.tableCell?.priority).toBe(2)
  })

  it('maps data-align to tableCell', () => {
    const td = elem('td')
    applyTableCellDataAttr(td, 'data-align', 'right')
    expect(td.tableCell?.align).toBe('right')
  })
})
