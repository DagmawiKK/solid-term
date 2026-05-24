import stringWidth from 'string-width'
import type { StyleTokens, Color, LayoutBox } from '../core/ir.js'
import type { ColorDepth } from '../core/capabilities.js'
import { Cell, defaultCell } from './types.js'

export { type Cell, defaultCell } from './types.js'

export class TerminalCanvas {
  private width: number
  private height: number
  private grid: Cell[][]
  private colorDepth: ColorDepth
  private prevGrid: Cell[][]
  private dirtyRows: Set<number>

  constructor(width: number, height: number, colorDepth: ColorDepth = 'truecolor') {
    this.width = width
    this.height = height
    this.colorDepth = colorDepth
    this.grid = this.allocateGrid()
    this.prevGrid = this.allocateGrid()
    this.dirtyRows = new Set()
  }

  private allocateGrid(): Cell[][] {
    return Array.from({ length: this.height }, () =>
      Array.from({ length: this.width }, () => defaultCell())
    )
  }

  clear(): void {
    for (let row = 0; row < this.height; row++) {
      for (let col = 0; col < this.width; col++) {
        const cell = this.grid[row][col]
        cell.char = ' '
        cell.wideCont = false
        cell.fg = ''
        cell.bg = ''
        cell.bold = false
        cell.italic = false
        cell.underline = false
        cell.strikethrough = false
        cell.styled = false
      }
    }
  }

  setCell(col: number, row: number, char: string, style: StyleTokens, clipBox?: LayoutBox): void {
    if (clipBox) {
      if (col < clipBox.x || col >= clipBox.x + clipBox.width) return
      if (row < clipBox.y || row >= clipBox.y + clipBox.height) return
    }
    if (col < 0 || col >= this.width || row < 0 || row >= this.height) return

    const cell = this.grid[row][col]
    cell.char = char || ' '
    cell.wideCont = false
    cell.fg = style.fg ? this.encodeColor(style.fg, 'fg') : ''
    cell.bg = style.bg ? this.encodeColor(style.bg, 'bg') : ''
    cell.bold = style.bold ?? false
    cell.italic = style.italic ?? false
    cell.underline = style.underline ?? false
    cell.strikethrough = style.strikethrough ?? false
    cell.styled = !!(style.fg || style.bg || style.bold || style.italic || style.underline || style.strikethrough)

    this.dirtyRows.add(row)
  }

  drawText(col: number, row: number, text: string, style: StyleTokens, clipBox?: LayoutBox): void {
    let cursor = col

    const seg = typeof Intl !== 'undefined' && (Intl as any).Segmenter
      ? new (Intl as any).Segmenter(undefined, { granularity: 'grapheme' })
      : null
    const graphemes: string[] = seg
      ? Array.from(seg.segment(text), (s: any) => s.segment)
      : Array.from(text)

    for (const g of graphemes) {
      if (cursor >= this.width) break

      const w = stringWidth(g)
      if (w <= 0) continue

      this.setCell(cursor, row, g, style, clipBox)

      if (w === 2 && cursor + 1 < this.width) {
        const cont = this.grid[row][cursor + 1]
        cont.char = ' '
        cont.wideCont = true
        cont.fg = style.fg ? this.encodeColor(style.fg, 'fg') : ''
        cont.bg = style.bg ? this.encodeColor(style.bg, 'bg') : ''
        cont.bold = style.bold ?? false
        cont.italic = style.italic ?? false
        cont.underline = style.underline ?? false
        cont.strikethrough = style.strikethrough ?? false
        cont.styled = !!(style.fg || style.bg || style.bold || style.italic || style.underline || style.strikethrough)
      }

      cursor += w
    }
  }

  fillRect(x: number, y: number, w: number, h: number, style: StyleTokens, clipBox?: LayoutBox): void {
    for (let row = y; row < y + h; row++) {
      for (let col = x; col < x + w; col++) {
        this.setCell(col, row, ' ', style, clipBox)
      }
    }
  }

  flushFull(): string {
    let output = '\x1B[H'
    let prevStyled = false
    let prevFg = ''
    let prevBg = ''
    let prevBold = false
    let prevItalic = false
    let prevUnderline = false
    let prevStrikethrough = false

    for (let row = 0; row < this.height; row++) {
      for (let col = 0; col < this.width; col++) {
        const cell = this.grid[row][col]

        const styleChanged =
          cell.styled !== prevStyled ||
          cell.fg !== prevFg ||
          cell.bg !== prevBg ||
          cell.bold !== prevBold ||
          cell.italic !== prevItalic ||
          cell.underline !== prevUnderline ||
          cell.strikethrough !== prevStrikethrough

        if (styleChanged) {
          if (!cell.styled && prevStyled) {
            output += '\x1B[0m'
          } else if (cell.styled) {
            output += this.buildStyleCode(cell)
          }

          prevStyled = cell.styled
          prevFg = cell.fg
          prevBg = cell.bg
          prevBold = cell.bold
          prevItalic = cell.italic
          prevUnderline = cell.underline
          prevStrikethrough = cell.strikethrough
        }

        if (!cell.wideCont) output += cell.char || ' '
      }

      if (row < this.height - 1) output += '\n'
    }

    output += '\x1B[0m'

    return output
  }

  flushFullDelta(): string {
    if (this.dirtyRows.size === 0) return ''

    let output = '\x1B[H'
    let prevStyled = false
    let prevFg = ''
    let prevBg = ''
    let prevBold = false
    let prevItalic = false
    let prevUnderline = false
    let prevStrikethrough = false

    const dirtyRowsArray = Array.from(this.dirtyRows).sort((a, b) => a - b)

    for (const row of dirtyRowsArray) {
      output += `\x1B[${row + 1};1H`

      for (let col = 0; col < this.width; col++) {
        const cell = this.grid[row][col]
        const prevCell = this.prevGrid[row]?.[col]

        const cellChanged = !prevCell
          || cell.char !== prevCell.char
          || cell.fg !== prevCell.fg
          || cell.bg !== prevCell.bg
          || cell.bold !== prevCell.bold
          || cell.italic !== prevCell.italic
          || cell.underline !== prevCell.underline
          || cell.strikethrough !== prevCell.strikethrough

        if (cellChanged) {
          const styleChanged =
            cell.styled !== prevStyled ||
            cell.fg !== prevFg ||
            cell.bg !== prevBg ||
            cell.bold !== prevBold ||
            cell.italic !== prevItalic ||
            cell.underline !== prevUnderline ||
            cell.strikethrough !== prevStrikethrough

          if (styleChanged) {
            if (!cell.styled && prevStyled) output += '\x1B[0m'
            else if (cell.styled) output += this.buildStyleCode(cell)

            prevStyled = cell.styled
            prevFg = cell.fg
            prevBg = cell.bg
            prevBold = cell.bold
            prevItalic = cell.italic
            prevUnderline = cell.underline
            prevStrikethrough = cell.strikethrough
          }

          if (!cell.wideCont) output += cell.char || ' '
        }
      }
    }

    for (const row of dirtyRowsArray) {
      for (let col = 0; col < this.width; col++) {
        const src = this.grid[row][col]
        const dst = this.prevGrid[row][col]
        dst.char = src.char
        dst.wideCont = src.wideCont
        dst.fg = src.fg
        dst.bg = src.bg
        dst.bold = src.bold
        dst.italic = src.italic
        dst.underline = src.underline
        dst.strikethrough = src.strikethrough
        dst.styled = src.styled
      }
    }
    this.dirtyRows.clear()

    output += '\x1B[0m'
    return output
  }

  flushRegion(originRow: number, originCol: number, regionWidth: number, regionHeight: number): string {
    let output = '\x1B7'

    let prevStyled = false
    let prevFg = ''
    let prevBg = ''
    let prevBold = false
    let prevItalic = false
    let prevUnderline = false
    let prevStrikethrough = false

    for (let row = 0; row < regionHeight; row++) {
      output += `\x1B[${originRow + row};${originCol}H`

      for (let col = 0; col < regionWidth; col++) {
        const cell = this.grid[row]?.[col]
        if (!cell) {
          if (prevStyled) { output += '\x1B[0m'; prevStyled = false }
          output += ' '
          continue
        }

        const styleChanged =
          cell.styled !== prevStyled ||
          cell.fg !== prevFg ||
          cell.bg !== prevBg ||
          cell.bold !== prevBold ||
          cell.italic !== prevItalic ||
          cell.underline !== prevUnderline ||
          cell.strikethrough !== prevStrikethrough

        if (styleChanged) {
          if (!cell.styled && prevStyled) output += '\x1B[0m'
          else if (cell.styled) output += this.buildStyleCode(cell)

          prevStyled = cell.styled
          prevFg = cell.fg
          prevBg = cell.bg
          prevBold = cell.bold
          prevItalic = cell.italic
          prevUnderline = cell.underline
          prevStrikethrough = cell.strikethrough
        }

        if (!cell.wideCont) output += cell.char || ' '
      }
    }

    output += '\x1B[0m\x1B8'
    return output
  }

  flushRegionDelta(originRow: number, originCol: number, regionWidth: number, regionHeight: number): string {
    if (this.dirtyRows.size === 0) return ''

    let output = '\x1B7'
    let prevStyled = false
    let prevFg = ''
    let prevBg = ''
    let prevBold = false
    let prevItalic = false
    let prevUnderline = false
    let prevStrikethrough = false

    const dirtyInRegion = Array.from(this.dirtyRows)
      .filter(row => row < regionHeight)
      .sort((a, b) => a - b)

    for (const row of dirtyInRegion) {
      output += `\x1B[${originRow + row};${originCol}H`

      for (let col = 0; col < regionWidth; col++) {
        const cell = this.grid[row]?.[col]
        if (!cell) {
          if (prevStyled) { output += '\x1B[0m'; prevStyled = false }
          output += ' '
          continue
        }

        const styleChanged =
          cell.styled !== prevStyled ||
          cell.fg !== prevFg ||
          cell.bg !== prevBg ||
          cell.bold !== prevBold ||
          cell.italic !== prevItalic ||
          cell.underline !== prevUnderline ||
          cell.strikethrough !== prevStrikethrough

        if (styleChanged) {
          if (!cell.styled && prevStyled) output += '\x1B[0m'
          else if (cell.styled) output += this.buildStyleCode(cell)

          prevStyled = cell.styled
          prevFg = cell.fg
          prevBg = cell.bg
          prevBold = cell.bold
          prevItalic = cell.italic
          prevUnderline = cell.underline
          prevStrikethrough = cell.strikethrough
        }

        if (!cell.wideCont) output += cell.char || ' '
      }
    }

    for (const row of dirtyInRegion) {
      for (let col = 0; col < regionWidth; col++) {
        const src = this.grid[row][col]
        const dst = this.prevGrid[row][col]
        dst.char = src.char
        dst.wideCont = src.wideCont
        dst.fg = src.fg
        dst.bg = src.bg
        dst.bold = src.bold
        dst.italic = src.italic
        dst.underline = src.underline
        dst.strikethrough = src.strikethrough
        dst.styled = src.styled
      }
    }
    this.dirtyRows.clear()

    output += '\x1B[0m\x1B8'
    return output
  }

  private buildStyleCode(cell: Cell): string {
    const parts: string[] = ['0']
    if (cell.bold) parts.push('1')
    if (cell.italic) parts.push('3')
    if (cell.underline) parts.push('4')
    if (cell.strikethrough) parts.push('9')
    if (cell.fg) parts.push(cell.fg)
    if (cell.bg) parts.push(cell.bg)
    return '\x1B[' + parts.join(';') + 'm'
  }

  encodeColor(color: Color, channel: 'fg' | 'bg'): string {
    const isFg = channel === 'fg'

    if ('hex' in color) {
      const r = parseInt(color.hex.slice(1, 3), 16)
      const g = parseInt(color.hex.slice(3, 5), 16)
      const b = parseInt(color.hex.slice(5, 7), 16)

      if (this.colorDepth === 'truecolor') {
        return isFg ? `38;2;${r};${g};${b}` : `48;2;${r};${g};${b}`
      }
      if (this.colorDepth === 256) {
        const idx = hexTo256(r, g, b)
        return isFg ? `38;5;${idx}` : `48;5;${idx}`
      }
      return this.encodeColor({ named: hexToNamed(r, g, b) }, channel)
    }

    if ('rgb' in color) {
      const [r, g, b] = color.rgb
      if (this.colorDepth === 'truecolor') {
        return isFg ? `38;2;${r};${g};${b}` : `48;2;${r};${g};${b}`
      }
      if (this.colorDepth === 256) {
        return isFg ? `38;5;${hexTo256(r, g, b)}` : `48;5;${hexTo256(r, g, b)}`
      }
      return this.encodeColor({ named: hexToNamed(r, g, b) }, channel)
    }

    if ('named' in color) {
      const NAMED_FG: Record<string, number> = {
        black: 30, red: 31, green: 32, yellow: 33, blue: 34,
        magenta: 35, cyan: 36, white: 37, gray: 90, grey: 90,
        orange: 33,
        purple: 35,
        pink: 95,
        teal: 36,
        lime: 92,
        amber: 33,
        indigo: 34,
        violet: 35,
        rose: 91,
        sky: 96,
        emerald: 92,
        slate: 90,
        zinc: 90,
        neutral: 37,
        stone: 33,
      }
      const code = NAMED_FG[color.named] ?? 37
      return isFg ? String(code) : String(code + 10)
    }

    return ''
  }

  resize(width: number, height: number): void {
    this.width = width
    this.height = height
    this.grid = this.allocateGrid()
  }
}

function hexTo256(r: number, g: number, b: number): number {
  if (r === g && g === b) {
    if (r < 8) return 16
    if (r > 248) return 231
    return Math.round((r - 8) / 247 * 24) + 232
  }
  const ri = Math.round(r / 255 * 5)
  const gi = Math.round(g / 255 * 5)
  const bi = Math.round(b / 255 * 5)
  return 16 + 36 * ri + 6 * gi + bi
}

function hexToNamed(r: number, g: number, b: number): any {
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  if (max < 64) return 'black'
  if (min > 192) return 'white'
  if (r > g && r > b) return r > 192 ? 'red' : 'red'
  if (g > r && g > b) return g > 192 ? 'green' : 'green'
  if (b > r && b > g) return b > 192 ? 'blue' : 'blue'
  if (r > 128 && g > 128) return 'yellow'
  if (r > 128 && b > 128) return 'magenta'
  if (g > 128 && b > 128) return 'cyan'
  return 'white'
}
