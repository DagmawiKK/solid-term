export type ColorDepth = 'none' | 16 | 256 | 'truecolor'
export type ImageProtocol = 'kitty' | 'sixel' | 'iterm2'

export interface TerminalCaps {
  width: number
  height: number
  colors: ColorDepth
  mouse: boolean
  hyperlinks: boolean
  images: ImageProtocol[]
  theme: 'dark' | 'light'
  unicode: boolean
}

export function detectCaps(): TerminalCaps {
  return {
    width: process.stdout.columns ?? 80,
    height: process.stdout.rows ?? 24,
    colors: detectColorDepth(),
    mouse: true,
    hyperlinks: detectHyperlinks(),
    images: detectImageSupport(),
    theme: detectTheme(),
    unicode: detectUnicode(),
  }
}

function detectColorDepth(): ColorDepth {
  if (typeof process.stdout?.getColorDepth === 'function') {
    const d = process.stdout.getColorDepth()
    if (d >= 24) return 'truecolor'
    if (d >= 8) return 256
    if (d >= 4) return 16
    return 'none'
  }
  const ct = process.env.COLORTERM
  if (ct === 'truecolor' || ct === '24bit') return 'truecolor'
  if (process.env.TERM?.includes('256color')) return 256
  if (process.env.CI) return 256
  return 16
}

function detectHyperlinks(): boolean {
  const p = process.env.TERM_PROGRAM
  const v = process.env.TERM_PROGRAM_VERSION
  if (p === 'kitty' || p === 'WezTerm' || p === 'ghostty') return true
  if (p === 'vscode') return true
  if (p === 'iTerm.app' && v) return parseInt(v.split('.')[0]) >= 3
  if (p === 'Windows Terminal' && v) return parseInt(v.split('.')[0]) >= 1
  return false
}

function detectImageSupport(): ImageProtocol[] {
  const p: ImageProtocol[] = []
  if (process.env.KITTY_WINDOW_ID) p.push('kitty')
  if (process.env.ITERM_PROFILE || process.env.TERM_PROGRAM === 'iTerm.app') p.push('iterm2')
  if (process.env.TERM?.includes('sixel')) p.push('sixel')
  if (process.env.TERM_PROGRAM === 'WezTerm' && !p.includes('kitty')) p.push('kitty')
  if (process.env.TERM_PROGRAM === 'ghostty' && !p.includes('kitty')) p.push('kitty')
  return p
}

function detectTheme(): 'dark' | 'light' {
  const fgbg = process.env.COLORFGBG
  if (fgbg) {
    const bg = parseInt(fgbg.split(';').pop() ?? '0')
    return (bg === 0 || bg === 8) ? 'dark' : 'light'
  }
  return 'dark'
}

function detectUnicode(): boolean {
  const lang = process.env.LANG ?? process.env.LC_ALL ?? ''
  return lang.toLowerCase().includes('utf')
    || process.env.TERM_PROGRAM === 'kitty'
    || process.env.TERM_PROGRAM === 'WezTerm'
}
