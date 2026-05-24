import type { ColorDepth } from '../core/capabilities.js'

export interface Cell {
  char: string
  wideCont: boolean
  fg: string
  bg: string
  bold: boolean
  italic: boolean
  underline: boolean
  strikethrough: boolean
  styled: boolean
}

export function defaultCell(): Cell {
  return { char: ' ', wideCont: false, fg: '', bg: '', bold: false, italic: false, underline: false, strikethrough: false, styled: false }
}

export interface ClipBox {
  x: number; y: number; width: number; height: number
}
