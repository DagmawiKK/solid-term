import { describe, it, expect } from 'vitest'
import { detectCaps } from '../../src/core/capabilities.js'
import type { ColorDepth } from '../../src/core/capabilities.js'

describe('detectCaps', () => {
  it('returns a TerminalCaps object', () => {
    const caps = detectCaps()
    expect(caps).toBeDefined()
    expect(typeof caps.width).toBe('number')
    expect(typeof caps.height).toBe('number')
    expect(typeof caps.mouse).toBe('boolean')
    expect(typeof caps.hyperlinks).toBe('boolean')
    expect(typeof caps.theme).toBe('string')
    expect(typeof caps.unicode).toBe('boolean')
    expect(Array.isArray(caps.images)).toBe(true)
  })

  it('has valid colors string', () => {
    const caps = detectCaps()
    expect(['none', 16, 256, 'truecolor']).toContain(caps.colors)
  })

  it('has valid theme', () => {
    const caps = detectCaps()
    expect(['dark', 'light']).toContain(caps.theme)
  })

  it('falls back to defaults when stdout is missing', () => {
    const caps = detectCaps()
    // Should still return reasonable defaults
    expect(caps.width).toBeGreaterThanOrEqual(80)
    expect(caps.height).toBeGreaterThanOrEqual(24)
  })
})
