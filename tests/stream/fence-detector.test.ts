import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { FenceDetector } from '../../src/stream/fence-detector.js'
import type { WidgetMeta } from '../../src/stream/fence-detector.js'

describe('FenceDetector', () => {
  let proseChunks: string[]
  let widgets: Array<{ source: string; meta: WidgetMeta }>
  let detector: FenceDetector

  beforeEach(() => {
    proseChunks = []
    widgets = []
    detector = new FenceDetector({
      onProse: (chunk: string) => { proseChunks.push(chunk) },
      onWidget: (source: string, meta: WidgetMeta) => { widgets.push({ source, meta }) },
    })
  })

  describe('prose passthrough', () => {
    it('passes plain text through as prose', () => {
      detector.write('Hello world')
      detector.flush()
      expect(proseChunks).toContain('Hello world')
    })

    it('passes multiple prose chunks through', () => {
      detector.write('First paragraph. ')
      detector.write('Second paragraph.')
      detector.flush()
      expect(proseChunks.length).toBeGreaterThanOrEqual(1)
      const combined = proseChunks.join('')
      expect(combined).toContain('First paragraph')
      expect(combined).toContain('Second paragraph')
    })
  })

  describe('fence detection', () => {
    it('detects a complete html-term fence', () => {
      detector.write('```html-term height=4\nfunction Widget() {}\n```')
      detector.flush()
      expect(widgets).toHaveLength(1)
    })

    it('extracts source code from within fence', () => {
      const source = 'function Widget() {\n  const [c, setC] = createSignal(0)\n  return <div>{c()}</div>\n}'
      detector.write(`\`\`\`html-term height=4\n${source}\n\`\`\``)
      detector.flush()
      expect(widgets[0].source).toContain('function Widget()')
      expect(widgets[0].source).toContain('createSignal')
    })

    it('parses height from fence metadata', () => {
      detector.write('```html-term height=12\nfunction Widget() {}\n```')
      detector.flush()
      expect(widgets[0].meta.height).toBe(12)
    })

    it('defaults height to auto when not specified', () => {
      detector.write('```html-term\nfunction Widget() {}\n```')
      detector.flush()
      expect(widgets[0].meta.height).toBe('auto')
    })

    it('parses height=auto explicitly', () => {
      detector.write('```html-term height=auto\nfunction Widget() {}\n```')
      detector.flush()
      expect(widgets[0].meta.height).toBe('auto')
    })

    it('parses title from metadata', () => {
      detector.write('```html-term height=4 title="Counter"\nfunction Widget() {}\n```')
      detector.flush()
      expect(widgets[0].meta.title).toBe('Counter')
    })

    it('clamps height to minimum 3', () => {
      detector.write('```html-term height=1\nfunction Widget() {}\n```')
      detector.flush()
      expect(widgets[0].meta.height).toBe(3)
    })

    it('clamps height to maximum 50', () => {
      detector.write('```html-term height=999\nfunction Widget() {}\n```')
      detector.flush()
      expect(widgets[0].meta.height).toBe(50)
    })

    it('defaults non-numeric height to auto', () => {
      detector.write('```html-term height=abc\nfunction Widget() {}\n```')
      detector.flush()
      expect(widgets[0].meta.height).toBe('auto')
    })
  })

  describe('prose before and after fence', () => {
    it('delivers prose before fence as separate chunk', () => {
      detector.write('Some text before.\n```html-term height=4\nfunction Widget() {}\n```')
      detector.flush()
      expect(proseChunks.some(c => c.includes('Some text before'))).toBe(true)
    })

    it('delivers prose after fence', () => {
      detector.write('```html-term height=4\nfunction Widget() {}\n```\nSome text after.')
      detector.flush()
      // After fence, since the prose mode is active again, the remaining buffer gets flushed
      expect(proseChunks.length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('chunk boundary handling', () => {
    it('detects fence when opening split across chunks', () => {
      detector.write('Some prose.\n```')
      detector.write('html-term height=4\nfunction Widget() {}\n```')
      detector.flush()
      expect(widgets).toHaveLength(1)
    })

    it('handles closing fence split across chunks', () => {
      detector.write('```html-term height=4\nfunction Widget() {}\n`')
      detector.write('``')
      detector.flush()
      expect(widgets).toHaveLength(1)
    })

    it('handles metadata line split across chunks', () => {
      detector.write('```html-term height')
      detector.write('=4\nfunction Widget() {}\n```')
      detector.flush()
      expect(widgets).toHaveLength(1)
      expect(widgets[0].meta.height).toBe(4)
    })

    it('handles empty fence content', () => {
      detector.write('```html-term height=4\n```')
      detector.flush()
      expect(widgets).toHaveLength(1)
      expect(widgets[0].source).toBe('')
    })
  })

  describe('multiple fences', () => {
    it('handles two consecutive fences', () => {
      detector.write('```html-term height=4\nfunction A() {}\n```\n```html-term height=6\nfunction B() {}\n```')
      detector.flush()
      expect(widgets).toHaveLength(2)
      expect(widgets[0].meta.height).toBe(4)
      expect(widgets[1].meta.height).toBe(6)
    })

    it('delivers interspersed prose between fences', () => {
      detector.write('First.\n```html-term height=2\nfunction A() {}\n```\nIn between.\n```html-term height=2\nfunction B() {}\n```\nLast.')
      detector.flush()
      expect(widgets).toHaveLength(2)
      expect(proseChunks.length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('partial / unclosed fences', () => {
    it('buffers unclosed fence without emitting', () => {
      detector.write('```html-term height=4\nfunction Widget() {\n  const [x] = createSignal(0)')
      detector.flush()
      // Unclosed: no widget should be emitted
      expect(widgets).toHaveLength(0)
    })

    it('flushes remaining prose on end of stream', () => {
      detector.write('Some text at the end')
      detector.flush()
      expect(proseChunks.join('')).toContain('Some text at the end')
    })

    it('does not emit partial fence opening as prose', () => {
      detector.write('Some text ```html-term height=4\nincomplete')
      detector.flush()
      // The ```html-term should not cause the following "incomplete" to be treated as prose
      // without the closing fence, the widgetBuffer holds the source
      expect(widgets).toHaveLength(0)
    })
  })

  describe('edge cases', () => {
    it('handles empty write', () => {
      detector.write('')
      detector.flush()
      expect(proseChunks.length).toBe(0)
      expect(widgets.length).toBe(0)
    })

    it('handles short prose without fence markers', () => {
      detector.write('hi')
      detector.flush()
      expect(proseChunks.some(c => c.includes('hi'))).toBe(true)
    })

    it('handles fence immediately at start of stream', () => {
      detector.write('```html-term height=4\nfunction Widget() { return <div/> }\n```')
      detector.flush()
      expect(widgets).toHaveLength(1)
    })

    it('handles backtick flood (many code fences)', () => {
      const input = Array.from({ length: 5 }, (_, i) =>
        `\`\`\`html-term height=2\nfunction W${i}() { return <div/> }\n\`\`\``
      ).join('\n')
      detector.write(input)
      detector.flush()
      expect(widgets).toHaveLength(5)
    })
  })
})
