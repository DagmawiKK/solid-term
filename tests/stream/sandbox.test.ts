import { describe, it, expect } from 'vitest'
import { runInSandbox } from '../../src/stream/sandbox.js'

describe('runInSandbox', () => {
  it('returns Widget function from compiled source', () => {
    const source = `
      function Widget() {
        return { tag: 'div' }
      }
    `
    const factory = runInSandbox(source)
    expect(typeof factory).toBe('function')
    expect(factory()).toEqual({ tag: 'div' })
  })

  it('throws when no Widget/App/Component is defined', () => {
    expect(() => runInSandbox('const x = 1')).toThrow(/Widget, App, or Component/)
  })
})
