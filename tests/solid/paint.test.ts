import { describe, it, expect } from 'vitest'
import { render } from '../../src/solid/index.js'
import { tailwind } from '../../src/resolvers/tailwind.js'
import { defaultBoxModel } from '../../src/core/ir.js'

describe('paint with computed styles', () => {
  it('paints inherited tailwind text color on child text', () => {
    const app = render(
      () => ({
        kind: 'element',
        tag: 'div',
        children: [{ kind: 'text', text: 'hi', style: {} }],
        style: {},
        box: defaultBoxModel(),
        classList: ['text-green-400'],
        flexClasses: [],
        widthClasses: [],
        scrollTop: 0,
      }),
      { width: 20, height: 5, classResolver: tailwind(), colors: 'truecolor' },
    )
    const frame = app.flushFrame()!
    expect(frame).toMatch(/38;2;74;222;128|32m/)
  })

  it('paints border from border class', () => {
    const app = render(
      () => ({
        kind: 'element',
        tag: 'div',
        children: [{ kind: 'text', text: 'X', style: {} }],
        style: {},
        box: defaultBoxModel(),
        classList: ['border', 'p-1'],
        flexClasses: [],
        widthClasses: [],
        scrollTop: 0,
      }),
      { width: 10, height: 5, classResolver: tailwind() },
    )
    const frame = app.flushFrame()!
    expect(frame).toMatch(/┌|─/)
  })
})
