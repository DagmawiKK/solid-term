import { describe, it, expect } from 'vitest'
import {
  createRootNode,
  isTextNode,
  isElementNode,
  defaultComputedStyle,
  defaultBoxModel,
} from '../../src/core/ir.js'
import type { IRNode, IRTextNode, IRElementNode, Color, StyleTokens, ComputedStyle, BoxModel, LayoutBox, TableCellMeta } from '../../src/core/ir.js'

describe('IR Type System', () => {
  describe('createRootNode', () => {
    it('creates an element node with tag "root"', () => {
      const root = createRootNode()
      expect(root.kind).toBe('element')
      expect(root.tag).toBe('root')
    })

    it('has empty children array', () => {
      const root = createRootNode()
      expect(root.children).toEqual([])
    })

    it('has empty style tokens', () => {
      const root = createRootNode()
      expect(root.style).toEqual({})
    })

    it('has default box model', () => {
      const root = createRootNode()
      expect(root.box).toEqual(defaultBoxModel())
    })

    it('has default computed style', () => {
      const root = createRootNode()
      expect(root.computed).toEqual(defaultComputedStyle())
    })

    it('has empty class arrays', () => {
      const root = createRootNode()
      expect(root.classList).toEqual([])
      expect(root.flexClasses).toEqual([])
      expect(root.widthClasses).toEqual([])
    })

    it('has scrollTop of 0', () => {
      const root = createRootNode()
      expect(root.scrollTop).toBe(0)
    })

    it('has no parent, layout, tableCell, onClick, onKeyPress', () => {
      const root = createRootNode()
      expect(root.parent).toBeUndefined()
      expect(root.layout).toBeUndefined()
      expect(root.tableCell).toBeUndefined()
      expect(root.onClick).toBeUndefined()
      expect(root.onKeyPress).toBeUndefined()
    })
  })

  describe('type guards', () => {
    it('isTextNode returns true for text node', () => {
      const node: IRTextNode = {
        kind: 'text',
        text: 'hello',
        style: {},
      }
      expect(isTextNode(node)).toBe(true)
      expect(isElementNode(node)).toBe(false)
    })

    it('isElementNode returns true for element node', () => {
      const node: IRElementNode = {
        kind: 'element',
        tag: 'div',
        children: [],
        style: {},
        box: defaultBoxModel(),
        classList: [],
        flexClasses: [],
        widthClasses: [],
        scrollTop: 0,
      }
      expect(isElementNode(node)).toBe(true)
      expect(isTextNode(node)).toBe(false)
    })

    it('isTextNode returns false on element', () => {
      const root = createRootNode()
      expect(isTextNode(root)).toBe(false)
    })

    it('discriminated union narrows correctly with type guards', () => {
      const nodes: IRNode[] = [
        { kind: 'text', text: 'a', style: {} },
        { kind: 'text', text: 'b', style: {} },
      ]

      for (const n of nodes) {
        if (isTextNode(n)) {
          expect(typeof n.text).toBe('string')
          // @ts-expect-error - text nodes should not have tag
          expect((n as any).tag).toBeUndefined()
        }
      }
    })
  })

  describe('IRTextNode', () => {
    it('can hold computed style', () => {
      const node: IRTextNode = {
        kind: 'text',
        text: 'styled text',
        style: { bold: true },
        computed: { ...defaultComputedStyle(), bold: true },
      }
      expect(node.computed!.bold).toBe(true)
    })

    it('can hold layout box', () => {
      const node: IRTextNode = {
        kind: 'text',
        text: 'hello',
        style: {},
        layout: { x: 0, y: 0, width: 40, height: 1 },
      }
      expect(node.layout!.width).toBe(40)
    })

    it('can hold wrapped lines', () => {
      const node: IRTextNode = {
        kind: 'text',
        text: 'hello world this is a test',
        style: {},
        wrappedLines: ['hello', 'world', 'this is a test'],
      }
      expect(node.wrappedLines!.length).toBe(3)
    })

    it('can be dirty', () => {
      const node: IRTextNode = {
        kind: 'text',
        text: 'x',
        style: {},
        isDirty: true,
      }
      expect(node.isDirty).toBe(true)
    })

    it('can reference parent element', () => {
      const parent: IRElementNode = {
        kind: 'element',
        tag: 'div',
        children: [],
        style: {},
        box: defaultBoxModel(),
        classList: [],
        flexClasses: [],
        widthClasses: [],
        scrollTop: 0,
      }
      const child: IRTextNode = {
        kind: 'text',
        text: 'child',
        style: {},
        parent,
      }
      expect(child.parent!.tag).toBe('div')
    })
  })

  describe('IRElementNode', () => {
    it('stores children in order', () => {
      const parent = createRootNode()
      const c1: IRTextNode = { kind: 'text', text: 'first', style: {} }
      const c2: IRTextNode = { kind: 'text', text: 'second', style: {} }
      parent.children = [c1, c2]
      expect(parent.children.length).toBe(2)
      expect((parent.children[0] as IRTextNode).text).toBe('first')
    })

    it('handles table cell metadata', () => {
      const node: IRElementNode = {
        kind: 'element',
        tag: 'td',
        children: [],
        style: {},
        box: defaultBoxModel(),
        classList: [],
        flexClasses: [],
        widthClasses: [],
        scrollTop: 0,
        tableCell: { priority: 1, align: 'right', colSpan: 1 },
      }
      expect(node.tableCell!.priority).toBe(1)
      expect(node.tableCell!.align).toBe('right')
      expect(node.tableCell!.colSpan).toBe(1)
    })

    it('handles all table cell priority levels', () => {
      const p1: TableCellMeta = { priority: 1, align: 'left', colSpan: 1 }
      const p2: TableCellMeta = { priority: 2, align: 'center', colSpan: 1 }
      const p3: TableCellMeta = { priority: 3, align: 'right', colSpan: 1 }
      expect(p1.priority).toBe(1)
      expect(p2.priority).toBe(2)
      expect(p3.priority).toBe(3)
    })

    it('stores event handlers', () => {
      const node = createRootNode()
      const onClick = () => {}
      const onKeyPress = (k: string) => {}
      node.onClick = onClick
      node.onKeyPress = onKeyPress
      expect(node.onClick).toBe(onClick)
      expect(node.onKeyPress).toBe(onKeyPress)
    })

    it('handles renderedLines for tables', () => {
      const node: IRElementNode = {
        kind: 'element',
        tag: 'table',
        children: [],
        style: {},
        box: defaultBoxModel(),
        classList: [],
        flexClasses: [],
        widthClasses: [],
        scrollTop: 0,
        renderedLines: ['┌───┬───┐', '│ a │ b │', '└───┴───┘'],
      }
      expect(node.renderedLines!.length).toBe(3)
    })

    it('overwrites focus state', () => {
      const node = createRootNode()
      expect(node.focused).toBeUndefined()
      node.focused = true
      expect(node.focused).toBe(true)
    })
  })

  describe('defaultComputedStyle', () => {
    it('returns expected default values', () => {
      const cs = defaultComputedStyle()
      expect(cs.bold).toBe(false)
      expect(cs.italic).toBe(false)
      expect(cs.underline).toBe(false)
      expect(cs.strikethrough).toBe(false)
      expect(cs.paddingTop).toBe(0)
      expect(cs.paddingRight).toBe(0)
      expect(cs.paddingBottom).toBe(0)
      expect(cs.paddingLeft).toBe(0)
      expect(cs.borderTop).toBe(0)
      expect(cs.borderRight).toBe(0)
      expect(cs.borderBottom).toBe(0)
      expect(cs.borderLeft).toBe(0)
      expect(cs.borderStyle).toBe('single')
      expect(cs.display).toBe('block')
      expect(cs.flexDirection).toBe('col')
      expect(cs.flexWrap).toBe(false)
      expect(cs.gap).toBe(0)
      expect(cs.width).toEqual({ kind: 'auto' })
    })

    it('returns a new object each call (no shared mutable state)', () => {
      const a = defaultComputedStyle()
      const b = defaultComputedStyle()
      a.bold = true
      expect(b.bold).toBe(false)
    })
  })

  describe('defaultBoxModel', () => {
    it('returns expected default values', () => {
      const bm = defaultBoxModel()
      expect(bm.paddingTop).toBe(0)
      expect(bm.paddingRight).toBe(0)
      expect(bm.paddingBottom).toBe(0)
      expect(bm.paddingLeft).toBe(0)
      expect(bm.borderTop).toBe(0)
      expect(bm.borderRight).toBe(0)
      expect(bm.borderBottom).toBe(0)
      expect(bm.borderLeft).toBe(0)
      expect(bm.borderStyle).toBe('single')
      expect(bm.borderColor).toBeUndefined()
    })

    it('allows setting borderColor', () => {
      const bm = defaultBoxModel()
      bm.borderColor = { hex: '#ef4444' }
      expect(bm.borderColor).toEqual({ hex: '#ef4444' })
    })
  })

  describe('Color types', () => {
    it('accepts named color', () => {
      const c: Color = { named: 'red' }
      expect(c.named).toBe('red')
    })

    it('accepts hex color', () => {
      const c: Color = { hex: '#ef4444' }
      expect(c.hex).toBe('#ef4444')
    })

    it('accepts RGB color', () => {
      const c: Color = { rgb: [239, 68, 68] }
      expect(c.rgb).toEqual([239, 68, 68])
    })

    it('allows all named color variants', () => {
      const names: Color['named'][] = [
        'red', 'blue', 'green', 'yellow', 'cyan', 'magenta',
        'white', 'black', 'gray', 'orange', 'purple', 'pink',
        'teal', 'lime', 'amber', 'indigo', 'violet', 'rose',
        'sky', 'emerald', 'slate', 'zinc', 'neutral', 'stone',
      ]
      for (const n of names) {
        const c: Color = { named: n }
        expect(c.named).toBe(n)
      }
    })
  })

  describe('LayoutBox', () => {
    it('holds position and dimensions', () => {
      const box: LayoutBox = { x: 5, y: 3, width: 40, height: 10 }
      expect(box.x).toBe(5)
      expect(box.y).toBe(3)
      expect(box.width).toBe(40)
      expect(box.height).toBe(10)
    })

    it('optionally has clipBox', () => {
      const parentBox: LayoutBox = { x: 0, y: 0, width: 80, height: 24 }
      const childBox: LayoutBox = { x: 5, y: 5, width: 20, height: 10, clipBox: parentBox }
      expect(childBox.clipBox).toBeDefined()
      expect(childBox.clipBox!.width).toBe(80)
    })

    it('child clipBox equals parent box', () => {
      const parent: LayoutBox = { x: 2, y: 2, width: 50, height: 20 }
      const child: LayoutBox = { x: 5, y: 5, width: 10, height: 5, clipBox: parent }
      expect(child.clipBox!.x).toBe(2)
      expect(child.clipBox!.y).toBe(2)
      expect(child.clipBox!.width).toBe(50)
      expect(child.clipBox!.height).toBe(20)
    })
  })

  describe('IRNode union narrowing', () => {
    it('discriminates on kind field', () => {
      const textNode: IRNode = { kind: 'text', text: 'hi', style: {} }
      const elemNode: IRNode = createRootNode()

      expect(textNode.kind).toBe('text')
      expect(elemNode.kind).toBe('element')
    })

    it('element node has children, text node does not', () => {
      const e = createRootNode()
      expect(Array.isArray(e.children)).toBe(true)

      const t: IRTextNode = { kind: 'text', text: '', style: {} }
      expect((t as any).children).toBeUndefined()
    })
  })
})
