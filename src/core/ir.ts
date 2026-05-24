export type NamedColor =
  | 'red' | 'blue' | 'green' | 'yellow' | 'cyan' | 'magenta'
  | 'white' | 'black' | 'gray' | 'orange' | 'purple' | 'pink'
  | 'teal' | 'lime' | 'amber' | 'indigo' | 'violet' | 'rose'
  | 'sky' | 'emerald' | 'slate' | 'zinc' | 'neutral' | 'stone'

export type Color =
  | { named: NamedColor }
  | { hex: string }
  | { rgb: [number, number, number] }

export interface StyleTokens {
  fg?: Color
  bg?: Color
  bold?: boolean
  italic?: boolean
  underline?: boolean
  strikethrough?: boolean
}

export interface ComputedStyle {
  fg?: Color
  bg?: Color
  bold: boolean
  italic: boolean
  underline: boolean
  strikethrough: boolean

  paddingTop: number
  paddingRight: number
  paddingBottom: number
  paddingLeft: number
  borderTop: number
  borderRight: number
  borderBottom: number
  borderLeft: number
  borderStyle: 'single' | 'double' | 'round' | 'none'
  borderColor?: Color

  display: 'block' | 'flex'
  flexDirection: 'row' | 'col'
  flexWrap: boolean
  gap: number

  width:
    | { kind: 'auto' }
    | { kind: 'full' }
    | { kind: 'fraction'; num: number; den: number }
    | { kind: 'fill' }
}

export function defaultComputedStyle(): ComputedStyle {
  return {
    bold: false,
    italic: false,
    underline: false,
    strikethrough: false,
    paddingTop: 0,
    paddingRight: 0,
    paddingBottom: 0,
    paddingLeft: 0,
    borderTop: 0,
    borderRight: 0,
    borderBottom: 0,
    borderLeft: 0,
    borderStyle: 'single',
    display: 'block',
    flexDirection: 'col',
    flexWrap: false,
    gap: 0,
    width: { kind: 'auto' },
  }
}

export interface BoxModel {
  paddingTop: number
  paddingRight: number
  paddingBottom: number
  paddingLeft: number
  borderTop: number
  borderRight: number
  borderBottom: number
  borderLeft: number
  borderStyle: 'single' | 'double' | 'round' | 'none'
  borderColor?: Color
}

export function defaultBoxModel(): BoxModel {
  return {
    paddingTop: 0, paddingRight: 0, paddingBottom: 0, paddingLeft: 0,
    borderTop: 0, borderRight: 0, borderBottom: 0, borderLeft: 0,
    borderStyle: 'single',
  }
}

export interface LayoutBox {
  x: number
  y: number
  width: number
  height: number
  clipBox?: LayoutBox
}

export interface TableCellMeta {
  priority: 1 | 2 | 3
  align: 'left' | 'center' | 'right'
  colSpan: number
}

export interface IRTextNode {
  kind: 'text'
  text: string
  style: StyleTokens
  computed?: ComputedStyle
  layout?: LayoutBox
  parent?: IRElementNode
  wrappedLines?: string[]
  isDirty?: boolean
}

export interface IRElementNode {
  kind: 'element'
  tag: string
  children: IRNode[]
  style: StyleTokens
  box: BoxModel
  computed?: ComputedStyle
  layout?: LayoutBox

  classList: string[]
  flexClasses: string[]
  widthClasses: string[]

  tableCell?: TableCellMeta

  scrollTop: number

  onClick?: () => void
  onKeyPress?: (key: string) => void
  onInput?: (value: string) => void
  inputValue?: string

  focused?: boolean
  parent?: IRElementNode

  renderedLines?: string[]
  isDirty?: boolean
}

export type IRNode = IRTextNode | IRElementNode

export function createRootNode(): IRElementNode {
  return {
    kind: 'element',
    tag: 'root',
    children: [],
    style: {},
    box: defaultBoxModel(),
    computed: defaultComputedStyle(),
    classList: [],
    flexClasses: [],
    widthClasses: [],
    scrollTop: 0,
  }
}

export function isTextNode(node: IRNode): node is IRTextNode {
  return node.kind === 'text'
}

export function isElementNode(node: IRNode): node is IRElementNode {
  return node.kind === 'element'
}
