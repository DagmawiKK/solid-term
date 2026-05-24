import { describe, it, expect } from 'vitest'
import { render } from '../../src/solid/index.js'
import { tailwind } from '../../src/resolvers/tailwind.js'

describe('render', () => {
  it('returns a RenderHandle with expected methods', () => {
    const app = render(() => null, { width: 80, height: 24 })
    expect(app).toBeDefined()
    expect(typeof app.flushFrame).toBe('function')
    expect(typeof app.scheduleRender).toBe('function')
    expect(typeof app.resize).toBe('function')
    expect(typeof app.unmount).toBe('function')
    expect(app.root).toBeDefined()
    expect(app.canvas).toBeDefined()
  })

  it('creates a root node with tag "root"', () => {
    const app = render(() => null, { width: 80, height: 24 })
    expect(app.root.tag).toBe('root')
    expect(app.root.kind).toBe('element')
  })

  it('returns null from flushFrame when no updates', () => {
    const app = render(() => null, { width: 80, height: 24 })
    expect(app.flushFrame()).toBeNull()
  })

  it('respects explicit width and height', () => {
    const app = render(() => null, { width: 40, height: 10 })
    expect(app.root.layout!.width).toBe(40)
    expect(app.root.layout!.height).toBe(10)
  })

  it('accepts classResolver option', () => {
    const app = render(() => null, {
      width: 80,
      height: 24,
      classResolver: tailwind(),
    })
    expect(app).toBeDefined()
  })

  it('accepts color depth option', () => {
    const app = render(() => null, {
      width: 80,
      height: 24,
      colors: 256,
    })
    expect(app).toBeDefined()
  })

  it('unmount does not throw', () => {
    const app = render(() => null, { width: 80, height: 24 })
    expect(() => app.unmount()).not.toThrow()
  })

  it('resize schedules render', () => {
    const app = render(() => null, { width: 80, height: 24 })
    app.resize(100, 30)
    app.flushFrame()
    expect(app.root.layout!.width).toBe(100)
    expect(app.canvas.width).toBe(100)
    expect(app.canvas.height).toBe(30)
  })
})

describe('render with components', () => {
  it('renders a simple component', () => {
    const app = render(() => 'hello', { width: 80, height: 24 })
    const frame = app.flushFrame()
    // With no classResolver, the text appears with default styles
    expect(typeof frame).toBe('string')
    expect(frame!.length).toBeGreaterThan(0)
  })

  it('renders a component with tailwind classes', () => {
    const app = render(
      () => ({
        kind: 'element',
        tag: 'div',
        children: [{ kind: 'text', text: 'hello', style: {} }],
        style: {},
        box: {
          paddingTop: 0, paddingRight: 0, paddingBottom: 0, paddingLeft: 0,
          borderTop: 0, borderRight: 0, borderBottom: 0, borderLeft: 0,
          borderStyle: 'single' as const,
        },
        classList: ['text-green-400', 'font-bold'],
        flexClasses: [],
        widthClasses: [],
        scrollTop: 0,
      }),
      { width: 80, height: 24, classResolver: tailwind() }
    )
    const frame = app.flushFrame()
    expect(frame).toBeDefined()
  })

  it('produces ANSI output starting with home', () => {
    const app = render(() => 'hello', { width: 80, height: 24 })
    const frame = app.flushFrame()
    expect(frame!.startsWith('\x1B[H')).toBe(true)
  })

  it('produces ANSI output ending with reset', () => {
    const app = render(() => 'hello', { width: 80, height: 24 })
    const frame = app.flushFrame()
    expect(frame!.endsWith('\x1B[0m')).toBe(true)
  })
})
