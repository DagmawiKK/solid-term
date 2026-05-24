import { describe, it, expect } from 'vitest'
import { tailwind } from '../../src/resolvers/tailwind.js'
import type { StyleTokens } from '../../src/core/ir.js'

describe('tailwind', () => {
  const resolver = tailwind()

  describe('text color classes', () => {
    it('resolves text-red-500', () => {
      const result = resolver(['text-red-500'], { width: 100, theme: 'dark' })
      expect(result.fg).toEqual({ hex: '#ef4444' })
    })

    it('resolves text-blue-500', () => {
      const result = resolver(['text-blue-500'], { width: 100, theme: 'dark' })
      expect(result.fg).toEqual({ hex: '#3b82f6' })
    })

    it('resolves text-green-400', () => {
      const result = resolver(['text-green-400'], { width: 100, theme: 'dark' })
      expect(result.fg).toEqual({ hex: '#4ade80' })
    })

    it('resolves text-white', () => {
      const result = resolver(['text-white'], { width: 100, theme: 'dark' })
      expect(result.fg).toEqual({ hex: '#ffffff' })
    })

    it('resolves text-black', () => {
      const result = resolver(['text-black'], { width: 100, theme: 'dark' })
      expect(result.fg).toEqual({ hex: '#000000' })
    })
  })

  describe('background color classes', () => {
    it('resolves bg-slate-800', () => {
      const result = resolver(['bg-slate-800'], { width: 100, theme: 'dark' })
      expect(result.bg).toEqual({ hex: '#1e293b' })
    })

    it('resolves bg-white', () => {
      const result = resolver(['bg-white'], { width: 100, theme: 'dark' })
      expect(result.bg).toEqual({ hex: '#ffffff' })
    })

    it('resolves bg-red-500', () => {
      const result = resolver(['bg-red-500'], { width: 100, theme: 'dark' })
      expect(result.bg).toEqual({ hex: '#ef4444' })
    })
  })

  describe('font weight classes', () => {
    it('resolves font-bold', () => {
      expect(resolver(['font-bold'], { width: 100, theme: 'dark' }).bold).toBe(true)
    })

    it('resolves font-semibold', () => {
      expect(resolver(['font-semibold'], { width: 100, theme: 'dark' }).bold).toBe(true)
    })

    it('resolves font-normal', () => {
      expect(resolver(['font-normal'], { width: 100, theme: 'dark' }).bold).toBe(false)
    })

    it('resolves font-thin to false', () => {
      expect(resolver(['font-thin'], { width: 100, theme: 'dark' }).bold).toBe(false)
    })

    it('resolves font-extrabold to true', () => {
      expect(resolver(['font-extrabold'], { width: 100, theme: 'dark' }).bold).toBe(true)
    })

    it('resolves font-black to true', () => {
      expect(resolver(['font-black'], { width: 100, theme: 'dark' }).bold).toBe(true)
    })
  })

  describe('font style classes', () => {
    it('resolves italic', () => {
      expect(resolver(['italic'], { width: 100, theme: 'dark' }).italic).toBe(true)
    })

    it('resolves not-italic', () => {
      expect(resolver(['not-italic'], { width: 100, theme: 'dark' }).italic).toBe(false)
    })
  })

  describe('text decoration classes', () => {
    it('resolves underline', () => {
      expect(resolver(['underline'], { width: 100, theme: 'dark' }).underline).toBe(true)
    })

    it('resolves no-underline', () => {
      expect(resolver(['no-underline'], { width: 100, theme: 'dark' }).underline).toBe(false)
    })

    it('resolves line-through', () => {
      expect(resolver(['line-through'], { width: 100, theme: 'dark' }).strikethrough).toBe(true)
    })

    it('resolves no-line-through', () => {
      expect(resolver(['no-line-through'], { width: 100, theme: 'dark' }).strikethrough).toBe(false)
    })
  })

  describe('last-wins cascade', () => {
    it('later class overrides earlier for same property', () => {
      const result = resolver(['text-red-500', 'text-blue-500'], { width: 100, theme: 'dark' })
      expect(result.fg).toEqual({ hex: '#3b82f6' })
    })

    it('font-bold then font-normal = not bold', () => {
      const result = resolver(['font-bold', 'font-normal'], { width: 100, theme: 'dark' })
      expect(result.bold).toBe(false)
    })

    it('italic then not-italic = not italic', () => {
      const result = resolver(['italic', 'not-italic'], { width: 100, theme: 'dark' })
      expect(result.italic).toBe(false)
    })
  })

  describe('responsive prefix handling', () => {
    it('applies class when width meets breakpoint', () => {
      const result = resolver(['md:text-red-500'], { width: 80, theme: 'dark' })
      expect(result.fg).toEqual({ hex: '#ef4444' })
    })

    it('skips class when width below breakpoint', () => {
      const result = resolver(['md:text-red-500'], { width: 60, theme: 'dark' })
      expect(result.fg).toBeUndefined()
    })

    it('respects lg breakpoint', () => {
      const below = resolver(['lg:text-red-500'], { width: 80, theme: 'dark' })
      const above = resolver(['lg:text-red-500'], { width: 100, theme: 'dark' })
      expect(below.fg).toBeUndefined()
      expect(above.fg).toEqual({ hex: '#ef4444' })
    })
  })

  describe('theme/dark prefix', () => {
    it('applies dark: classes in dark theme', () => {
      const result = resolver(['dark:text-white'], { width: 100, theme: 'dark' })
      expect(result.fg).toEqual({ hex: '#ffffff' })
    })

    it('skips dark: classes in light theme', () => {
      const result = resolver(['dark:text-white'], { width: 100, theme: 'light' })
      expect(result.fg).toBeUndefined()
    })

    it('resolves palette shades via pattern fallback', () => {
      const result = resolver(['text-cyan-500'], { width: 100, theme: 'dark' })
      expect(result.fg).toEqual({ hex: '#06b6d4' })
    })
  })

  describe('combined classes', () => {
    it('combines multiple different properties', () => {
      const result = resolver(
        ['text-green-400', 'font-bold', 'italic'],
        { width: 100, theme: 'dark' }
      )
      expect(result.fg).toEqual({ hex: '#4ade80' })
      expect(result.bold).toBe(true)
      expect(result.italic).toBe(true)
    })

    it('combines fg, bg, bold from separate classes', () => {
      const result = resolver(
        ['text-white', 'bg-slate-800', 'font-bold'],
        { width: 100, theme: 'dark' }
      )
      expect(result.fg).toEqual({ hex: '#ffffff' })
      expect(result.bg).toEqual({ hex: '#1e293b' })
      expect(result.bold).toBe(true)
    })
  })

  describe('unknown classes', () => {
    it('ignores unknown classes silently', () => {
      const result = resolver(['nonexistent'], { width: 100, theme: 'dark' })
      expect(result).toEqual({})
    })

    it('ignores non-color layout classes', () => {
      const result = resolver(['flex', 'p-4', 'gap-2'], { width: 100, theme: 'dark' })
      expect(result.fg).toBeUndefined()
      expect(result.bg).toBeUndefined()
    })
  })

  describe('empty input', () => {
    it('returns empty tokens for empty array', () => {
      expect(resolver([], { width: 100, theme: 'dark' })).toEqual({})
    })
  })
})
