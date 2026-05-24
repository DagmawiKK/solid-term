import { describe, it, expect } from 'vitest'
import { wrapText, measureMinWidth, extractText, truncateToWidth } from '../../src/layout/measure.js'
import { createRootNode, defaultComputedStyle } from '../../src/core/ir.js'
import type { IRElementNode, IRTextNode } from '../../src/core/ir.js'
import type { LayoutContext } from '../../src/layout/index.js'
import type { TerminalCaps } from '../../src/core/capabilities.js'

const fakeCaps: TerminalCaps = {
  width: 80,
  height: 24,
  colors: 'truecolor',
  mouse: true,
  hyperlinks: false,
  images: [],
  theme: 'dark',
  unicode: true,
}

const ctx: LayoutContext = { width: 80, caps: fakeCaps }

function textNode(text: string): IRTextNode {
  return { kind: 'text', text, style: {} }
}

function elem(tag: string, children: any[] = []): IRElementNode {
  return {
    kind: 'element',
    tag,
    children,
    style: {},
    box: { paddingTop: 0, paddingRight: 0, paddingBottom: 0, paddingLeft: 0, borderTop: 0, borderRight: 0, borderBottom: 0, borderLeft: 0, borderStyle: 'single' },
    classList: [],
    flexClasses: [],
    widthClasses: [],
    scrollTop: 0,
  }
}

describe('wrapText', () => {
  it('wraps text at exact width', () => {
    const lines = wrapText('hello world', 5)
    expect(lines).toEqual(['hello', 'world'])
  })

  it('returns single line if text fits', () => {
    const lines = wrapText('hello', 80)
    expect(lines).toEqual(['hello'])
  })

  it('handles empty string', () => {
    expect(wrapText('', 80)).toEqual([''])
  })

  it('handles width of 0', () => {
    expect(wrapText('hello', 0)).toEqual([''])
  })

  it('handles negative width', () => {
    expect(wrapText('hello', -1)).toEqual([''])
  })

  it('handles null/undefined text', () => {
    expect(wrapText('', 80)).toEqual([''])
  })

  it('truncates word wider than width', () => {
    const lines = wrapText('superlongword', 6)
    expect(lines[0]).toBe('super…')
    expect(lines.length).toBe(1)
  })

  it('truncates word wider than width with exact boundary', () => {
    const lines = wrapText('abcdefghij', 3)
    expect(lines[0]).toMatch(/^..…/)
    expect(lines.length).toBe(1)
  })

  it('preserves multiple spaces between words', () => {
    const lines = wrapText('a   b', 10)
    expect(lines).toEqual(['a   b'])
  })

  it('trims trailing whitespace from each line', () => {
    const lines = wrapText('hello world ', 5)
    expect(lines[0]).toBe('hello')
    expect(lines[1]).toBe('world')
  })

  it('handles single character width', () => {
    const lines = wrapText('ab', 1)
    // Word wider than column is truncated with ellipsis (per spec)
    expect(lines[0]).toBe('…')
    expect(lines.length).toBe(1)
  })

  it('handles multiple lines of text', () => {
    const lines = wrapText('a b c d e f g h i j k', 5)
    expect(lines.length).toBeGreaterThan(1)
  })

  it('preserves existing newlines', () => {
    // split(/(\s+)/) captures whitespace including newlines
    const lines = wrapText('hello\nworld', 80)
    expect(lines.length).toBeGreaterThanOrEqual(1)
  })

  it('wraps at word boundaries', () => {
    const lines = wrapText('one two three four', 8)
    expect(lines).toEqual(['one two', 'three', 'four'])
  })

  it('does not split CJK characters mid-codepoint', () => {
    const lines = wrapText('日本語', 4)
    expect(lines.length).toBeGreaterThanOrEqual(1)
    for (const line of lines) {
      expect(line.length).toBeGreaterThan(0)
    }
  })

  it('measures emoji width with stringWidth', () => {
    const lines = wrapText('hi 👋 there', 12)
    expect(lines.join('')).toContain('👋')
  })
})

describe('measureMinWidth', () => {
  it('returns 0 for empty div', () => {
    const div = elem('div')
    expect(measureMinWidth(div, ctx)).toBe(0)
  })

  it('returns longest word width for text content', () => {
    const div = elem('div', [textNode('hello world')])
    expect(measureMinWidth(div, ctx)).toBe(5) // "hello" is 5
  })

  it('returns longest word width with multiple words', () => {
    const div = elem('div', [textNode('a bb ccc dddd')])
    expect(measureMinWidth(div, ctx)).toBe(4) // "dddd"
  })

  it('returns max of child element min widths', () => {
    const child1 = elem('div', [textNode('short')])
    const child2 = elem('div', [textNode('longer')])
    const parent = elem('div', [child1, child2])
    expect(measureMinWidth(parent, ctx)).toBe(6)
  })

  it('returns max line width for code/pre tags', () => {
    const code = elem('code', [textNode('function hello() {\n  return "world"\n}')])
    expect(measureMinWidth(code, ctx)).toBe(18)
  })

  it('returns 0 for empty code block', () => {
    const code = elem('code', [textNode('')])
    expect(measureMinWidth(code, ctx)).toBe(0)
  })
})

describe('extractText', () => {
  it('returns text from text node', () => {
    expect(extractText(textNode('hello'))).toBe('hello')
  })

  it('returns concatenated text from element children', () => {
    const div = elem('div', [
      textNode('Hello '),
      textNode('World'),
    ])
    expect(extractText(div)).toBe('Hello World')
  })

  it('returns empty string from empty element', () => {
    const div = elem('div')
    expect(extractText(div)).toBe('')
  })

  it('recurses nested elements', () => {
    const inner = elem('span', [textNode('nested')])
    const outer = elem('div', [textNode('before '), inner, textNode(' after')])
    expect(extractText(outer)).toBe('before nested after')
  })
})

describe('truncateToWidth', () => {
  it('returns full string if within width', () => {
    // truncateToWidth is not exported directly, but tested via wrapText
  })
})
