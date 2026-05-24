import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock sucrase before importing the module
vi.mock('sucrase', () => ({
  transform: vi.fn((code: string, opts: any) => ({
    code: code.replace(/<div[^>]*>/g, '/* div */').replace(/<\/div>/g, ''),
  })),
}))

describe('compileJSX', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('transforms JSX with Sucrase default config', async () => {
    const { compileJSX } = await import('../../src/stream/compiler.js')
    const source = 'function Widget() { return <div>hello</div> }'
    const result = await compileJSX(source)
    expect(typeof result).toBe('string')
    expect(result.length).toBeGreaterThan(0)
  })

  it('handles component with createSignal', async () => {
    const { compileJSX } = await import('../../src/stream/compiler.js')
    const source = `
      function Widget() {
        const [count, setCount] = createSignal(0)
        return <div>{count()}</div>
      }
    `
    const result = await compileJSX(source)
    expect(typeof result).toBe('string')
  })

  it('handles components with event handlers', async () => {
    const { compileJSX } = await import('../../src/stream/compiler.js')
    const source = `
      function Widget() {
        const [n, setN] = createSignal(0)
        return (
          <div class="flex gap-2">
            <button onClick={() => setN(c => c - 1)}>[-]</button>
            <span>{n()}</span>
            <button onClick={() => setN(c => c + 1)}>[+]</button>
          </div>
        )
      }
    `
    const result = await compileJSX(source)
    expect(typeof result).toBe('string')
  })

  it('handles empty function body', async () => {
    const { compileJSX } = await import('../../src/stream/compiler.js')
    const source = 'function Widget() { return <div/> }'
    const result = await compileJSX(source)
    expect(typeof result).toBe('string')
  })

  it('handles JSX with multiline content', async () => {
    const { compileJSX } = await import('../../src/stream/compiler.js')
    const source = `
      function Widget() {
        return (
          <div class="border p-2">
            <h1 class="text-lg font-bold">Title</h1>
            <p class="text-sm">Description text here</p>
          </div>
        )
      }
    `
    const result = await compileJSX(source)
    expect(typeof result).toBe('string')
  })
})
