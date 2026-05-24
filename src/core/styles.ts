import { type Color, type StyleTokens } from './ir.js'

export function parseInlineStyle(style: string | Record<string, string> | null | undefined): StyleTokens {
  if (!style) return {}

  if (typeof style === 'object') {
    return parseStyleObject(style as Record<string, string>)
  }

  const tokens: StyleTokens = {}
  for (const rule of style.split(';').map(s => s.trim()).filter(Boolean)) {
    const colonIdx = rule.indexOf(':')
    if (colonIdx === -1) continue
    const prop = rule.slice(0, colonIdx).trim().toLowerCase()
    const val = rule.slice(colonIdx + 1).trim().toLowerCase()
    applyStyleProp(tokens, prop, val)
  }
  return tokens
}

function parseStyleObject(obj: Record<string, string>): StyleTokens {
  const tokens: StyleTokens = {}
  for (const [prop, val] of Object.entries(obj)) {
    const kebab = prop.replace(/([A-Z])/g, '-$1').toLowerCase()
    applyStyleProp(tokens, kebab, String(val).toLowerCase())
  }
  return tokens
}

function applyStyleProp(tokens: StyleTokens, prop: string, val: string): void {
  switch (prop) {
    case 'color': {
      const fg = parseColorValue(val)
      if (fg) tokens.fg = fg
      break
    }
    case 'background-color':
    case 'background': {
      const bg = parseColorValue(val)
      if (bg) tokens.bg = bg
      break
    }
    case 'font-weight': {
      if (['bold', '700', '800', '900'].includes(val)) tokens.bold = true
      else if (['normal', '400', '300', '200', '100'].includes(val)) tokens.bold = false
      break
    }
    case 'font-style': {
      if (val === 'italic') tokens.italic = true
      else if (val === 'normal') tokens.italic = false
      break
    }
    case 'text-decoration': {
      if (val.includes('underline')) tokens.underline = true
      if (val.includes('line-through')) tokens.strikethrough = true
      if (val === 'none') { tokens.underline = false; tokens.strikethrough = false }
      break
    }
  }
}

const NAMED_COLORS = new Set([
  'red', 'blue', 'green', 'yellow', 'cyan', 'magenta', 'white', 'black',
  'gray', 'grey', 'orange', 'purple', 'pink', 'teal', 'lime', 'amber',
  'indigo', 'violet', 'rose', 'sky', 'emerald', 'slate', 'zinc',
  'neutral', 'stone', 'transparent',
])

export function parseColorValue(val: string): Color | undefined {
  const t = val.trim().toLowerCase() as string

  if (NAMED_COLORS.has(t)) {
    if (t === 'transparent') return undefined
    if (t === 'grey') return { named: 'gray' }
    return { named: t as 'gray' }
  }

  if (t.startsWith('#')) {
    const hex = t.length === 4
      ? '#' + t[1] + t[1] + t[2] + t[2] + t[3] + t[3]
      : t
    if (/^#[0-9a-f]{6}$/.test(hex)) return { hex }
    return undefined
  }

  const rgb = t.match(/^rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/)
  if (rgb) {
    return { rgb: [parseInt(rgb[1]), parseInt(rgb[2]), parseInt(rgb[3])] }
  }

  return undefined
}
