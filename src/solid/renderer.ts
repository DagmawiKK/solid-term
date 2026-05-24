import { createRenderer } from 'solid-js/universal'
import type { IRNode, IRElementNode, IRTextNode } from '../core/ir.js'
import { createRootNode, isElementNode, defaultBoxModel, defaultComputedStyle } from '../core/ir.js'
import type { StyleTokens } from '../core/ir.js'
import { detectCaps } from '../core/capabilities.js'
import type { ColorDepth } from '../core/capabilities.js'
import { layout } from '../layout/index.js'
import { TerminalCanvas } from '../canvas/index.js'
import { paintNode } from './paint.js'
import { extractWidthClasses, extractFlexClasses, splitResponsive } from '../layout/flex.js'
import { parseInlineStyle } from '../core/styles.js'
import type { ClassResolver } from '../core/class-resolver.js'
import { syncBoxFromComputed, applyTableCellDataAttr } from './style-utils.js'

const BREAKPOINTS: Record<string, number> = {
  sm: 60, md: 80, lg: 100, xl: 120, '2xl': 140,
}

export interface RenderOptions {
  width?: number
  height?: number
  colors?: ColorDepth
  classResolver?: ClassResolver
}

export interface RenderHandle {
  root: IRElementNode
  canvas: TerminalCanvas
  flushFrame(): string | null
  scheduleRender(): void
  resize(w: number, h: number): void
  unmount(): void
}

export function render(Component: () => any, options?: RenderOptions): RenderHandle {
  const caps = detectCaps()
  const width = options?.width ?? caps.width
  const height = options?.height ?? caps.height
  const colors = options?.colors ?? caps.colors

  const canvas = new TerminalCanvas(width, height, colors)
  const root = createRootNode()
  root.layout = { x: 0, y: 0, width, height, clipBox: undefined }

  let isDirty = false
  let currentWidth = width
  let currentHeight = height

  function scheduleRender(): void {
    isDirty = true
  }

  function flushFrame(): string | null {
    if (!isDirty) return null
    isDirty = false

    resolveComputedStyles(root, {
      width: currentWidth,
      theme: caps.theme,
      classResolver: options?.classResolver,
    })

    layout(root, currentWidth, { ...caps, width: currentWidth, height: currentHeight })

    canvas.clear()
    paintNode(root, canvas)

    return canvas.flushFull()
  }

  const { render: solidRender } = createRenderer<IRNode>({

    createElement(tag: string): IRElementNode {
      return {
        kind: 'element',
        tag,
        children: [],
        style: {},
        box: defaultBoxModel(),
        classList: [],
        flexClasses: [],
        widthClasses: [],
        scrollTop: 0,
      }
    },

    createTextNode(value: string): IRTextNode {
      return {
        kind: 'text',
        text: value,
        style: {},
      }
    },

    replaceText(node: IRNode, value: string): void {
      if (node.kind === 'text') {
        node.text = value
        scheduleRender()
      }
    },

    insertNode(parent: IRNode, child: IRNode, ref?: IRNode): void {
      if (parent.kind !== 'element') return

      child.parent = parent as IRElementNode

      if (ref) {
        const idx = parent.children.indexOf(ref)
        if (idx === -1) {
          parent.children.push(child)
        } else {
          parent.children.splice(idx, 0, child)
        }
      } else {
        parent.children.push(child)
      }
      scheduleRender()
    },

    removeNode(parent: IRNode, child: IRNode): void {
      if (parent.kind !== 'element') return
      parent.children = parent.children.filter(c => c !== child)
      child.parent = undefined
      scheduleRender()
    },

    setProperty(node: IRNode, name: string, value: any): void {
      if (node.kind !== 'element') return

      if (name === 'class' || name === 'className') {
        const classes = (value ?? '').split(/\s+/).filter(Boolean) as string[]
        node.classList = classes
        node.flexClasses = extractFlexClasses(classes)
        node.widthClasses = extractWidthClasses(classes)
      }

      if (name === 'style') {
        const inline = parseInlineStyle(value)
        Object.assign(node.style, inline)
      }

      if (name === 'onClick' && typeof value === 'function') {
        node.onClick = value
      }

      if (name === 'onKeyPress' && typeof value === 'function') {
        node.onKeyPress = value
      }

      if (name === 'onInput' && typeof value === 'function') {
        node.onInput = value
      }

      if (name === 'value') {
        node.inputValue = value == null ? '' : String(value)
      }

      if (name === 'data-priority' || name === 'data-align') {
        applyTableCellDataAttr(node, name, String(value ?? ''))
      } else if (name.startsWith('data-')) {
        ;(node as any)[name] = value
      }

      scheduleRender()
    },

    getParentNode(node: IRNode): IRNode | undefined {
      return node.parent
    },

    getFirstChild(node: IRNode): IRNode | undefined {
      if (node.kind !== 'element') return undefined
      return node.children[0]
    },

    getNextSibling(node: IRNode): IRNode | undefined {
      if (!node.parent) return undefined
      const siblings = node.parent.children
      const idx = siblings.indexOf(node)
      return siblings[idx + 1]
    },

    isTextNode(node: IRNode): boolean {
      return node.kind === 'text'
    },
  })

  const dispose = solidRender(() => Component(), root)

  return {
    root,
    canvas,
    flushFrame,
    scheduleRender,
    resize(w: number, h: number) {
      currentWidth = w
      currentHeight = h
      canvas.resize(w, h)
      scheduleRender()
    },
    unmount() {
      dispose?.()
    },
  }
}

interface ResolveStyleEnv {
  width: number
  theme: 'dark' | 'light'
  classResolver?: ClassResolver
}

function resolveComputedStyles(root: IRElementNode, env: ResolveStyleEnv): void {
  const resolver = env.classResolver
  const resolvePaintTokens = resolver
    ? (classes: string[]) => resolver(classes, { width: env.width, theme: env.theme })
    : (_: string[]) => ({} as Record<string, undefined>)

  function walk(node: IRNode, parent: any): void {
    if (node.kind === 'text') {
      const base: any = { ...parent }
      if (node.style.fg) base.fg = node.style.fg
      if (node.style.bg) base.bg = node.style.bg
      if (node.style.bold !== undefined) base.bold = node.style.bold
      if (node.style.italic !== undefined) base.italic = node.style.italic
      if (node.style.underline !== undefined) base.underline = node.style.underline
      if (node.style.strikethrough !== undefined) base.strikethrough = node.style.strikethrough
      node.computed = base
      return
    }

    const fromClasses = resolvePaintTokens(node.classList)

    const next: any = { ...parent }

    applyLayoutClasses(next, node.classList, { width: env.width, theme: env.theme })

    if (fromClasses.fg) next.fg = fromClasses.fg
    if (fromClasses.bg) next.bg = fromClasses.bg
    if (fromClasses.bold !== undefined) next.bold = fromClasses.bold
    if (fromClasses.italic !== undefined) next.italic = fromClasses.italic
    if (fromClasses.underline !== undefined) next.underline = fromClasses.underline
    if (fromClasses.strikethrough !== undefined) next.strikethrough = fromClasses.strikethrough

    if (node.style.fg) next.fg = node.style.fg
    if (node.style.bg) next.bg = node.style.bg
    if (node.style.bold !== undefined) next.bold = node.style.bold
    if (node.style.italic !== undefined) next.italic = node.style.italic
    if (node.style.underline !== undefined) next.underline = node.style.underline
    if (node.style.strikethrough !== undefined) next.strikethrough = node.style.strikethrough

    node.computed = next
    syncBoxFromComputed(node)
    for (const child of node.children) walk(child, next)
  }

  walk(root, root.computed ?? defaultComputedStyle())
}

function applyLayoutClasses(
  computed: any,
  classList: string[],
  env: { width: number; theme: 'dark' | 'light' },
): void {
  for (const cls of classList) {
    const [prefix, base] = splitResponsive(cls)
    const breakpointActive = !prefix || env.width >= (BREAKPOINTS[prefix] ?? 80)
    if (!breakpointActive) continue

    if (base === 'flex' || base === 'flex-row') {
      computed.display = 'flex'
      computed.flexDirection = 'row'
    }
    if (base === 'flex-col') {
      computed.display = 'flex'
      computed.flexDirection = 'col'
    }
    if (base === 'flex-wrap') computed.flexWrap = true

    const gapMatch = base.match(/^gap-(\d+)$/)
    if (gapMatch) computed.gap = parseInt(gapMatch[1])

    if (base === 'w-full') computed.width = { kind: 'full' }
    if (base === 'w-auto') computed.width = { kind: 'auto' }
    if (base === 'flex-1') computed.width = { kind: 'fill' }
    const wFracMatch = base.match(/^w-(\d+)\/(\d+)$/)
    if (wFracMatch) {
      computed.width = {
        kind: 'fraction',
        num: parseInt(wFracMatch[1]),
        den: parseInt(wFracMatch[2]),
      }
    }

    const pMatch = base.match(/^p([xy]|t|r|b|l)?-(\d+)$/)
    if (pMatch) {
      const side = pMatch[1] || ''
      const val = parseInt(pMatch[2])
      if (!side || side === 'y' || side === 't') computed.paddingTop = val
      if (!side || side === 'y' || side === 'b') computed.paddingBottom = val
      if (!side || side === 'x' || side === 'l') computed.paddingLeft = val
      if (!side || side === 'x' || side === 'r') computed.paddingRight = val
    }

    if (base === 'border') {
      computed.borderTop = 1
      computed.borderRight = 1
      computed.borderBottom = 1
      computed.borderLeft = 1
      computed.borderStyle = 'single'
    }
    if (base === 'border-double') {
      computed.borderTop = 1
      computed.borderRight = 1
      computed.borderBottom = 1
      computed.borderLeft = 1
      computed.borderStyle = 'double'
    }
    if (base === 'border-rounded') {
      computed.borderTop = 1
      computed.borderRight = 1
      computed.borderBottom = 1
      computed.borderLeft = 1
      computed.borderStyle = 'round'
    }
    const borderMatch = base.match(/^border-(\d+)$/)
    if (borderMatch) {
      const thickness = parseInt(borderMatch[1])
      computed.borderTop = thickness
      computed.borderRight = thickness
      computed.borderLeft = thickness
      computed.borderBottom = thickness
    }
  }
}
