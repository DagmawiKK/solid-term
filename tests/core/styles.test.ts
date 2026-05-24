import { describe, it, expect } from 'vitest'
import { parseInlineStyle, parseColorValue } from '../../src/core/styles.js'
import type { StyleTokens, Color } from '../../src/core/ir.js'

describe('parseColorValue', () => {
  describe('named colors', () => {
    it('returns named color for standard names', () => {
      expect(parseColorValue('red')).toEqual({ named: 'red' })
      expect(parseColorValue('blue')).toEqual({ named: 'blue' })
      expect(parseColorValue('green')).toEqual({ named: 'green' })
      expect(parseColorValue('yellow')).toEqual({ named: 'yellow' })
      expect(parseColorValue('cyan')).toEqual({ named: 'cyan' })
      expect(parseColorValue('magenta')).toEqual({ named: 'magenta' })
      expect(parseColorValue('white')).toEqual({ named: 'white' })
      expect(parseColorValue('black')).toEqual({ named: 'black' })
    })

    it('normalizes "grey" to "gray"', () => {
      const result = parseColorValue('grey')
      expect(result).toEqual({ named: 'gray' })
    })

    it('handles case-insensitive named colors', () => {
      expect(parseColorValue('RED')).toEqual({ named: 'red' })
      expect(parseColorValue('Blue')).toEqual({ named: 'blue' })
    })

    it('accepts all extended color names', () => {
      const extended = [
        'orange', 'purple', 'pink', 'teal', 'lime', 'amber',
        'indigo', 'violet', 'rose', 'sky', 'emerald', 'slate',
        'zinc', 'neutral', 'stone',
      ]
      for (const name of extended) {
        const result = parseColorValue(name)
        expect(result).toEqual({ named: name as Color['named'] })
      }
    })

    it('returns undefined for "transparent"', () => {
      expect(parseColorValue('transparent')).toBeUndefined()
    })
  })

  describe('hex colors', () => {
    it('parses 6-digit hex', () => {
      expect(parseColorValue('#ff0000')).toEqual({ hex: '#ff0000' })
      expect(parseColorValue('#00ff00')).toEqual({ hex: '#00ff00' })
      expect(parseColorValue('#0000ff')).toEqual({ hex: '#0000ff' })
    })

    it('expands 3-digit shorthand hex to 6-digit', () => {
      expect(parseColorValue('#f00')).toEqual({ hex: '#ff0000' })
      expect(parseColorValue('#0f0')).toEqual({ hex: '#00ff00' })
      expect(parseColorValue('#00f')).toEqual({ hex: '#0000ff' })
      expect(parseColorValue('#abc')).toEqual({ hex: '#aabbcc' })
    })

    it('returns undefined for invalid hex', () => {
      expect(parseColorValue('#zzz')).toBeUndefined()
      expect(parseColorValue('#12345')).toBeUndefined()
      expect(parseColorValue('#1234567')).toBeUndefined()
      expect(parseColorValue('ff0000')).toBeUndefined()
      expect(parseColorValue('#fff')).not.toBeUndefined()
    })

    it('handles lowercase hex conversion', () => {
      const result = parseColorValue('#FF0000')
      expect(result).toEqual({ hex: '#ff0000' })
    })
  })

  describe('RGB colors', () => {
    it('parses rgb() format', () => {
      expect(parseColorValue('rgb(255, 0, 0)')).toEqual({ rgb: [255, 0, 0] })
      expect(parseColorValue('rgb(0, 255, 0)')).toEqual({ rgb: [0, 255, 0] })
      expect(parseColorValue('rgb(0, 0, 255)')).toEqual({ rgb: [0, 0, 255] })
    })

    it('handles no spaces in rgb', () => {
      expect(parseColorValue('rgb(255,0,0)')).toEqual({ rgb: [255, 0, 0] })
    })

    it('handles extra whitespace in rgb', () => {
      expect(parseColorValue('rgb( 100 , 200 , 50 )')).toEqual({ rgb: [100, 200, 50] })
    })

    it('returns undefined for malformed rgb', () => {
      expect(parseColorValue('rgb(300, 0, 0)')).toBeDefined()
      expect(parseColorValue('rgb(a, b, c)')).toBeUndefined()
      expect(parseColorValue('rgba(255,0,0,0.5)')).toBeUndefined()
    })
  })

  describe('unknown values', () => {
    it('returns undefined for unknown strings', () => {
      expect(parseColorValue('not-a-color')).toBeUndefined()
      expect(parseColorValue('')).toBeUndefined()
      expect(parseColorValue('  ')).toBeUndefined()
    })

    it('returns undefined for nonsense values', () => {
      expect(parseColorValue('undefined')).toBeUndefined()
      expect(parseColorValue('null')).toBeUndefined()
      expect(parseColorValue('inherit')).toBeUndefined()
      expect(parseColorValue('initial')).toBeUndefined()
    })

    it('trims whitespace before parsing', () => {
      expect(parseColorValue('  red  ')).toEqual({ named: 'red' })
      expect(parseColorValue('  #ff0000  ')).toEqual({ hex: '#ff0000' })
    })
  })
})

describe('parseInlineStyle', () => {
  describe('string form', () => {
    it('parses color property', () => {
      const result = parseInlineStyle('color: red')
      expect(result.fg).toEqual({ named: 'red' })
    })

    it('parses background-color', () => {
      const result = parseInlineStyle('background-color: blue')
      expect(result.bg).toEqual({ named: 'blue' })
    })

    it('parses background shorthand', () => {
      const result = parseInlineStyle('background: #ff0000')
      expect(result.bg).toEqual({ hex: '#ff0000' })
    })

    it('parses font-weight: bold', () => {
      const result = parseInlineStyle('font-weight: bold')
      expect(result.bold).toBe(true)
    })

    it('parses font-weight numeric values', () => {
      expect(parseInlineStyle('font-weight: 700').bold).toBe(true)
      expect(parseInlineStyle('font-weight: 800').bold).toBe(true)
      expect(parseInlineStyle('font-weight: 900').bold).toBe(true)
      expect(parseInlineStyle('font-weight: 400').bold).toBe(false)
      expect(parseInlineStyle('font-weight: normal').bold).toBe(false)
    })

    it('parses font-style: italic', () => {
      const result = parseInlineStyle('font-style: italic')
      expect(result.italic).toBe(true)
    })

    it('parses font-style: normal to unset italic', () => {
      const result = parseInlineStyle('font-style: normal')
      expect(result.italic).toBe(false)
    })

    it('parses text-decoration underline', () => {
      const result = parseInlineStyle('text-decoration: underline')
      expect(result.underline).toBe(true)
    })

    it('parses text-decoration line-through', () => {
      const result = parseInlineStyle('text-decoration: line-through')
      expect(result.strikethrough).toBe(true)
    })

    it('parses text-decoration: none to unset both', () => {
      const result = parseInlineStyle('text-decoration: none')
      expect(result.underline).toBe(false)
      expect(result.strikethrough).toBe(false)
    })

    it('handles multiple rules in one string', () => {
      const result = parseInlineStyle('color: red; font-weight: bold; font-style: italic')
      expect(result.fg).toEqual({ named: 'red' })
      expect(result.bold).toBe(true)
      expect(result.italic).toBe(true)
    })

    it('handles trailing semicolon', () => {
      const result = parseInlineStyle('color: red;')
      expect(result.fg).toEqual({ named: 'red' })
    })

    it('handles empty string', () => {
      const result = parseInlineStyle('')
      expect(result).toEqual({})
    })

    it('handles malformed rules gracefully', () => {
      const result = parseInlineStyle('color:red;nocolon;font-weight:bold')
      expect(result.fg).toEqual({ named: 'red' })
      expect(result.bold).toBe(true)
    })
  })

  describe('object form', () => {
    it('parses camelCase color property', () => {
      const result = parseInlineStyle({ color: 'red' })
      expect(result.fg).toEqual({ named: 'red' })
    })

    it('parses camelCase backgroundColor', () => {
      const result = parseInlineStyle({ backgroundColor: 'blue' })
      expect(result.bg).toEqual({ named: 'blue' })
    })

    it('parses fontWeight', () => {
      const result = parseInlineStyle({ fontWeight: 'bold' })
      expect(result.bold).toBe(true)
    })

    it('parses fontStyle', () => {
      const result = parseInlineStyle({ fontStyle: 'italic' })
      expect(result.italic).toBe(true)
    })

    it('parses textDecoration', () => {
      const result = parseInlineStyle({ textDecoration: 'underline' })
      expect(result.underline).toBe(true)
    })

    it('handles multiple properties in object form', () => {
      const result = parseInlineStyle({
        color: 'red',
        fontWeight: 'bold',
        fontStyle: 'italic',
      })
      expect(result.fg).toEqual({ named: 'red' })
      expect(result.bold).toBe(true)
      expect(result.italic).toBe(true)
    })

    it('converts numeric values to string before processing', () => {
      const result = parseInlineStyle({ fontWeight: '700' } as any)
      expect(result.bold).toBe(true)
    })

    it('ignores unknown object keys', () => {
      const result = parseInlineStyle({ display: 'flex', color: 'green' } as any)
      expect(result.fg).toEqual({ named: 'green' })
      expect((result as any).display).toBeUndefined()
    })
  })

  describe('edge cases', () => {
    it('returns empty object for null', () => {
      expect(parseInlineStyle(null)).toEqual({})
    })

    it('returns empty object for undefined', () => {
      expect(parseInlineStyle(undefined)).toEqual({})
    })

    it('returns empty object for empty object', () => {
      expect(parseInlineStyle({})).toEqual({})
    })

    it('ignores whitespace-only rules', () => {
      const result = parseInlineStyle('color: red;   ; font-weight: bold')
      expect(result.fg).toEqual({ named: 'red' })
      expect(result.bold).toBe(true)
    })

    it('last value wins for duplicate properties', () => {
      const result = parseInlineStyle('color: red; color: blue')
      expect(result.fg).toEqual({ named: 'blue' })
    })

    it('lowercases property names', () => {
      const result = parseInlineStyle('COLOR: red')
      expect(result.fg).toEqual({ named: 'red' })
    })

    it('lowercases property values', () => {
      const result = parseInlineStyle('color: RED')
      expect(result.fg).toEqual({ named: 'red' })
    })
  })

  describe('combined inline style tokens', () => {
    it('produces complete StyleTokens object', () => {
      const result = parseInlineStyle(
        'color: #ef4444; background-color: #1e293b; font-weight: bold; text-decoration: underline'
      )
      const expected: StyleTokens = {
        fg: { hex: '#ef4444' },
        bg: { hex: '#1e293b' },
        bold: true,
        underline: true,
      }
      expect(result).toEqual(expected)
    })

    it('resets underline when none', () => {
      const result = parseInlineStyle('text-decoration: underline')
      expect(result.underline).toBe(true)
      const result2 = parseInlineStyle('text-decoration: none')
      expect(result2.underline).toBe(false)
    })

    it('resets strikethrough when none', () => {
      const result = parseInlineStyle('text-decoration: line-through')
      expect(result.strikethrough).toBe(true)
      const result2 = parseInlineStyle('text-decoration: none')
      expect(result2.strikethrough).toBe(false)
    })
  })
})
